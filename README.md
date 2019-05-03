<div align="center">
  <br />
  <p>
    <a href="https://discord.gg/p895czC"><img src="https://discordapp.com/api/guilds/240059867744698368/embed.png" alt="Discord server" /></a>
    <a href="https://www.npmjs.com/package/rss-emitter-ts"><img src="https://img.shields.io/npm/v/rss-emitter-ts.svg?maxAge=3600" alt="NPM version" /></a>
    <a href="https://www.npmjs.com/package/rss-emitter-ts"><img src="https://img.shields.io/npm/dt/rss-emitter-ts.svg?maxAge=3600" alt="NPM downloads" /></a>
    <a href="https://david-dm.org/KurozeroPB/rssemitter"><img src="https://img.shields.io/david/kurozeropb/rssemitter.svg?maxAge=3600" alt="Dependencies" /></a>
    <a href="https://www.patreon.com/Kurozero"><img src="https://img.shields.io/badge/donate-patreon-F96854.svg" alt="Patreon" /></a>
  </p>
  <p>
    <a href="https://nodei.co/npm/rss-emitter-ts/"><img src="https://nodei.co/npm/rss-emitter-ts.png?downloads=true&stars=true" alt="NPM info" /></a>
  </p>
</div>

# RssEmitter
Emit rss feed items, written in TypeScript

# Example
```ts
// TypeScript

import {
    FeedEmitter,
    FeedItem,
    FeedConfig,
    FeedError
} from "rss-emitter-ts";

const emitter = new FeedEmitter();

// Add a new feed
emitter.add({ url: "https://hnrss.org/frontpage", refresh: 20000, ignoreFirst: true });

// Listen to the emitted events
emitter.on("item:new", (item: FeedItem) => {
    const message = `New item:\n${item.title}\n${item.description}`;
    console.log(message);
});

emitter.on("feed:error", (error: FeedError) => {
    const errorMsg = `Type: ${error.type}\nFeed: ${error.feed}\nMessage: ${error.message}`;
    console.error(errorMsg);
});

// List all feeds
const allFeeds = emitter.list();
const feeds = allFeeds.map((feed: FeedConfig) => feed.url).join("\n");
console.log(feeds);
```

```js
// JavaScript

const { FeedEmitter } = require("rss-emitter-ts");
const emitter = new FeedEmitter();

emitter.add({ url: "https://hnrss.org/frontpage", refresh: 20000, ignoreFirst: true });

emitter.on("item:new", (item) => console.log(item.title));
emitter.on("feed:error", (error) => console.error(error.message));

const allFeeds = emitter.list();
const feeds = allFeeds.map((feed) => feed.url).join("\n");
console.log(feeds);
```

# Docs
https://kurozeropb.github.io/RssEmitter/

| Emitted events |                                                     |
|----------------|-----------------------------------------------------|
| item:new       | emits when a new item is added to the rss feed      |
| feed:error     | emits when an error occured while checking the feed |
