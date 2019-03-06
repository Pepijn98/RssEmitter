/// <reference types="@types/feedparser" />
/// <reference types="node" />
/// <reference types="@types/bluebird" />
import { TinyEmitter } from "tiny-emitter";
import { Item, Meta, Image } from "feedparser";
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
}
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
export declare class FeedError extends Error {
    type: string;
    message: string;
    feed: string;
    constructor(type: string, message: string, feed: string);
}
export declare class FeedEmitter extends TinyEmitter {
    /** @hidden */ _feedList: Array<FeedConfig>;
    /** @hidden */ _userAgent: string;
    /** @hidden */ _historyLengthMultiplier: number;
    /** @hidden */ _isFirst: boolean;
    options: Options;
    /**
     * Initialize the rss feed emitter
     *
     * @param {Options} options
     */
    constructor(options?: Options);
    /**
     * Add a new feed to the feed list
     *
     * @param {FeedConfig} feedConfig
     *
     * @returns {Array<FeedConfig>}
     */
    add(feedConfig: FeedConfig): Array<FeedConfig>;
    /**
     * Remove a feed from the feed list
     *
     * @param {string} url
     */
    remove(url: string): void;
    /**
     * List all feeds
     *
     * @returns {Array<FeedConfig>}
     */
    list(): Array<FeedConfig>;
    /**
     * Remove all feeds
     */
    destroy(): void;
    /** @hidden */
    _addOrUpdateFeedList(feed: FeedConfig): void;
    /** @hidden */
    _findFeed(feed: FeedConfig): FeedConfig | undefined;
    /** @hidden */
    _removeFromFeedList(feed: FeedConfig | undefined): void;
    /** @hidden */
    _findItem(feed: FeedConfig, item: FeedItem): FeedItem | undefined;
    /** @hidden */
    _addToFeedList(feed: FeedConfig): void;
    /** @hidden */
    _createSetInterval(feed: FeedConfig): NodeJS.Timeout;
    /** @hidden */
    _addItemToItemList(feed: FeedConfig, item: FeedItem): void;
    /** @hidden */
    _fetchFeed(feedUrl: string): Bluebird<FeedData>;
}
declare const RssFeedEmitter: typeof FeedEmitter;
export default RssFeedEmitter;
