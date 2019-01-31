"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tiny_emitter_1 = __importDefault(require("tiny-emitter"));
const lodash_1 = __importDefault(require("lodash"));
const axios_1 = __importDefault(require("axios"));
const feedparser_1 = __importDefault(require("feedparser"));
const bluebird_1 = __importDefault(require("bluebird"));
class FeedError extends Error {
    constructor(type, message, feed) {
        super();
        this.type = type;
        this.message = message;
        this.feed = feed;
    }
}
exports.FeedError = FeedError;
class FeedEmitter extends tiny_emitter_1.default {
    constructor(options = {}) {
        super();
        this._feedList = [];
        this._userAgent = options.userAgent || "RssFeedEmitter (https://github.com/kurozeropb/RssFeedEmitter)";
        this._historyLengthMultiplier = 3;
    }
    add(feedConfig) {
        this._addOrUpdateFeedList(feedConfig);
        return this._feedList;
    }
    remove(url) {
        let feed = this._findFeed({ url, items: [] });
        if (!feed)
            return;
        return this._removeFromFeedList(feed);
    }
    list() {
        return this._feedList;
    }
    destroy() {
        for (let i = this._feedList.length - 1; i >= 0; i--) {
            let feed = this._feedList[i];
            this._removeFromFeedList(feed);
        }
    }
    _addOrUpdateFeedList(feed) {
        let feedInList = this._findFeed(feed);
        if (feedInList) {
            this._removeFromFeedList(feedInList);
        }
        return this._addToFeedList(feed);
    }
    _findFeed(feed) {
        return lodash_1.default.find(this._feedList, {
            url: feed.url
        });
    }
    _removeFromFeedList(feed) {
        if (!feed || !feed.setInterval)
            return;
        clearInterval(feed.setInterval);
        lodash_1.default.remove(this._feedList, { url: feed.url });
    }
    _findItem(feed, item) {
        let object = {
            link: item.link,
            title: item.title,
            guid: ""
        };
        if (item.guid) {
            object = {
                link: item.link,
                title: item.title,
                guid: item.guid
            };
        }
        return lodash_1.default.find(feed.items, object);
    }
    _addToFeedList(feed) {
        feed.items = [];
        feed.setInterval = this._createSetInterval(feed);
        this._feedList.push(feed);
    }
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
                self.emit("error", error);
            });
            function findFeed(data) {
                let foundFeed = self._findFeed({ url: data.feedUrl, items: [] });
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
                if (data.feed)
                    data.feed.maxHistoryLength = feedLength * self._historyLengthMultiplier;
            }
            function sortItemsByDate(data) {
                data.items = lodash_1.default.sortBy(data.items, "date");
            }
            function identifyOnlyNewItems(data) {
                data.newItems = data.items.filter((fetchedItem) => {
                    let foundItemInsideFeed;
                    if (data.feed)
                        foundItemInsideFeed = self._findItem(data.feed, fetchedItem);
                    if (foundItemInsideFeed) {
                        return false;
                    }
                    return fetchedItem;
                });
            }
            function populateNewItemsInFeed(data) {
                if (data.newItems) {
                    data.newItems.forEach((item) => {
                        if (!data.feed)
                            return;
                        self._addItemToItemList(data.feed, item);
                    });
                }
            }
        }
        getContent();
        return setInterval(getContent, feed.refresh || 60000);
    }
    _addItemToItemList(feed, item) {
        feed.items.push(item);
        feed.items = lodash_1.default.takeRight(feed.items, feed.maxHistoryLength);
        this.emit("new-item", item);
    }
    _fetchFeed(feedUrl) {
        return new bluebird_1.default((reslove, reject) => {
            const feedparser = new feedparser_1.default({});
            let data = {
                feedUrl,
                items: []
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
                return response.data.pipe(feedparser);
            }).then(() => {
                reslove(data);
            }).catch(() => {
                reject(new FeedError("fetch_url_error", `Cannot connect to ${feedUrl}`, feedUrl));
            });
            feedparser.on("readable", () => {
                const item = feedparser.read();
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