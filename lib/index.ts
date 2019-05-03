import Bluebird from "bluebird";
import Axios, { AxiosResponse } from "axios";
import FeedParser, { Item, Meta, Image } from "feedparser";
import { version } from "../package.json";
import { TinyEmitter } from "tiny-emitter";

export interface Options {
    userAgent?: string;
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
    enclosures: string[];
    meta: Meta;
    [x: string]: any;
};

export interface FeedConfig {
    url: string;
    ignoreFirst?: boolean;
    maxHistoryLength?: number;
    setInterval?: NodeJS.Timeout;
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
    public type: string;
    public message: string;
    public feed: string;

    public constructor(type: string, message: string, feed?: string) {
        super();

        this.type = type;
        this.message = message;
        this.feed = feed ? feed : "";
    }
}

export class FeedEmitter extends TinyEmitter {
    /** @hidden */ private _feedList: FeedConfig[];
    /** @hidden */ private _userAgent: string;
    /** @hidden */ private _historyLengthMultiplier: number;
    /** @hidden */ private _isFirst: boolean;

    /**
     * Initialize the rss feed emitter
     * @param {Options} options
     */
    public constructor(options: Options = {}) {
        super();

        this._feedList = [];
        this._userAgent = options.userAgent || `RssEmitter/v${version} (https://github.com/kurozeropb/RssEmitter)`;
        this._historyLengthMultiplier = 3;
        this._isFirst = true;
    }

    /**
     * Add a new feed to the feed list
     * @param {FeedConfig} feedConfig
     * @returns {Array<FeedConfig>}
     */
    public add(feedConfig: FeedConfig): FeedConfig[] {
        this._addOrUpdateFeedList(feedConfig);
        return this._feedList;
    }

    /**
     * Remove a feed from the feed list
     * @param {string} url
     */
    public remove(url: string): void {
        let feed = this._findFeed({ url });
        return this._removeFromFeedList(feed);
    }

    /**
     * List all feeds
     * @returns {Array<FeedConfig>}
     */
    public list(): FeedConfig[] {
        return this._feedList;
    }

    /** Remove all feeds */
    public destroy(): void {
        for (let i = this._feedList.length - 1; i >= 0; i--) {
            let feed = this._feedList[i];
            this._removeFromFeedList(feed);
        }
    }

    /** @hidden */
    private _addOrUpdateFeedList(feed: FeedConfig): void {
        let feedInList = this._findFeed(feed);

        if (feedInList) {
            this._removeFromFeedList(feedInList);
        }

        return this._addToFeedList(feed);
    }

    /** @hidden */
    private _findFeed(feed: FeedConfig): FeedConfig | undefined {
        return this._feedList.find((x) => x.url === feed.url);
    }

    /** @hidden */
    private _removeFromFeedList(feed: FeedConfig | undefined): void {
        if (!feed || !feed.setInterval) return;

        clearInterval(feed.setInterval);

        for (let i = 0; i < this._feedList.length; i++) {
            if (this._feedList[i].url === feed.url) {
                this._feedList.splice(i, 1);
                i--;
            }
        }
    }

    /** @hidden */
    private _findItem(feed: FeedConfig, item: FeedItem): FeedItem | undefined {
        if (!feed.items) return void 0;

        if (item.guid) {
            return feed.items.find((x) => x.link === item.link && x.title === item.title && x.guid === item.guid);
        }

        return feed.items.find((x) => x.link === item.link && x.title === item.title);
    }

    /** @hidden */
    private _addToFeedList(feed: FeedConfig): void {
        feed.items = [];
        feed.refresh = feed.refresh ? feed.refresh : 60000;
        feed.setInterval = this._createSetInterval(feed);
        this._feedList.push(feed);
    }

    /** @hidden */
    private _createSetInterval(feed: FeedConfig): NodeJS.Timeout {
        const self = this;

        function getContent(): void {
            function findFeed(data: FeedData): void {
                let foundFeed = self._findFeed({ url: data.feedUrl });

                if (!foundFeed) {
                    throw new FeedError("feed_not_found", "Feed not found.");
                }

                data.feed = foundFeed;
            }

            function redefineItemHistoryMaxLength(data: FeedData): void {
                let feedLength = data.items.length;
                data.feed!.maxHistoryLength = feedLength * self._historyLengthMultiplier;
            }

            function sortItemsByDate(data: FeedData): void {
                // @ts-ignore
                data.items = data.items.sort((a, b) => b.date - a.date);
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
                self._isFirst = false;
            }

            self._fetchFeed(feed.url)
                .tap(findFeed)
                .tap(redefineItemHistoryMaxLength)
                .tap(sortItemsByDate)
                .tap(identifyOnlyNewItems)
                .tap(populateNewItemsInFeed)
                .catch((error: FeedError) => {
                    if (error.type === "feed_not_found") {
                        return;
                    }

                    self.emit("feed:error", error);
                });
        }

        getContent();

        return setInterval(getContent, feed.refresh!);
    }

    /** @hidden */
    private _addItemToItemList(feed: FeedConfig, item: FeedItem): void {
        if (this._isFirst && feed.ignoreFirst) {
            feed.items!.push(item);

            const maxHistory = feed.maxHistoryLength || 10;
            const len = feed.items!.length;
            feed.items = feed.items!.slice(len - maxHistory, len);
        } else {
            feed.items!.push(item);
            const maxHistory = feed.maxHistoryLength || 10;
            const len = feed.items!.length;
            feed.items = feed.items!.slice(len - maxHistory, len);
            this.emit("item:new", item);
        }
    }

    /** @hidden */
    private _fetchFeed(feedUrl: string): Bluebird<FeedData> {
        return new Bluebird((reslove, reject) => {
            const feedparser = new FeedParser({});

            let data: FeedData = {
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
                let item = feedparser.read();
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
