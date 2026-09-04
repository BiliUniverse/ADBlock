import assert from "node:assert/strict";
import test from "node:test";
import { DynAllPersonalReply } from "@biliverse/protobuf/bilibili/app/dynamic/v2/dynamic.js";
import { SubjectDescriptionReply } from "@biliverse/protobuf/bilibili/main/community/reply/v2/reply.js";
import gRPC from "@nsnanocat/grpc";
import ADBlock from "../src/class/ADBlock.mjs";
import HonoWorkerAdapter from "../src/class/HonoWorkerAdapter.mjs";
import { Request } from "../src/process/Request.mjs";
import { Response as DevResponse } from "../src/process/Response.dev.mjs";

test("ADBlock centralizes search ad and tracking cleanup", () => {
	const adBlock = new ADBlock();
	const json = {
		track_id: "track",
		url: "https://example.com/video?spm_id_from=feed&foo=bar",
	};
	const search = {
		data: [{ type: "trending" }, { type: "history" }],
		trackId: "track",
		jumpUrl: "https://example.com/video?trackid=1&foo=bar",
	};

	assert.equal(adBlock.cleanTracking(json), 2);
	assert.equal(json.track_id, undefined);
	assert.equal(json.url, "https://example.com/video?foo=bar");
	assert.equal(adBlock.cleanTracking(search, "Search"), 2);
	assert.equal(search.trackId, "");
	assert.equal(search.jumpUrl, "https://example.com/video?foo=bar");
});

test("returns a minimal valid gRPC response for DefaultWords", async () => {
	for (const hostname of ["grpc.biliapi.net", "app.biliapi.net", "app.bilibili.com", "app.biliapi.com"]) {
		const url = `https://${hostname}/bilibili.app.interface.v1.Search/DefaultWords`;
		HonoWorkerAdapter.buildArgument({ url, headers: { "biliverse-args": "LogLevel=OFF" } });
		const { $response } = await Request({
			method: "GET",
			url,
			headers: { "user-agent": "bili-universal/80000100" },
		});

		assert.equal($response.status, 200);
		assert.equal($response.headers["Content-Type"], "application/grpc");
		assert.equal($response.headers["Content-Length"], "5");
		assert.deepEqual([...$response.body], [0, 0, 0, 0, 0]);
	}
});

test("returns a local success response for blocked Bilibili commercial reports", async () => {
	HonoWorkerAdapter.buildArgument({
		url: "https://cm.bilibili.com/cm/api/conversion/mobile/v2",
		headers: { "biliverse-args": "Privacy.BlockBiliCommercial=true&LogLevel=OFF" },
	});
	const { $response } = await Request({
		method: "POST",
		url: "https://cm.bilibili.com/cm/api/conversion/mobile/v2",
		headers: { "content-type": "application/json" },
	});

	assert.equal($response.status, 200);
	assert.deepEqual(JSON.parse($response.body), { code: 0, message: "success" });
});

test("filters personal dynamic advertising cards with the packaged protobuf binding", async () => {
	HonoWorkerAdapter.buildArgument({
		url: "https://grpc.biliapi.net/bilibili.app.dynamic.v2.Dynamic/DynAllPersonal",
		headers: { "biliverse-args": "Dynamic.PersonalAdCard=true&LogLevel=OFF" },
	});
	const responseBody = gRPC.encode(
		DynAllPersonalReply.toBinary(
			DynAllPersonalReply.create({
				list: [{ cardType: 15 }, { cardType: 8 }],
			}),
		),
	);
	const result = await DevResponse(
		{
			method: "POST",
			url: "https://grpc.biliapi.net/bilibili.app.dynamic.v2.Dynamic/DynAllPersonal",
			headers: { "user-agent": "bili-universal/80000100" },
		},
		{ status: 200, headers: { "content-type": "application/grpc" }, body: responseBody },
	);
	const decoded = DynAllPersonalReply.fromBinary(gRPC.decode(result.body));

	assert.deepEqual(
		decoded.list.map(item => item.cardType),
		[8],
	);
});

test("filters commercial Reply v2 editor buttons with the packaged protobuf binding", async () => {
	HonoWorkerAdapter.buildArgument({
		url: "https://grpc.biliapi.net/bilibili.main.community.reply.v2.Reply/SubjectDescription",
		headers: { "biliverse-args": "Reply.SubjectDescriptionCommercial=true&LogLevel=OFF" },
	});
	const responseBody = gRPC.encode(
		SubjectDescriptionReply.toBinary(
			SubjectDescriptionReply.create({
				input: {
					funcButtons: {
						buttons: [
							{ type: 5, name: "goods" },
							{ type: 8, name: "assistant" },
							{ type: 1, name: "screenshot" },
						],
					},
				},
			}),
		),
	);
	const result = await DevResponse(
		{
			method: "POST",
			url: "https://grpc.biliapi.net/bilibili.main.community.reply.v2.Reply/SubjectDescription",
			headers: { "user-agent": "bili-universal/80000100" },
		},
		{ status: 200, headers: { "content-type": "application/grpc" }, body: responseBody },
	);
	const decoded = SubjectDescriptionReply.fromBinary(gRPC.decode(result.body));

	assert.deepEqual(
		decoded.input.funcButtons.buttons.map(button => button.type),
		[1],
	);
});
