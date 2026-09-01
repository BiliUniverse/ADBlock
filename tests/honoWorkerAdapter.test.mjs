import assert from "node:assert/strict";
import test from "node:test";
import HonoWorkerAdapter from "../src/class/HonoWorkerAdapter.mjs";
import database from "../src/function/database.mjs";
import setENV from "../src/function/setENV.mjs";

test("rewrites Pages and Workers paths to the original upstream host", () => {
	const pages = HonoWorkerAdapter.routeRewrite(new URL("https://adblock-dux.pages.dev/api.bilibili.com/x/v2/feed/index?foo=bar"), "api.bilibili.com/x/v2/feed/index");
	assert.equal(pages.toString(), "https://api.bilibili.com/x/v2/feed/index?foo=bar");

	const workers = HonoWorkerAdapter.routeRewrite(new URL("https://adblock.nanocat.workers.dev/grpc.biliapi.net/bilibili.app.view.v1.View/View"), "grpc.biliapi.net/bilibili.app.view.v1.View/View");
	assert.equal(workers.toString(), "https://grpc.biliapi.net/bilibili.app.view.v1.View/View");
});

test("extracts module arguments from the header and removes the transport header", () => {
	const request = {
		url: "https://api.bilibili.com/x/v2/feed/index",
		headers: { "biliverse-args": "Settings.Switch=false&Settings.Types=AD" },
	};
	HonoWorkerAdapter.buildArgument(request);
	assert.deepEqual(globalThis.$argument, { Settings: { Switch: "false", Types: "AD" } });
	assert.deepEqual(request.headers, {});
});

test("extracts query arguments and removes module settings from the upstream URL", () => {
	const request = {
		url: "https://api.bilibili.com/x/v2/feed/index?Settings.Switch=false&Settings.Types=AD&foo=bar",
		headers: {},
	};
	HonoWorkerAdapter.buildArgument(request);
	assert.deepEqual(globalThis.$argument, { Settings: { Switch: "false", Types: "AD" }, foo: "bar" });
	assert.equal(request.url, "https://api.bilibili.com/x/v2/feed/index?foo=bar");
});

test("loads ADBlock caches from the request-scoped Worker KV adapter", async () => {
	const requestedKeys = [];
	const KV = {
		async getItem(key) {
			requestedKeys.push(key);
			return { banner_hash: "worker-cache" };
		},
	};
	const { Caches } = await setENV("BiliBili", "ADBlock", database, KV);
	assert.deepEqual(requestedKeys, ["@BiliBili.ADBlock.Caches"]);
	assert.deepEqual(Caches, { banner_hash: "worker-cache" });
});
