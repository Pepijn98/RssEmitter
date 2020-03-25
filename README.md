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

# Docs
https://kurozeropb.github.io/RssEmitter/

| Emitted events | Params            | Description                                                  | Since |
|----------------|-------------------|--------------------------------------------------------------|-------|
| item:new       | item:  FeedItem   | emits when a new item is added to the rss feed               | 0.0.1 |
| feed:init      | feed:  FeedConfig | emits when a feed is done loading it's initial items         | 0.3.0 |
| feed:new       | feed:  FeedConfig | emits when a new feed is added using FeedEmitter#add()       | 0.3.0 |
| feed:update    | feed:  FeedConfig | emits when an existing feed is added using FeedEmitter#add() | 0.3.0 |
| feed:error     | error: FeedError  | emits when an error occured while checking the feed          | 0.0.1 |

## Examples
Can be found in the [examples](/examples) folder