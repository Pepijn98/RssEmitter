# RssEmitter
Emit rss feed items, written in TypeScript

# Example
```ts
import RssFeedEmitter, {
    FeedItem,
    FeedConfig,
    FeedError
} from "rss-emitter-ts";

const rss = new RssFeedEmitter();

// Add a new feed
rss.add({
    url: "https://hnrss.org/frontpage",
    refresh: 20000,
    ignoreFirst: true
});

// Listen to the emitted events
rss.on("item:new", (item: FeedItem) => {
    const message = `New item:\n${item.title}\n${item.description}`;
    console.log(message);
});

rss.on("feed:error", (error: FeedError) => {
    const errorMsg = `Type: ${error.type}\nFeed: ${error.feed}\nMessage: ${error.message}`;
    console.error(errorMsg);
});

// List all feeds
const allFeeds = rss.list();
const feeds = allFeeds.map((feed: FeedConfig) => feed.url).join("\n");
console.log(feeds);
```

# Docs
https://kurozeropb.info/rss-emitter/docs

| Emitted events |                                                     |
|----------------|-----------------------------------------------------|
| item:new       | emits when a new item is added to the rss feed      |
| feed:error     | emits when an error occured while checking the feed |
