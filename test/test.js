/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require("assert");
const { FeedEmitter } = require("../dist/lib");

describe("FeedEmitter", () => {
    const emitter = new FeedEmitter();
    assert(emitter instanceof FeedEmitter, "emitter did not construct properly");

    describe("#add()", () => {
        it("should add a feed to the feedlist", () => {
            emitter.add({ url: "https://hnrss.org/frontpage", refresh: 20000, ignoreFirst: true });
            const feedList = emitter.add({ url: "https://github.com/reportapp/Api/commits/master.atom", refresh: 20000, ignoreFirst: true });
            assert.strictEqual(feedList.length, 2, "Feedlist should contain 2 feeds");
        });
    });

    describe("#list()", () => {
        it("should list all feeds", () => {
            const feedList = emitter.list();
            assert.strictEqual(feedList.length, 2, "List should still contain 2 feeds");
        });
    });

    describe("#get()", () => {
        it("should return a feed that matches the url", () => {
            const feed = emitter.get("https://hnrss.org/frontpage");
            assert.strictEqual(typeof feed, "object", "Get should return a feed object or undefined");
        });
    });

    describe("#remove()", () => {
        it("should remove the feed that matches the url from the list", () => {
            emitter.remove("https://hnrss.org/frontpage");
            const feedList = emitter.list();
            assert.strictEqual(feedList.length, 1, "Feedlist should contain 1 feed after removing 1");
        });
    });

    describe("#destroy()", () => {
        it("should remove all feeds from the list", () => {
            emitter.destroy();
            const feedList = emitter.list();
            assert.strictEqual(feedList.length, 0, "Feedlist shouldn't contain any feeds after destroy");
        });
    });
});
