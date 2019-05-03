const assert = require("assert");
const { FeedEmitter } = require("../dist/lib");

describe("FeedEmitter", function() {
    const emitter = new FeedEmitter();
    assert(emitter instanceof FeedEmitter, "emitter did not construct properly");

    describe("#add()", function() {
        it("should add a feed to the feedlist", function() {
            emitter.add({ url: "https://hnrss.org/frontpage", refresh: 20000, ignoreFirst: true });
            const feedList = emitter.add({ url: "https://github.com/reportapp/Api/commits/master.atom", refresh: 20000, ignoreFirst: true });
            assert.strictEqual(feedList.length, 2, "Feedlist should contain 2 feeds");
        });
    });

    describe("#list()", function() {
        it("should list all feeds", function() {
            const feedList = emitter.list();
            assert.strictEqual(feedList.length, 2, "List should still contain 2 feeds");
        });
    });

    describe("#get()", function() {
        it("should return a feed that matches the url", function() {
            const feed = emitter.get("https://hnrss.org/frontpage");
            assert.strictEqual(typeof feed, "object", "Get should return a feed object or undefined");
        });
    });

    describe("#remove()", function() {
        it("should remove the feed that matches the url from the list", function() {
            emitter.remove("https://hnrss.org/frontpage");
            const feedList = emitter.list();
            assert.strictEqual(feedList.length, 1, "Feedlist should contain 1 feed after removing 1");
        });
    });

    describe("#destroy()", function() {
        it("should remove all feeds from the list", function() {
            emitter.destroy();
            const feedList = emitter.list();
            assert.strictEqual(feedList.length, 0, "Feedlist shouldn't contain any feeds after destroy");
        });
    });
});
