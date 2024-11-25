import { defineConfig } from "@iringo/arguments-builder";

export default defineConfig({
	output: {
		surge: {
			path: "./dist/BiliBili.ADBlock.sgmodule",
			transformEgern: {
				enable: true,
				path: "./dist/BiliBili.ADBlock.yaml",
			},
		},
		loon: {
			path: "./dist/BiliBili.ADBlock.plugin",
		},
		customItems: [
			{
				path: "./dist/BiliBili.ADBlock.stoverride",
				template: "./template/stash.handlebars",
			},
			{
				path: "./dist/BiliBili.ADBlock.snippet",
				template: "./template/quantumultx.handlebars",
			},
		],
		dts: {
			isExported: true,
			path: "./src/types.d.ts",
		},
		boxjsSettings: {
			path: "./template/boxjs.settings.json",
			scope: "@BiliBili.ADBlock.Settings",
		},
	},
	args: [
		{
			key: "Splash",
			name: "[开屏] 去除广告",
			defaultValue: true,
			type: "boolean",
			description: "是否启用此处修改",
		},
		{
			key: "Feed.AD",
			name: "[推荐] 去除广告",
			defaultValue: true,
			type: "boolean",
			description: "是否启用此处修改",
		},
		{
			key: "Feed.Activity",
			name: "[推荐] 去除“活动大图”",
			defaultValue: false,
			type: "boolean",
			description: "是否启用此处修改",
		},
		{
			key: "Feed.Vertical",
			name: "[推荐] 去除竖屏视频",
			defaultValue: false,
			type: "boolean",
			description: "是否启用此处修改",
		},
		{
			key: "Feed.BlockUpLiveList",
			name: "[推荐] 屏蔽UP主直播推广",
			defaultValue: "",
			type: "string",
			description: "填写up主uid，以英文逗号隔开。",
		},
		{
			key: "Feed.Story",
			name: "[首页] 去除短视频流广告",
			defaultValue: true,
			type: "boolean",
			description: "是否启用此处修改",
		},
		{
			key: "Search.AD",
			name: "[搜索] 去除广告",
			defaultValue: true,
			type: "boolean",
			description: "是否启用此处修改",
		},
		{
			key: "Search.HotSearch",
			name: "[搜索] 去除“热搜”",
			defaultValue: true,
			type: "boolean",
			description: "是否启用此处修改",
		},
		{
			key: "PGC.AD",
			name: "[番剧电影] 去除广告",
			defaultValue: true,
			type: "boolean",
			description: "是否启用此处修改",
		},
		{
			key: "Xlive.AD",
			name: "[直播] 去除广告",
			defaultValue: true,
			type: "boolean",
			description: "是否启用此处修改",
		},
		{
			key: "Dynamic.HotTopics",
			name: "[动态] 去除“热门话题”",
			defaultValue: true,
			type: "boolean",
			description: "是否启用此处修改",
		},
		{
			key: "Dynamic.MostVisited",
			name: "[动态] 去除“最常访问”",
			defaultValue: false,
			type: "boolean",
			description: "是否启用此处修改",
		},
		{
			key: "Dynamic.AdCard",
			name: "[动态] 去除广告卡片",
			defaultValue: true,
			type: "boolean",
			description: "是否启用此处修改",
		},
		{
			key: "View.AD",
			name: "[用户投稿] 去除视频广告",
			defaultValue: true,
			type: "boolean",
			description: "是否启用此处修改",
		},
		{
			key: "DM.Command",
			name: "[弹幕] 去除交互式弹幕",
			defaultValue: false,
			type: "boolean",
			description: "是否启用此处修改",
		},
		{
			key: "DM.Colorful",
			name: "[弹幕] 替换彩色弹幕",
			defaultValue: false,
			type: "boolean",
			description: "是否启用此处修改",
		},
		{
			key: "Reply.AD",
			name: "[评论] 去除广告",
			defaultValue: true,
			type: "boolean",
			description: "是否启用此处修改",
		},
	],
});
