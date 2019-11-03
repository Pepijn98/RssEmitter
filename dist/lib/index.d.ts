/// <reference types="@types/feedparser" />
import { Item, Meta, Image, Enclosure } from "feedparser";
import { Interval } from "yukikaze";
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
export declare class FeedError extends Error {
    type: string;
    message: string;
    feed: string;
    constructor(type: string, message: string, feed?: string);
}
export declare class FeedEmitter extends TinyEmitter {
    /** @hidden */ private _feedList;
    /** @hidden */ private _userAgent;
    /** @hidden */ private _debug;
    /** @hidden */ private _historyLengthMultiplier;
    /**
     * Initialize the rss feed emitter
     * @param {Options} options
     */
    constructor(options?: Options);
    /**
     * Add a new feed to the feed list
     * @param {FeedConfig} feedConfig
     * @returns {Array<FeedConfig>}
     */
    add(feedConfig: FeedConfig): FeedConfig[];
    /**
     * Get specific feed from the feedlist
     * @param {string} url
     * @returns {FeedConfig|undefined}
     */
    get(url: string): FeedConfig | undefined;
    /**
     * Remove a feed from the feed list
     * @param {string} url
     */
    remove(url: string): void;
    /**
     * List all feeds
     * @returns {Array<FeedConfig>}
     */
    list(): FeedConfig[];
    /** Remove all feeds */
    destroy(): void;
    /** @hidden */
    private _addOrUpdateFeedList;
    /** @hidden */
    private _findFeed;
    /** @hidden */
    private _removeFromFeedList;
    /** @hidden */
    private _findItem;
    /** @hidden */
    private _addToFeedList;
    /** @hidden */
    private _createSetInterval;
    /** @hidden */
    private _addItemToItemList;
    /** @hidden */
    private _fetchFeed;
}
export default FeedEmitter;
