# RssEmitter
Emit rss feed items, written in TypeScript

# Example
```ts
import RssFeedEmitter, { FeedItem, FeedError } from "rss-emitter-ts";

const emitter = new RssFeedEmitter();

// Add a new feed
emitter.add({
    url: "https://hnrss.org/frontpage",
    refresh: 20000,
    ignoreFirst: true // Ignores the all the items when initializing and fetching the items for the first time
});

emitter.on("item:new", (item: FeedItem) => {
    // New item added to the feed
});

emitter.on("feed:error", (error: FeedError) => {
    // Error while checking the feed
});

// Remove an existing feed
emitter.remove("https://hnrss.org/frontpage");

// List all feeds
emitter.list();

// Remove all feeds
emitter.destroy();
```