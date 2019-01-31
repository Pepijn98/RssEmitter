import TinyEmitter from "tiny-emitter";
import _ from "lodash";
import Axios, { AxiosResponse } from "axios";
import FeedParser, { Item, Meta, Image } from "feedparser";
import Bluebird from "bluebird";

interface Options {
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
    categories: Array<string>;
    enclosures: Array<string>;
    meta: Meta;
};

export interface FeedConfig {
    url: string;
    ignoreFirst?: boolean;
    maxHistoryLength?: number;
    setInterval?: NodeJS.Timeout;
    refresh?: number;
    items?: Array<FeedItem>;
}

export interface FeedData {
    feedUrl: string;
    feed: FeedConfig;
    items: Array<FeedItem>;
    newItems: Array<FeedItem>;
}

export class FeedError extends Error {
    type: string;
    message: string;
    feed: string;

    constructor(type: string, message: string, feed: string) {
        super();

        this.type = type;
        this.message = message;
        this.feed = feed;
    }
}

export class FeedEmitter extends TinyEmitter {
    _feedList: Array<FeedConfig>;
    _userAgent: string;
    _historyLengthMultiplier: number;
    _isFirst: boolean;
    options: Options;

    constructor(options: Options = {}) {
        super();

        this._feedList = [];
        this._userAgent = options.userAgent || "RssEmitter/v0.0.1 (https://github.com/kurozeropb/RssEmitter)";
        this._historyLengthMultiplier = 3;
        this._isFirst = true;
        this.options = options;
    }

    add(feedConfig: FeedConfig): Array<FeedConfig> {
        this._addOrUpdateFeedList(feedConfig);
        return this._feedList;
    }

    remove(url: string) {
        let feed = this._findFeed({ url, items: [] });
        return this._removeFromFeedList(feed);
    }

    list(): Array<FeedConfig> {
        return this._feedList;
    }

    destroy() {
        for (let i = this._feedList.length - 1; i >= 0; i--) {
            let feed = this._feedList[i];
            this._removeFromFeedList(feed);
        }
    }

    _addOrUpdateFeedList(feed: FeedConfig) {
        let feedInList = this._findFeed(feed);

        if (feedInList) {
            this._removeFromFeedList(feedInList);
        }

        return this._addToFeedList(feed);
    }

    _findFeed(feed: FeedConfig): FeedConfig | undefined {
        return _.find(this._feedList, {
            url: feed.url
        });
    }

    _removeFromFeedList(feed: FeedConfig | undefined) {
        if (!feed || !feed.setInterval) return;

        clearInterval(feed.setInterval);
        _.remove(this._feedList, { url: feed.url });
    }

    _findItem(feed: FeedConfig, item: FeedItem): FeedItem | undefined {
        let object = {} as any;
        object.link = item.link;
        object.title = item.title;

        if (item.guid) {
            object.link = item.link;
            object.title = item.title;
            object.guid = item.guid;
        }

        return _.find(feed.items, object);
    }

    _addToFeedList(feed: FeedConfig) {
        feed.items = [];
        feed.refresh = feed.refresh ? feed.refresh : 60000;
        feed.setInterval = this._createSetInterval(feed);
        this._feedList.push(feed);
    }

    _createSetInterval(feed: FeedConfig): NodeJS.Timeout {
        let self = this;

        function getContent() {
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


            function findFeed(data: FeedData) {
                let foundFeed = self._findFeed({ url: data.feedUrl, items: [] });

                if (!foundFeed) {
                    throw {
                        type: "feed_not_found",
                        message: "Feed not found."
                    };
                }

                data.feed = foundFeed;
            }

            function redefineItemHistoryMaxLength(data: FeedData) {
                let feedLength = data.items.length;
                data.feed.maxHistoryLength = feedLength * self._historyLengthMultiplier;
            }


            function sortItemsByDate(data: FeedData) {
                data.items = _.sortBy(data.items, "date");
            }


            function identifyOnlyNewItems(data: FeedData) {
                data.newItems = data.items.filter((fetchedItem) => {

                    let foundItemInsideFeed: FeedItem | undefined;
                    foundItemInsideFeed = self._findItem(data.feed, fetchedItem);

                    if (foundItemInsideFeed) {
                        return false;
                    }

                    return fetchedItem;
                });
            }

            function populateNewItemsInFeed(data: FeedData) {
                data.newItems.forEach((item) => {
                    self._addItemToItemList(data.feed, item);
                });

                self._isFirst = false;
            }
        }

        getContent();

        return setInterval(getContent, feed.refresh || 60000);
    }

    _addItemToItemList(feed: FeedConfig, item: FeedItem) {
        if (this._isFirst && feed.ignoreFirst) {
            feed.items!.push(item)
            feed.items = _.takeRight(feed.items, feed.maxHistoryLength);
        } else {
            feed.items!.push(item)
            feed.items = _.takeRight(feed.items, feed.maxHistoryLength);
            this.emit("item:new", item);
        }
    }

    _fetchFeed(feedUrl: string): Bluebird<FeedData> {
        return new Bluebird((reslove, reject) => {
            const feedparser = new FeedParser({});

            let data: FeedData = {} as any;
            data.feedUrl = feedUrl;
            data.items = [];

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
                stream.once("finish", () => {
                    console.log(data.items.length);
                    reslove(data);
                });
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

const RssFeedEmitter = FeedEmitter;

export default RssFeedEmitter;
