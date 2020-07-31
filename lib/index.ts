import Bluebird from "bluebird";
import Axios, { AxiosResponse } from "axios";
import FeedParser, { Item, Meta, Image, Enclosure } from "feedparser";
import Interval from "yukikaze";
import { version } from "../package.json";
import { TinyEmitter } from "tiny-emitter";

export interface Options {
    userAgent?: string;
    debug?: boolean;
}

export interface FeedItem extends Item {
    title: string;
    description: string;
    summary: string;
    date: Date | null;
    pubdate: Date | null;
    link: string;
    origlink: string;
    author: string;
    guid: string;
    comments: string;
    image: Image;
    categories: string[];
    enclosures: Enclosure[];
    meta: Meta;
    [x: string]: any;
}

export interface FeedConfig {
    url: string;
    eventName?: string;
    ignoreFirst?: boolean;
    maxHistoryLength?: number;
    interval?: Interval;
    refresh?: number;
    items?: FeedItem[];
}

export interface FeedData {
    feedUrl: string;
    feed?: FeedConfig;
    items: FeedItem[];
    newItems: FeedItem[];
}

export class FeedError extends Error {
    type: string;
    message: string;
    feed: string;

    constructor(type: string, message: string, feed?: string) {
        super();

        this.type = type;
        this.message = message;
        this.feed = feed ? feed : "";
    }
}

export class FeedEmitter extends TinyEmitter {
    private _feedList: FeedConfig[];
    private _userAgent: string;
    private _debug: boolean;
    private _historyLengthMultiplier: number;

    /**
     * Initialize the rss feed emitter
     * @param {Options} options
     */
    constructor(options: Options = {}) {
        super();

        this._feedList = [];
        this._userAgent = options.userAgent || `RssEmitter/v${version} (https://github.com/kurozeropb/RssEmitter)`;
        this._debug = options.debug || false;
        this._historyLengthMultiplier = 3;
    }

    /**
     * Add a new feed to the feed list
     * @param {FeedConfig} feedConfig
     * @returns {Array<FeedConfig>}
     */
    add(feedConfig: FeedConfig): FeedConfig[] {
        this._addOrUpdateFeedList(feedConfig);
        return this._feedList;
    }

    /**
     * Get specific feed from the feedlist
     * @param {string} url
     * @returns {FeedConfig|undefined}
     */
    get(url: string): FeedConfig | undefined {
        return this._findFeed({ url });
    }

    /**
     * Remove a feed from the feed list
     * @param {string} url
     */
    remove(url: string): void {
        const feed = this._findFeed({ url });
        return this._removeFromFeedList(feed);
    }

    /**
     * List all feeds
     * @returns {Array<FeedConfig>}
     */
    list(): FeedConfig[] {
        return this._feedList;
    }

    /** Remove all feeds */
    destroy(): void {
        for (let i = this._feedList.length - 1; i >= 0; i--) {
            const feed = this._feedList[i];
            this._removeFromFeedList(feed);
        }
    }

    private _addOrUpdateFeedList(feed: FeedConfig): void {
        const feedInList = this._findFeed(feed);
        let update = false;

        if (feedInList) {
            this._removeFromFeedList(feedInList);
            update = true;
        }

        this._addToFeedList(feed);
        update ? this.emit("feed:update", feed) : this.emit("feed:new", feed); // eslint-disable-line no-unused-expressions
    }

    private _findFeed(feed: FeedConfig): FeedConfig | undefined {
        return this._feedList.find((x) => x.url === feed.url);
    }

    private _removeFromFeedList(feed: FeedConfig | undefined): void {
        if (!feed || !feed.interval) return;

        feed.interval.stop();

        for (let i = 0; i < this._feedList.length; i++) {
            if (this._feedList[i].url === feed.url) {
                this._feedList.splice(i, 1);
                i--;
            }
        }
    }

    private _findItem(feed: FeedConfig, item: FeedItem): FeedItem | undefined {
        if (!feed.items) return void 0;

        if (item.guid) {
            return feed.items.find((x) => x.link === item.link && x.title === item.title && x.guid === item.guid);
        }

        return feed.items.find((x) => x.link === item.link && x.title === item.title);
    }

