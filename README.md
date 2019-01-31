# RssEmitter
Emit rss feed items, written in TypeScript

# Example
```ts
import RssFeedEmitter, { FeedItem, FeedError } from "rss-emitter-ts";

const rss = new RssFeedEmitter();

// Add a new feed
rss.add({
    url: "https://hnrss.org/frontpage",
    refresh: 20000,
    ignoreFirst: true // Ignores the all the items when initializing and fetching the items for the first time
});

rss.on("item:new", (item: FeedItem) => {
    // New item added to the feed
});

rss.on("feed:error", (error: FeedError) => {
    // Error while checking the feed
});

// Remove an existing feed
rss.remove("https://hnrss.org/frontpage");

// List all feeds
rss.list();

// Remove all feeds
rss.destroy();
```