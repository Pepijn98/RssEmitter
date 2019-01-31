/// <reference types="@types/feedparser" />
/// <reference types="@types/node" />
/// <reference types="@types/bluebird" />
import TinyEmitter from "tiny-emitter";
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
    categories: string[];
    enclosures: string[];
    meta: Meta;
}
export interface FeedData {
    feedUrl: string;
    feed?: FeedConfig;
    items: Array<FeedItem>;
    newItems?: Array<FeedItem>;
}
export interface FeedConfig {
    url: string;
    maxHistoryLength?: number;
    setInterval?: NodeJS.Timeout;
    refresh?: number | 60000;
    items: Array<FeedItem>;
}
export declare class FeedError extends Error {
    type: string;
    message: string;
    feed: string;
    constructor(type: string, message: string, feed: string);
}
export declare class FeedEmitter extends TinyEmitter {
    _feedList: Array<FeedConfig>;
    _userAgent: string;
    _historyLengthMultiplier: number;
    constructor(options?: Options);
    add(feedConfig: FeedConfig): Array<FeedConfig>;
    remove(url: string): void;
    list(): Array<FeedConfig>;
    destroy(): void;
    _addOrUpdateFeedList(feed: FeedConfig): void;
    _findFeed(feed: FeedConfig): FeedConfig | undefined;
    _removeFromFeedList(feed: FeedConfig): void;
    _findItem(feed: FeedConfig, item: FeedItem): FeedItem | undefined;
    _addToFeedList(feed: FeedConfig): void;
    _createSetInterval(feed: FeedConfig): NodeJS.Timeout;
    _addItemToItemList(feed: FeedConfig, item: FeedItem): void;
    _fetchFeed(feedUrl: string): Bluebird<FeedData>;
}
declare const RssFeedEmitter: typeof FeedEmitter;
export default RssFeedEmitter;
