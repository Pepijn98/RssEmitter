/* eslint-disable @typescript-eslint/no-var-requires */

const { FeedEmitter } = require("../");

const feeds = [
    { url: "http://www.horriblesubs.info/rss.php?res=all", refresh: 20000, eventName: "horriblesubs", ignoreFirst: true },
    { url: "https://hnrss.org/frontpage", refresh: 20000, ignoreFirst: true },
    { url: "https://github.com/reportapp/Api/commits/master.atom", refresh: 20000, ignoreFirst: true },
    { url: "https://github.com/kurozeropb/Jeanne/commits/master.atom", refresh: 20000, ignoreFirst: true },
    { url: "https://github.com/azurlane-api/AzurLane-Companion/commits/master.atom", refresh: 20000, ignoreFirst: true },
    { url: "https://github.com/azurlane-api/AzurLaneKt/commits/master.atom", refresh: 20000, ignoreFirst: true }
];

const emitter = new FeedEmitter();

emitter.on("feed:new", (config) => {
    console.log(`Feed added: ${config.url}`);
});

emitter.on("item:new", (item) => {
    console.log(`New item: (${item.link})\n${item.title}\n${item.description}\n\n`);
});

emitter.on("item:new:horriblesubs", (item) => {
    console.log(`New item from horriblesubs: (${item.link})\n${item.title}\n${item.description}\n\n`);
});

emitter.on("feed:error", (error) => {
    console.error(`Type: ${error.type}\nFeed: ${error.feed}\nMessage: ${error.message}`);
});

feeds.forEach((feed) => emitter.add(feed));