    private _addToFeedList(feed: FeedConfig): void {
        feed.items = [];
        feed.refresh = feed.refresh ? feed.refresh : 60000;
        feed.interval = this._createSetInterval(feed);
        this._feedList.push(feed);
        this.emit("feed:init", feed);
    }

    private _createSetInterval(feed: FeedConfig): Interval {
        const interval = new Interval();
        const self = this;

        function getContent(): void {
            function findFeed(data: FeedData): void {
                const foundFeed = self._findFeed({ url: data.feedUrl });

                if (!foundFeed) {
                    throw new FeedError("feed_not_found", "Feed not found.");
                }

                data.feed = foundFeed;
            }

            function redefineItemHistoryMaxLength(data: FeedData): void {
                const feedLength = data.items.length;
                data.feed!.maxHistoryLength = feedLength * self._historyLengthMultiplier;
            }

            function sortItemsByDate(data: FeedData): void {
                data.items = data.items.sort((a: any, b: any) => b.date - a.date);
            }

            function identifyOnlyNewItems(data: FeedData): void {
                data.newItems = data.items.filter((fetchedItem) => {
                    const foundItemInsideFeed = self._findItem(data.feed!, fetchedItem);
                    if (foundItemInsideFeed) {
                        return false;
                    }
                    return fetchedItem;
                });
            }

            function populateNewItemsInFeed(data: FeedData): void {
                data.newItems.forEach((item) => self._addItemToItemList(data.feed!, item));
            }

            self._fetchFeed(feed.url)
                .tap(findFeed)
                .tap(redefineItemHistoryMaxLength)
                .tap(sortItemsByDate)
                .tap(identifyOnlyNewItems)
                .tap(populateNewItemsInFeed)
                .then((data) => data.feed!.ignoreFirst = false)
                .catch((error: FeedError) => {
                    if (error.type === "feed_not_found") {
                        return;
                    }

                    self.emit("feed:error", error);
                });
        }

        getContent();

        interval.run(getContent, feed.refresh!);
        return interval;
    }

    private _addItemToItemList(feed: FeedConfig, item: FeedItem): void {
        if (feed.ignoreFirst) {
            if (this._debug) console.debug("Silently adding item to history");
            feed.items!.push(item);
            const maxHistory = feed.maxHistoryLength || 10;
            const len = feed.items!.length;
            feed.items = feed.items!.slice(len - maxHistory, len);
            if (this._debug) console.debug(`feed.ignoreFirst = ${feed.ignoreFirst}`);
        } else {
            if (this._debug) console.debug("Adding new item to history");
            feed.items!.push(item);
            const maxHistory = feed.maxHistoryLength || 10;
            const len = feed.items!.length;
            feed.items = feed.items!.slice(len - maxHistory, len);
            const newItemEventName = feed.eventName ? (`item:new:${feed.eventName}`) : "item:new";
            this.emit(newItemEventName, item);
            if (this._debug) console.debug(`item = ${JSON.stringify(item)}`);
        }
    }

    private _fetchFeed(feedUrl: string): Bluebird<FeedData> {
        return new Bluebird((reslove, reject) => {
            const feedparser = new FeedParser({});

            const data: FeedData = {
                feedUrl,
                items: [],
                newItems: []
            };

            Axios.get(feedUrl, {
                responseType: "stream",
                headers: {
                    "user-agent": this._userAgent,
                    "accept": "text/html,application/xhtml+xml,application/xml,text/xml"
                }
            }).then((response: AxiosResponse) => {
                if (response.status !== 200) {
                    reject(new FeedError("fetch_url_error", `This URL returned a ${response.status} status code`, feedUrl));
                }

                const stream = response.data.pipe(feedparser);
                stream.once("finish", () => reslove(data));
            }).catch(() => {
                reject(new FeedError("fetch_url_error", `Cannot connect to ${feedUrl}`, feedUrl));
            });

            feedparser.on("readable", () => {
                const item = feedparser.read();
                if (!item) return;
                item.meta.link = feedUrl;
                data.items.push(item);
            });

            feedparser.on("error", () => {
                reject(new FeedError("invalid_feed", `Cannot parse ${feedUrl} XML`, feedUrl));
            });
        });
    }
}

export default FeedEmitter;
