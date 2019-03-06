"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tiny_emitter_1 = require("tiny-emitter");
const lodash_1 = __importDefault(require("lodash"));
const axios_1 = __importDefault(require("axios"));
const feedparser_1 = __importDefault(require("feedparser"));
const bluebird_1 = __importDefault(require("bluebird"));
;
class FeedError extends Error {
    constructor(type, message, feed) {
        super();
        this.type = type;
        this.message = message;
        this.feed = feed;
    }
}
exports.FeedError = FeedError;
class FeedEmitter extends tiny_emitter_1.TinyEmitter {
    /**
     * Initialize the rss feed emitter
     *
     * @param {Options} options
     */
    constructor(options = {}) {
        super();
        this._feedList = [];
        this._userAgent = options.userAgent || "RssEmitter/v0.0.5 (https://github.com/kurozeropb/RssEmitter)";
        this._historyLengthMultiplier = 3;
        this._isFirst = true;
        this.options = options;
    }
    /**
     * Add a new feed to the feed list
     *
     * @param {FeedConfig} feedConfig
     *
     * @returns {Array<FeedConfig>}
     */
    add(feedConfig) {
        this._addOrUpdateFeedList(feedConfig);
        return this._feedList;
    }
    /**
     * Remove a feed from the feed list
     *
     * @param {string} url
     */
    remove(url) {
        let feed = this._findFeed({ url });
        return this._removeFromFeedList(feed);
    }
    /**
     * List all feeds
     *
     * @returns {Array<FeedConfig>}
     */
    list() {
        return this._feedList;
    }
    /**
     * Remove all feeds
     */
    destroy() {
        for (let i = this._feedList.length - 1; i >= 0; i--) {
            let feed = this._feedList[i];
            this._removeFromFeedList(feed);
        }
    }
    /** @hidden */
    _addOrUpdateFeedList(feed) {
        let feedInList = this._findFeed(feed);
        if (feedInList) {
            this._removeFromFeedList(feedInList);
        }
        return this._addToFeedList(feed);
    }
    /** @hidden */
    _findFeed(feed) {
        return lodash_1.default.find(this._feedList, {
            url: feed.url
        });
    }
    /** @hidden */
    _removeFromFeedList(feed) {
        if (!feed || !feed.setInterval)
            return;
        clearInterval(feed.setInterval);
        lodash_1.default.remove(this._feedList, { url: feed.url });
    }
    /** @hidden */
    _findItem(feed, item) {
        let object = {};
        object.link = item.link;
        object.title = item.title;
        if (item.guid) {
            object.link = item.link;
            object.title = item.title;
            object.guid = item.guid;
        }
        return lodash_1.default.find(feed.items, object);
    }
    /** @hidden */
    _addToFeedList(feed) {
        feed.items = [];
        feed.refresh = feed.refresh ? feed.refresh : 60000;
        feed.setInterval = this._createSetInterval(feed);
        this._feedList.push(feed);
    }
    /** @hidden */
    _createSetInterval(feed) {
        let self = this;
        function getContent() {
            self._fetchFeed(feed.url)
                .tap(findFeed)
                .tap(redefineItemHistoryMaxLength)
                .tap(sortItemsByDate)
                .tap(identifyOnlyNewItems)
                .tap(populateNewItemsInFeed)
                .catch((error) => {
                if (error.type === "feed_not_found") {
                    return;
                }
                self.emit("feed:error", error);
            });
            function findFeed(data) {
                let foundFeed = self._findFeed({ url: data.feedUrl });
                if (!foundFeed) {
                    throw {
                        type: "feed_not_found",
                        message: "Feed not found."
                    };
                }
                data.feed = foundFeed;
            }
            function redefineItemHistoryMaxLength(data) {
                let feedLength = data.items.length;
                data.feed.maxHistoryLength = feedLength * self._historyLengthMultiplier;
            }
            function sortItemsByDate(data) {
                data.items = lodash_1.default.sortBy(data.items, "date");
            }
            function identifyOnlyNewItems(data) {
                data.newItems = data.items.filter((fetchedItem) => {
                    let foundItemInsideFeed;
                    foundItemInsideFeed = self._findItem(data.feed, fetchedItem);
                    if (foundItemInsideFeed) {
                        return false;
                    }
                    return fetchedItem;
                });
            }
            function populateNewItemsInFeed(data) {
                data.newItems.forEach((item) => {
                    self._addItemToItemList(data.feed, item);
                });
                self._isFirst = false;
            }
        }
        getContent();
        return setInterval(getContent, feed.refresh);
    }
    /** @hidden */
    _addItemToItemList(feed, item) {
        if (this._isFirst && feed.ignoreFirst) {
            feed.items.push(item);
            feed.items = lodash_1.default.takeRight(feed.items, feed.maxHistoryLength);
        }
        else {
            feed.items.push(item);
            feed.items = lodash_1.default.takeRight(feed.items, feed.maxHistoryLength);
            this.emit("item:new", item);
        }
    }
    /** @hidden */
    _fetchFeed(feedUrl) {
        return new bluebird_1.default((reslove, reject) => {
            const feedparser = new feedparser_1.default({});
            let data = {};
            data.feedUrl = feedUrl;
            data.items = [];
            axios_1.default.get(feedUrl, {
                responseType: "stream",
                headers: {
                    "user-agent": this._userAgent,
                    "accept": "text/html,application/xhtml+xml,application/xml,text/xml"
                }
            }).then((response) => {
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
                if (!item)
                    return;
                item.meta.link = feedUrl;
                data.items.push(item);
            });
            feedparser.on("error", () => {
                reject(new FeedError("invalid_feed", `Cannot parse ${feedUrl} XML`, feedUrl));
            });
        });
    }
}
exports.FeedEmitter = FeedEmitter;
const RssFeedEmitter = FeedEmitter;
exports.default = RssFeedEmitter;
//# sourceMappingURL=index.js.map