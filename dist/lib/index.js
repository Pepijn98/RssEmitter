"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bluebird_1 = __importDefault(require("bluebird"));
const axios_1 = __importDefault(require("axios"));
const feedparser_1 = __importDefault(require("feedparser"));
const package_json_1 = require("../package.json");
const tiny_emitter_1 = require("tiny-emitter");
;
class FeedError extends Error {
    constructor(type, message, feed) {
        super();
        this.type = type;
        this.message = message;
        this.feed = feed ? feed : "";
    }
}
exports.FeedError = FeedError;
class FeedEmitter extends tiny_emitter_1.TinyEmitter {
    /**
     * Initialize the rss feed emitter
     * @param {Options} options
     */
    constructor(options = {}) {
        super();
        this._feedList = [];
        this._userAgent = options.userAgent || `RssEmitter/v${package_json_1.version} (https://github.com/kurozeropb/RssEmitter)`;
        this._historyLengthMultiplier = 3;
        this._isFirst = true;
    }
    /**
     * Add a new feed to the feed list
     * @param {FeedConfig} feedConfig
     * @returns {Array<FeedConfig>}
     */
    add(feedConfig) {
        this._addOrUpdateFeedList(feedConfig);
        return this._feedList;
    }
    /**
     * Remove a feed from the feed list
     * @param {string} url
     */
    remove(url) {
        let feed = this._findFeed({ url });
        return this._removeFromFeedList(feed);
    }
    /**
     * List all feeds
     * @returns {Array<FeedConfig>}
     */
    list() {
        return this._feedList;
    }
    /** Remove all feeds */
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
        return this._feedList.find((x) => x.url === feed.url);
    }
    /** @hidden */
    _removeFromFeedList(feed) {
        if (!feed || !feed.setInterval)
            return;
        clearInterval(feed.setInterval);
        for (let i = 0; i < this._feedList.length; i++) {
            if (this._feedList[i].url === feed.url) {
                this._feedList.splice(i, 1);
                i--;
            }
        }
    }
    /** @hidden */
    _findItem(feed, item) {
        if (!feed.items)
            return void 0;
        if (item.guid) {
            return feed.items.find((x) => x.link === item.link && x.title === item.title && x.guid === item.guid);
        }
        return feed.items.find((x) => x.link === item.link && x.title === item.title);
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
        const self = this;
        function getContent() {
            function findFeed(data) {
                let foundFeed = self._findFeed({ url: data.feedUrl });
                if (!foundFeed) {
                    throw new FeedError("feed_not_found", "Feed not found.");
                }
                data.feed = foundFeed;
            }
            function redefineItemHistoryMaxLength(data) {
                let feedLength = data.items.length;
                data.feed.maxHistoryLength = feedLength * self._historyLengthMultiplier;
            }
            function sortItemsByDate(data) {
                // @ts-ignore
                data.items = data.items.sort((a, b) => b.date - a.date);
            }
            function identifyOnlyNewItems(data) {
                data.newItems = data.items.filter((fetchedItem) => {
                    const foundItemInsideFeed = self._findItem(data.feed, fetchedItem);
                    if (foundItemInsideFeed) {
                        return false;
                    }
                    return fetchedItem;
                });
            }
            function populateNewItemsInFeed(data) {
                data.newItems.forEach((item) => self._addItemToItemList(data.feed, item));
                self._isFirst = false;
            }
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
        }
        getContent();
        return setInterval(getContent, feed.refresh);
    }
    /** @hidden */
    _addItemToItemList(feed, item) {
        if (this._isFirst && feed.ignoreFirst) {
            feed.items.push(item);
            const maxHistory = feed.maxHistoryLength || 10;
            const len = feed.items.length;
            feed.items = feed.items.slice(len - maxHistory, len);
        }
        else {
            feed.items.push(item);
            const maxHistory = feed.maxHistoryLength || 10;
            const len = feed.items.length;
            feed.items = feed.items.slice(len - maxHistory, len);
            this.emit("item:new", item);
        }
    }
    /** @hidden */
    _fetchFeed(feedUrl) {
        return new bluebird_1.default((reslove, reject) => {
            const feedparser = new feedparser_1.default({});
            let data = {
                feedUrl,
                items: [],
                newItems: []
            };
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
exports.default = FeedEmitter;
