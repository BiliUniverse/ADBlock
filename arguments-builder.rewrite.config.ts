import { defineConfig } from "@iringo/arguments-builder";

const endpoint = {
	key: "endpoint",
	name: "[重写] 服务端点",
	defaultValue: "adblock-dux.pages.dev",
	type: "string" as const,
	options: [
		{ key: "adblock-dux.pages.dev", label: "首选；直连；无需代理" },
		{ key: "dev.adblock-dux.pages.dev", label: "开发版" },
		{ key: "api.nanocat.cloud", label: "Worker 版；需要代理" },
	],
};

export default defineConfig({
	args: [endpoint],
	output: {
		surge: { path: "./dist/BiliBili.ADBlock.Rewrite.sgmodule", template: "./template/surge.rewrite.handlebars", transformEgern: { enable: true, path: "./dist/BiliBili.ADBlock.Rewrite.yaml" } },
		loon: { path: "./dist/BiliBili.ADBlock.Rewrite.plugin", template: "./template/loon.rewrite.handlebars" },
		customItems: [
			{ path: "./dist/BiliBili.ADBlock.Rewrite.srmodule", template: "./template/shadowrocket.rewrite.handlebars" },
			{ path: "./dist/BiliBili.ADBlock.Rewrite.stoverride", template: "./template/stash.rewrite.handlebars" },
		],
	},
});
