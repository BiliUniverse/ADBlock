import { $platform, Lodash as _, Storage, gRPC, fetch, notification, log, logError, wait, done } from "@nsnanocat/util";
import database from "./function/database.mjs";
import setENV from "./function/setENV.mjs";
import { PlayViewReply } from "./protobuf/bilibili/pgc/gateway/player/v2/playurl.js";
import { DynAllReply } from "./protobuf/bilibili/app/dynamic/v2/Dynamic/dynamic.js";
import { ViewReply, TFInfoReply } from "./protobuf/bilibili/app/view/v1/View/view.js";
import { ViewReply as ViewUniteReply, RelatesFeedReply } from "./protobuf/bilibili/app/viewunite/v1/viewunite.js";
import { ModeStatus } from "./protobuf/bilibili/app/interface/teenagers.js";
import { DmViewReply, DmSegMobileReply } from "./protobuf/bilibili/community/service/dm/v1/DM/dm.js";
import { SearchAllResponse } from "./protobuf/bilibili/polymer/app/search/v1/search.js";
import { WireType, UnknownFieldHandler, reflectionMergePartial, MESSAGE_TYPE, MessageType, BinaryReader, isJsonObject, typeofJsonValue, jsonWriteOptions } from "../node_modules/@protobuf-ts/runtime/build/es2015/index.js";
/***************** Processing *****************/
// 解构URL
const url = new URL($request.url);
log(`⚠ url: ${url.toJSON()}`, "");
// 获取连接参数
const METHOD = $request.method,
	HOST = url.hostname,
	PATH = url.pathname,
	PATHs = url.pathname.split("/").filter(Boolean);
log(`⚠ METHOD: ${METHOD}, HOST: ${HOST}, PATH: ${PATH}`, "");
// 解析格式
const FORMAT = ($response.headers?.["Content-Type"] ?? $response.headers?.["content-type"])?.split(";")?.[0];
log(`⚠ FORMAT: ${FORMAT}`, "");
!(async () => {
	// 读取设置
	const { Settings, Caches, Configs } = setENV("BiliBili", "ADBlock", database);
	log(`⚠ Settings.Switch: ${Settings?.Switch}`, "");
	switch (Settings.Switch) {
		case true:
		default: {
			// 创建空数据
			let body = { code: 0, message: "0", data: {} };
			// 格式判断
			switch (FORMAT) {
				case undefined: // 视为无body
					break;
				case "application/x-www-form-urlencoded":
				case "text/plain":
				default:
					break;
				case "application/x-mpegURL":
				case "application/x-mpegurl":
				case "application/vnd.apple.mpegurl":
				case "audio/mpegurl":
					//body = M3U8.parse($response.body);
					//log(`🚧 body: ${JSON.stringify(body)}`, "");
					//$response.body = M3U8.stringify(body);
					break;
				case "text/xml":
				case "text/html":
				case "text/plist":
				case "application/xml":
				case "application/plist":
				case "application/x-plist":
					//body = XML.parse($response.body);
					//log(`🚧 body: ${JSON.stringify(body)}`, "");
					//$response.body = XML.stringify(body);
					break;
				case "text/vtt":
				case "application/vtt":
					//body = VTT.parse($response.body);
					//log(`🚧 body: ${JSON.stringify(body)}`, "");
					//$response.body = VTT.stringify(body);
					break;
				case "text/json":
				case "application/json":
					body = JSON.parse($response.body ?? "{}");
					// 解析链接
					switch (HOST) {
						case "www.bilibili.com":
							break;
						case "app.bilibili.com":
						case "app.biliapi.net":
							switch (PATH) {
								case "/x/v2/splash/show": // 开屏页
								case "/x/v2/splash/list": // 开屏页
								case "/x/v2/splash/brand/list": // 开屏页
								case "/x/v2/splash/event/list2": // 开屏页
									switch (Settings?.Detail?.splash) {
										case true:
										default: {
											log("🎉 开屏页广告去除");
											const item = ["account", "event_list", "preload", "show"];
											if (body.data) {
												item.forEach(i => {
													delete body.data[i];
												});
											}
											break;
										}
										case false:
											log("🚧 用户设置开屏页广告不去除");
											break;
									}
									break;
								case "/x/v2/feed/index": // 推荐页
									switch (Settings?.Detail?.feed) {
										case true:
										default: {
											if (body.data.items?.length) {
												//区分pad与phone
												body.data.items = await Promise.all(
													body.data.items.map(async item => {
														const { card_type: cardType, card_goto: cardGoto, goto: Goto } = item;
														if (cardType && cardGoto) {
															if (["banner_v8", "banner_ipad_v8"].includes(cardType) && cardGoto === "banner") {
																switch (Settings?.Detail?.activity) {
																	case true:
																	default:
																		Caches.banner_hash = item.hash;
																		Storage.setItem("@BiliBili.ADBlock.Caches", Caches); // 获取banner_hash,无此字段会有活动页且此字段无法伪造.
																		log("🎉 推荐页活动大图去除");
																		return undefined;
																	case false:
																		if (item.banner_item) {
																			item.banner_item = item.banner_item.filter(i => {
																				if (i.type === "ad") {
																					log("🎉 推荐页大图广告去除");
																					return false;
																				}
																				return true;
																			});
																		}
																		break;
																}
															} else if (["cm_v2", "cm_v1"].includes(cardType) && ["ad_web_s", "ad_av", "ad_web_gif"].includes(cardGoto)) {
																// ad_player大视频广告 ad_web_gif大gif广告 ad_web_s普通小广告 ad_av创作推广广告 ad_inline_3d  上方大的视频3d广告 ad_inline_eggs 上方大的视频广告 ad_inline_live 华为问界
																log(`🎉 ${cardGoto}广告去除`);
																if (url.searchParams.get("device") !== "phone") {
																	return undefined; //pad直接去除
																} else {
																	await fixPosition().then(result => (item = result)); //小广告补位
																}
															} else if (cardGoto === "live" && cardType === "small_cover_v9") {
																let blockUpLiveList = Settings?.Detail?.blockUpLiveList;
																if (typeof blockUpLiveList === "number") {
																	blockUpLiveList = blockUpLiveList.toString();
																}
																if (blockUpLiveList?.includes(item?.args?.up_id?.toString())) {
																	log(`🎉 屏蔽Up主<${item?.args?.up_name}>直播推广`);
																	await fixPosition().then(result => (item = result)); //小广告补位
																}
															} else if (cardType === "cm_v2" && ["ad_player", "ad_inline_3d", "ad_inline_eggs", "ad_inline_live"].includes(cardGoto)) {
																log(`🎉 ${cardGoto}广告去除`);
																return undefined; //大广告直接去除
															} else if (cardType === "small_cover_v10" && cardGoto === "game") {
																log("🎉 游戏广告去除");
																if (url.searchParams.get("device") !== "phone") {
																	return undefined; //pad直接去除
																} else {
																	await fixPosition().then(result => (item = result)); //小广告补位
																}
															} else if (cardType === "cm_double_v9" && cardGoto === "ad_inline_av") {
																log("🎉 大视频广告去除");
																return undefined; //大广告直接去除
															} else if (Goto === "vertical_av") {
																switch (Settings?.Detail?.vertical) {
																	case true:
																	default:
																		log("🎉 竖屏视频去除");
																		await fixPosition().then(result => (item = result)); //小视频补位
																		break;
																	case false:
																		log("🚧 用户设置推荐页竖屏视频不去除");
																		break;
																}
															}
														}
														return item;
													}),
												);
												body.data.items = body.data.items.filter(fix => fix !== undefined);
											}
											async function fixPosition() {
												let itemsCache = Storage.getItem("@BiliBili.Index.Caches", "");
												let singleItem = {};
												if (itemsCache && itemsCache.length > 0) {
													singleItem = itemsCache.pop();
													log("🎉 推荐页空缺位填充成功");
												} else {
													//重新获取填充位
													const myRequest = {
														url: $request.url,
														headers: $request.heders,
													};
													await fetch(myRequest).then(response => {
														try {
															const body = JSON.parse(response.body || "{}");
															if (body?.code === 0 && body?.message === "0") {
																body.data.items = body.data.items
																	.map(item => {
																		const { card_type: cardType, card_goto: cardGoto, goto: Goto } = item;
																		if (cardType && cardGoto) {
																			if (cardType === "banner_v8" && cardGoto === "banner") {
																				return undefined;
																			} else if (cardType === "cm_v2" && ["ad_web_s", "ad_av", "ad_web_gif", "ad_player", "ad_inline_3d", "ad_inline_eggs", "ad_inline_live"].includes(cardGoto)) {
																				return undefined;
																			} else if (cardType === "small_cover_v10" && cardGoto === "game") {
																				return undefined;
																			} else if (cardType === "cm_double_v9" && cardGoto === "ad_inline_av") {
																				return undefined;
																			} else if (cardType === "large_cover_v9" && cardGoto === "inline_av_v2") {
																				//补位不需要大视频
																				return undefined;
																			} else if (Goto === "vertical_av") {
																				//补位不需要竖屏视频
																				return undefined;
																			}
																		}
																		return item;
																	})
																	.filter(fix => fix !== undefined);
																Storage.setItem("@BiliBili.Index.Caches", body.data.items);
																log("🎉 推荐页缓存数组补充成功");
															} else {
																log("🚧 访问推荐页尝试填补失败");
															}
														} catch (e) {
															logError(e, response);
														}
													});
													itemsCache = Storage.getItem("@BiliBili.Index.Caches", "");
													if (itemsCache.length > 0) {
														singleItem = itemsCache.pop();
														log("🎉 推荐页空缺位填充成功");
													}
												}
												Storage.setItem("@BiliBili.Index.Caches", itemsCache);
												return singleItem;
											}
											break;
										}
										case false:
											log("🚧 用户设置推荐页广告不去除");
											break;
									}
									break;
								case "/x/v2/feed/index/story": // 首页短视频流
									switch (Settings?.Detail?.story) {
										case true:
										default:
											if (body.data?.items) {
												// vertical_live 直播内容
												// vertical_pgc 大会员专享
												log("🎉 首页短视频流广告去除");
												body.data.items = body.data.items.filter(i => !(i.hasOwnProperty("ad_info") || ["vertical_ad_av", "vertical_pgc"].includes(i.card_goto)));
											}
											break;
										case false:
											log("🚧 用户设置首页短视频流广告不去除");
											break;
									}
									break;
								case "/x/v2/search/square": // 搜索页
									switch (Settings?.Detail?.Hot_search) {
										case true:
										default:
											log("🎉 搜索页热搜内容去除");
											body.data = body.data.filter(i => !(i.type === "trending"));
											break;
										case false:
											log("🚧 用户设置搜索页热搜内容不去除");
											break;
									}
									break;
							}
							break;
						case "api.bilibili.com":
						case "api.biliapi.net":
							switch (PATH) {
								case "/pgc/page/bangumi": // 追番页
								case "/pgc/page/cinema/tab": // 观影页
									switch (Settings?.Detail?.cinema) {
										case true:
										default:
											if (body.result?.modules) {
												log("🎉 观影页广告去除");
												body.result.modules.forEach(i => {
													if (i.style.startsWith("banner")) {
														i.items = i.items.filter(j => j.link.includes("play"));
													} else if (i.style.startsWith("function")) {
														i.items = i.items.filter(j => j.blink.startsWith("bilibili"));
													} else if ([241, 1283, 1284, 1441].includes(i.module_id)) {
														i.items = [];
													} else if (i.style.startsWith("tip")) {
														i.items = [];
													}
												});
											}
											break;
										case false:
											log("🚧 用户设置观影页广告不去除");
											break;
									}
									break;
								case "/x/player/wbi/playurl": // UGC-用户生产内容-播放地址
									break;
								case "/x/web-interface/wbi/index/top/feed/rcmd": // web首页
									switch (Settings?.Detail?.feed) {
										case true:
										default:
											log("🎉 首页广告内容去除");
											body.data.item = body.data.item.filter(i => !(i.goto === "ad"));
											break;
										case false:
											log("🚧 用户设置首页广告不去除");
											break;
									}
									break;
							}
							break;
						case "api.live.bilibili.com":
							switch (PATH) {
								case "/xlive/app-room/v1/index/getInfoByRoom": // 直播
									switch (Settings?.Detail?.xlive) {
										case true:
										default:
											log("🎉 直播banner广告去除");
											delete body.data?.activity_banner_info;
											if (body.data?.shopping_info) {
												body.data.shopping_info = {
													is_show: 0,
												};
												log("🎉 直播购物广告去除");
											}
											if (body.data?.new_tab_info?.outer_list?.length > 0) {
												body.data.new_tab_info.outer_list = body.data.new_tab_info.outer_list.filter(i => i.biz_id !== 33);
											}
											break;
										case false:
											log("🚧 用户设置直播页广告不去除");
											break;
									}
									break;
							}
							break;
					}
					$response.body = JSON.stringify(body);
					break;
				case "application/protobuf":
				case "application/x-protobuf":
				case "application/vnd.google.protobuf":
				case "application/grpc":
				case "application/grpc+proto":
				case "applecation/octet-stream": {
					//log(`🚧 $response.body: ${JSON.stringify($response.body)}`, "");
					let rawBody = $platform === "Quantumult X" ? new Uint8Array($response.bodyBytes ?? []) : ($response.body ?? new Uint8Array());
					//log(`🚧 isBuffer? ${ArrayBuffer.isView(rawBody)}: ${JSON.stringify(rawBody)}`, "");
					switch (FORMAT) {
						case "application/protobuf":
						case "application/x-protobuf":
						case "application/vnd.google.protobuf":
							break;
						case "application/grpc":
						case "application/grpc+proto":
							rawBody = gRPC.decode(rawBody);
							// 解析链接并处理protobuf数据
							// 主机判断
							switch (HOST) {
								case "grpc.biliapi.net": // HTTP/2
								case "app.biliapi.net": // HTTP/1.1
								case "app.bilibili.com": // HTTP/1.1
									switch (PATHs?.[0]) {
										case "bilibili.app.playurl.v1.PlayURL": // 投稿视频
											switch (PATHs?.[1]) {
												case "PlayView": { // 播放地址
													/******************  initialization start  *******************/
													// protobuf/bilibili/app/playurl/playurl.proto
													/*
													class PlayViewReply$Type extends MessageType {
														constructor() {
															super("PlayViewReply", [{ no: 5, name: "play_arc", kind: "message", T: () => PlayArcConf }]);
														}
														create(value) {
															const message = {};
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 5:
																		message.playArc = PlayArcConf.internalBinaryRead(reader, reader.uint32(), options, message.playArc);
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															if (message.playArc) PlayArcConf.internalBinaryWrite(message.playArc, writer.tag(5, WireType.LengthDelimited).fork(), options).join();
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const PlayViewReply = new PlayViewReply$Type();
													class PlayArcConf$Type extends MessageType {
														constructor() {
															super("PlayArcConf", [{ no: 1, name: "background_play_conf", kind: "message", T: () => ArcConf }]);
														}
														create(value) {
															const message = {};
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 1:
																		message.backgroundPlayConf = ArcConf.internalBinaryRead(reader, reader.uint32(), options, message.backgroundPlayConf);
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															if (message.backgroundPlayConf) ArcConf.internalBinaryWrite(message.backgroundPlayConf, writer.tag(1, WireType.LengthDelimited).fork(), options).join();
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const PlayArcConf = new PlayArcConf$Type();
													class ArcConf$Type extends MessageType {
														constructor() {
															super("ArcConf", [
																{ no: 1, name: "is_support", kind: "scalar", T: 8 },
																{ no: 2, name: "disabled", kind: "scalar", T: 8 },
																{ no: 3, name: "extra_content", kind: "message", T: () => ExtraContent },
															]);
														}
														create(value) {
															const message = { isSupport: false, disabled: false };
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 1:
																		message.isSupport = reader.bool();
																		break;
																	case 2:
																		message.disabled = reader.bool();
																		break;
																	case 3:
																		message.extraContent = ExtraContent.internalBinaryRead(reader, reader.uint32(), options, message.extraContent);
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															if (message.isSupport !== false) writer.tag(1, WireType.Varint).bool(message.isSupport);
															if (message.disabled !== false) writer.tag(2, WireType.Varint).bool(message.disabled);
															if (message.extraContent) ExtraContent.internalBinaryWrite(message.extraContent, writer.tag(3, WireType.LengthDelimited).fork(), options).join();
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const ArcConf = new ArcConf$Type();
													class ExtraContent$Type extends MessageType {
														constructor() {
															super("ExtraContent", [
																{ no: 1, name: "disabled_reason", kind: "scalar", T: 9 },
																{ no: 2, name: "disabled_code", kind: "scalar", T: 3, L: 0 },
															]);
														}
														create(value) {
															const message = { disabledReason: "", disabledCode: 0n };
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 1:
																		message.disabledReason = reader.string();
																		break;
																	case 2:
																		message.disabledCode = reader.int64().toBigInt();
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															if (message.disabledReason !== "") writer.tag(1, WireType.LengthDelimited).string(message.disabledReason);
															if (message.disabledCode !== 0n) writer.tag(2, WireType.Varint).int64(message.disabledCode);
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const ExtraContent = new ExtraContent$Type();
													*/
													/******************  initialization finish  ******************/
													body = PlayViewReply.fromBinary(rawBody);
													const oldBackgroundConf = body.playArc?.backgroundPlayConf;
													if (oldBackgroundConf && (!oldBackgroundConf.isSupport || oldBackgroundConf.disabled)) {
														log("🎉 后台播放限制去除");
														body.playArc.backgroundPlayConf.isSupport = true;
														body.playArc.backgroundPlayConf.disabled = false;
														body.playArc.backgroundPlayConf.extraContent = null;
													} else {
														log("🚧 无后台播放限制");
													}
													rawBody = PlayViewReply.toBinary(body);
													break;
												}
												case "PlayConf": // 播放配置
													break;
											}
											break;
										case "bilibili.app.dynamic.v2.Dynamic": // 动态
											/******************  initialization start  *******************/
											// protobuf/bilibili/app/dynamic/dynamic.proto
											/*
											var DynamicType;
											(function (DynamicType) {
												DynamicType[(DynamicType["dyn_none"] = 0)] = "dyn_none";
												DynamicType[(DynamicType["ad"] = 15)] = "ad";
											})(DynamicType || (DynamicType = {}));
											class DynAllReply$Type extends MessageType {
												constructor() {
													super("DynAllReply", [
														{ no: 1, name: "dynamic_list", kind: "message", T: () => DynamicList },
														{ no: 2, name: "up_list", kind: "message", T: () => CardVideoUpList },
														{ no: 3, name: "topic_list", kind: "message", T: () => TopicList },
													]);
												}
												create(value) {
													const message = {};
													globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
													if (value !== undefined) reflectionMergePartial(this, message, value);
													return message;
												}
												internalBinaryRead(reader, length, options, target) {
													let message = target ?? this.create(),
														end = reader.pos + length;
													while (reader.pos < end) {
														let [fieldNo, wireType] = reader.tag();
														switch (fieldNo) {
															case 1:
																message.dynamicList = DynamicList.internalBinaryRead(reader, reader.uint32(), options, message.dynamicList);
																break;
															case 2:
																message.upList = CardVideoUpList.internalBinaryRead(reader, reader.uint32(), options, message.upList);
																break;
															case 3:
																message.topicList = TopicList.internalBinaryRead(reader, reader.uint32(), options, message.topicList);
																break;
															default:
																let u = options.readUnknownField;
																if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																let d = reader.skip(wireType);
																if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
														}
													}
													return message;
												}
												internalBinaryWrite(message, writer, options) {
													if (message.dynamicList) DynamicList.internalBinaryWrite(message.dynamicList, writer.tag(1, WireType.LengthDelimited).fork(), options).join();
													if (message.upList) CardVideoUpList.internalBinaryWrite(message.upList, writer.tag(2, WireType.LengthDelimited).fork(), options).join();
													if (message.topicList) TopicList.internalBinaryWrite(message.topicList, writer.tag(3, WireType.LengthDelimited).fork(), options).join();
													let u = options.writeUnknownFields;
													if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
													return writer;
												}
											}
											const DynAllReply = new DynAllReply$Type();
											class DynVideoReply$Type extends MessageType {
												constructor() {
													super("DynVideoReply", [{ no: 2, name: "video_up_list", kind: "message", T: () => CardVideoUpList }]);
												}
												create(value) {
													const message = {};
													globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
													if (value !== undefined) reflectionMergePartial(this, message, value);
													return message;
												}
												internalBinaryRead(reader, length, options, target) {
													let message = target ?? this.create(),
														end = reader.pos + length;
													while (reader.pos < end) {
														let [fieldNo, wireType] = reader.tag();
														switch (fieldNo) {
															case 2:
																message.videoUpList = CardVideoUpList.internalBinaryRead(reader, reader.uint32(), options, message.videoUpList);
																break;
															default:
																let u = options.readUnknownField;
																if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																let d = reader.skip(wireType);
																if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
														}
													}
													return message;
												}
												internalBinaryWrite(message, writer, options) {
													if (message.videoUpList) CardVideoUpList.internalBinaryWrite(message.videoUpList, writer.tag(2, WireType.LengthDelimited).fork(), options).join();
													let u = options.writeUnknownFields;
													if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
													return writer;
												}
											}
											const DynVideoReply = new DynVideoReply$Type();
											class DynamicList$Type extends MessageType {
												constructor() {
													super("DynamicList", [{ no: 1, name: "list", kind: "message", repeat: 1, T: () => DynamicItem }]);
												}
												create(value) {
													const message = { list: [] };
													globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
													if (value !== undefined) reflectionMergePartial(this, message, value);
													return message;
												}
												internalBinaryRead(reader, length, options, target) {
													let message = target ?? this.create(),
														end = reader.pos + length;
													while (reader.pos < end) {
														let [fieldNo, wireType] = reader.tag();
														switch (fieldNo) {
															case 1:
																message.list.push(DynamicItem.internalBinaryRead(reader, reader.uint32(), options));
																break;
															default:
																let u = options.readUnknownField;
																if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																let d = reader.skip(wireType);
																if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
														}
													}
													return message;
												}
												internalBinaryWrite(message, writer, options) {
													for (let i = 0; i < message.list.length; i++) DynamicItem.internalBinaryWrite(message.list[i], writer.tag(1, WireType.LengthDelimited).fork(), options).join();
													let u = options.writeUnknownFields;
													if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
													return writer;
												}
											}
											const DynamicList = new DynamicList$Type();
											class CardVideoUpList$Type extends MessageType {
												constructor() {
													super("CardVideoUpList", [{ no: 1, name: "title", kind: "scalar", T: 9 }]);
												}
												create(value) {
													const message = { title: "" };
													globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
													if (value !== undefined) reflectionMergePartial(this, message, value);
													return message;
												}
												internalBinaryRead(reader, length, options, target) {
													let message = target ?? this.create(),
														end = reader.pos + length;
													while (reader.pos < end) {
														let [fieldNo, wireType] = reader.tag();
														switch (fieldNo) {
															case 1:
																message.title = reader.string();
																break;
															default:
																let u = options.readUnknownField;
																if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																let d = reader.skip(wireType);
																if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
														}
													}
													return message;
												}
												internalBinaryWrite(message, writer, options) {
													if (message.title !== "") writer.tag(1, WireType.LengthDelimited).string(message.title);
													let u = options.writeUnknownFields;
													if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
													return writer;
												}
											}
											const CardVideoUpList = new CardVideoUpList$Type();
											class TopicList$Type extends MessageType {
												constructor() {
													super("TopicList", [{ no: 1, name: "title", kind: "scalar", T: 9 }]);
												}
												create(value) {
													const message = { title: "" };
													globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
													if (value !== undefined) reflectionMergePartial(this, message, value);
													return message;
												}
												internalBinaryRead(reader, length, options, target) {
													let message = target ?? this.create(),
														end = reader.pos + length;
													while (reader.pos < end) {
														let [fieldNo, wireType] = reader.tag();
														switch (fieldNo) {
															case 1:
																message.title = reader.string();
																break;
															default:
																let u = options.readUnknownField;
																if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																let d = reader.skip(wireType);
																if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
														}
													}
													return message;
												}
												internalBinaryWrite(message, writer, options) {
													if (message.title !== "") writer.tag(1, WireType.LengthDelimited).string(message.title);
													let u = options.writeUnknownFields;
													if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
													return writer;
												}
											}
											const TopicList = new TopicList$Type();
											class DynamicItem$Type extends MessageType {
												constructor() {
													super("DynamicItem", [{ no: 1, name: "card_type", kind: "enum", T: () => ["DynamicType", DynamicType] }]);
												}
												create(value) {
													const message = { cardType: 0 };
													globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
													if (value !== undefined) reflectionMergePartial(this, message, value);
													return message;
												}
												internalBinaryRead(reader, length, options, target) {
													let message = target ?? this.create(),
														end = reader.pos + length;
													while (reader.pos < end) {
														let [fieldNo, wireType] = reader.tag();
														switch (fieldNo) {
															case 1:
																message.cardType = reader.int32();
																break;
															default:
																let u = options.readUnknownField;
																if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																let d = reader.skip(wireType);
																if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
														}
													}
													return message;
												}
												internalBinaryWrite(message, writer, options) {
													if (message.cardType !== 0) writer.tag(1, WireType.Varint).int32(message.cardType);
													let u = options.writeUnknownFields;
													if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
													return writer;
												}
											}
											const DynamicItem = new DynamicItem$Type();
											/******************  initialization finish  ******************/
											switch (PATHs?.[1]) {
												case "DynAll": // 动态综合页
													body = DynAllReply.fromBinary(rawBody);
													switch (Settings?.Detail?.Hot_topics) {
														case true:
														default:
															log("🎉 动态综合页热门话题去除");
															body.topicList = undefined;
															break;
														case false:
															log("🚧 用户设置动态综合页热门话题不去除");
															break;
													}
													switch (Settings?.Detail?.Most_visited) {
														case true:
														default:
															log("🎉 动态综合页最常访问去除");
															body.upList = undefined;
															break;
														case false:
															log("🚧 用户设置动态综合页最常访问不去除");
															break;
													}
													switch (Settings?.Detail?.Dynamic_adcard) {
														case true:
														default:
															if (body.dynamicList?.list?.length) {
																body.dynamicList.list = body.dynamicList.list.filter(item => {
																	if (item.cardType === 15) {
																		log("🎉 动态综合页广告动态去除");
																		return false;
																	} else return true;
																});
															}
															break;
														case false:
															log("🚧 用户设置动态综合页广告动态不去除");
															break;
													}
													rawBody = DynAllReply.toBinary(body);
													break;
												case "DynVideo": // 动态视频页
													body = DynVideoReply.fromBinary(rawBody);
													switch (Settings?.Detail?.Most_visited) {
														case true:
														default:
															log("🎉 动态视频页最常访问去除");
															body.videoUpList = undefined;
															break;
														case false:
															log("🚧 用户设置动态视频页最常访问不去除");
															break;
													}
													rawBody = DynVideoReply.toBinary(body);
													break;
											}
											break;
										case "bilibili.app.view.v1.View": // 视频
											switch (PATHs?.[1]) {
												case "View": // 视频播放页
													/******************  initialization start  *******************/
													// protobuf/bilibili/app/view/view.proto
													/*
													class ViewReply$Type extends MessageType {
														constructor() {
															super("ViewReply", [
																{ no: 6, name: "t_icon", kind: "map", K: 9, V: { kind: "message", T: () => TIcon } },
																{ no: 10, name: "relates", kind: "message", repeat: 1, T: () => Relate },
																{ no: 30, name: "cms", kind: "message", repeat: 1, T: () => CM },
																{ no: 31, name: "cm_config", kind: "message", T: () => CMConfig },
																{ no: 41, name: "cm_ipad", kind: "message", T: () => CmIpad },
															]);
														}
														create(value) {
															const message = { tIcon: {}, relates: [], cms: [] };
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 6:
																		this.binaryReadMap6(message.tIcon, reader, options);
																		break;
																	case 10:
																		message.relates.push(Relate.internalBinaryRead(reader, reader.uint32(), options));
																		break;
																	case 30:
																		message.cms.push(CM.internalBinaryRead(reader, reader.uint32(), options));
																		break;
																	case 31:
																		message.cmConfig = CMConfig.internalBinaryRead(reader, reader.uint32(), options, message.cmConfig);
																		break;
																	case 41:
																		message.cmIpad = CmIpad.internalBinaryRead(reader, reader.uint32(), options, message.cmIpad);
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														binaryReadMap6(map, reader, options) {
															let len = reader.uint32(),
																end = reader.pos + len,
																key,
																val;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 1:
																		key = reader.string();
																		break;
																	case 2:
																		val = TIcon.internalBinaryRead(reader, reader.uint32(), options);
																		break;
																	default:
																		throw new globalThis.Error("unknown map entry field for field ViewReply.t_icon");
																}
															}
															map[key ?? ""] = val ?? TIcon.create();
														}
														internalBinaryWrite(message, writer, options) {
															for (let k of Object.keys(message.tIcon)) {
																writer.tag(6, WireType.LengthDelimited).fork().tag(1, WireType.LengthDelimited).string(k);
																writer.tag(2, WireType.LengthDelimited).fork();
																TIcon.internalBinaryWrite(message.tIcon[k], writer, options);
																writer.join().join();
															}
															for (let i = 0; i < message.relates.length; i++) Relate.internalBinaryWrite(message.relates[i], writer.tag(10, WireType.LengthDelimited).fork(), options).join();
															for (let i = 0; i < message.cms.length; i++) CM.internalBinaryWrite(message.cms[i], writer.tag(30, WireType.LengthDelimited).fork(), options).join();
															if (message.cmConfig) CMConfig.internalBinaryWrite(message.cmConfig, writer.tag(31, WireType.LengthDelimited).fork(), options).join();
															if (message.cmIpad) CmIpad.internalBinaryWrite(message.cmIpad, writer.tag(41, WireType.LengthDelimited).fork(), options).join();
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const ViewReply = new ViewReply$Type();
													class CMConfig$Type extends MessageType {
														constructor() {
															super("CMConfig", [{ no: 1, name: "ads_control", kind: "message", T: () => Any }]);
														}
														create(value) {
															const message = {};
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 1:
																		message.adsControl = Any.internalBinaryRead(reader, reader.uint32(), options, message.adsControl);
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															if (message.adsControl) Any.internalBinaryWrite(message.adsControl, writer.tag(1, WireType.LengthDelimited).fork(), options).join();
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const CMConfig = new CMConfig$Type();
													class CmIpad$Type extends MessageType {
														constructor() {
															super("CmIpad", [{ no: 5, name: "aid", kind: "scalar", T: 3, L: 0 }]);
														}
														create(value) {
															const message = { aid: 0n };
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 5:
																		message.aid = reader.int64().toBigInt();
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															if (message.aid !== 0n) writer.tag(5, WireType.Varint).int64(message.aid);
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const CmIpad = new CmIpad$Type();
													class TIcon$Type extends MessageType {
														constructor() {
															super("TIcon", [{ no: 1, name: "icon", kind: "scalar", T: 9 }]);
														}
														create(value) {
															const message = { icon: "" };
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 1:
																		message.icon = reader.string();
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															if (message.icon !== "") writer.tag(1, WireType.LengthDelimited).string(message.icon);
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const TIcon = new TIcon$Type();
													class Relate$Type extends MessageType {
														constructor() {
															super("Relate", [{ no: 28, name: "cm", kind: "message", T: () => CM }]);
														}
														create(value) {
															const message = {};
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 28:
																		message.cm = CM.internalBinaryRead(reader, reader.uint32(), options, message.cm);
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															if (message.cm) CM.internalBinaryWrite(message.cm, writer.tag(28, WireType.LengthDelimited).fork(), options).join();
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const Relate = new Relate$Type();
													/******************  initialization finish  ******************/
													switch (Settings?.Detail?.view) {
														case true:
														default:
															body = ViewReply.fromBinary(rawBody);
															if (body.cms?.length) {
																log("🎉 播放页广告卡片去除");
																body.cms = [];
															}
															if (body.relates?.length) {
																body.relates = body.relates.filter(item => {
																	if (item.cm) {
																		log("🎉 播放页关联推荐广告去除");
																		return false;
																	}
																	return true;
																});
															}
															if (body.cmConfig || body.cmIpad) {
																log("🎉 播放页定制tab去除");
																body.cmConfig = undefined;
																body.cmIpad = undefined;
															}
															for (const i in body.tIcon) {
																if (body.tIcon[i] === null) {
																	// 解决tIcon的null is not an object问题
																	// console.log(`tIconMap:${i}`);
																	delete body.tIcon[i];
																}
															}
															rawBody = ViewReply.toBinary(body);
															break;
														case false:
															log("🚧 用户设置播放页广告不去除");
															break;
													}
													break;
												case "TFInfo":
													/******************  initialization start  *******************/
													// protobuf/bilibili/app/view/view.proto
													/*
													class TFInfoReply$Type extends MessageType {
														constructor() {
															super("TFInfoReply", [
																{ no: 1, name: "tipsId", kind: "scalar", T: 3, L: 0 },
																{ no: 2, name: "tfToast", kind: "message", T: () => TFToast },
																{ no: 3, name: "tfPanelCustomized", kind: "message", T: () => TFPanelCustomized },
															]);
														}
														create(value) {
															const message = { tipsId: 0n };
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 1:
																		message.tipsId = reader.int64().toBigInt();
																		break;
																	case 2:
																		message.tfToast = TFToast.internalBinaryRead(reader, reader.uint32(), options, message.tfToast);
																		break;
																	case 3:
																		message.tfPanelCustomized = TFPanelCustomized.internalBinaryRead(reader, reader.uint32(), options, message.tfPanelCustomized);
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															if (message.tipsId !== 0n) writer.tag(1, WireType.Varint).int64(message.tipsId);
															if (message.tfToast) TFToast.internalBinaryWrite(message.tfToast, writer.tag(2, WireType.LengthDelimited).fork(), options).join();
															if (message.tfPanelCustomized) TFPanelCustomized.internalBinaryWrite(message.tfPanelCustomized, writer.tag(3, WireType.LengthDelimited).fork(), options).join();
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const TFInfoReply = new TFInfoReply$Type();
													class TFToast$Type extends MessageType {
														constructor() {
															super("TFToast", [{ no: 1, name: "btnText", kind: "scalar", T: 9 }]);
														}
														create(value) {
															const message = { btnText: "" };
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 1:
																		message.btnText = reader.string();
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															if (message.btnText !== "") writer.tag(1, WireType.LengthDelimited).string(message.btnText);
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const TFToast = new TFToast$Type();
													class TFPanelCustomized$Type extends MessageType {
														constructor() {
															super("TFPanelCustomized", [{ no: 2, name: "rightBtnText", kind: "scalar", T: 9 }]);
														}
														create(value) {
															const message = { rightBtnText: "" };
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 2:
																		message.rightBtnText = reader.string();
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															if (message.rightBtnText !== "") writer.tag(2, WireType.LengthDelimited).string(message.rightBtnText);
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const TFPanelCustomized = new TFPanelCustomized$Type();
													/******************  initialization finish  ******************/
													body = TFInfoReply.fromBinary(rawBody);
													log(body.tipsId);
													if (body?.tipsId) {
														log("🎉 播放页办卡免流广告去除");
														body.tfToast = undefined;
														body.tfPanelCustomized = undefined;
													}
													rawBody = TFInfoReply.toBinary(body);
													break;
											}
											break;
										case "bilibili.app.viewunite.v1.View": // 视频(内测)
											switch (PATHs?.[1]) {
												/******************  initialization start  *******************/
												// protobuf/bilibili/app/viewunite/viewunite.proto
												/*
												class ViewReply$Type extends MessageType {
													constructor() {
														super("bilibili.app.viewunite.v1.ViewReply", [
															{ no: 5, name: "tab", kind: "message", T: () => Tab },
															{ no: 7, name: "cm", kind: "message", T: () => CM },
														]);
													}
													create(value) {
														const message = {};
														globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
														if (value !== undefined) reflectionMergePartial(this, message, value);
														return message;
													}
													internalBinaryRead(reader, length, options, target) {
														let message = target ?? this.create(),
															end = reader.pos + length;
														while (reader.pos < end) {
															let [fieldNo, wireType] = reader.tag();
															switch (fieldNo) {
																case 5:
																	message.tab = Tab.internalBinaryRead(reader, reader.uint32(), options, message.tab);
																	break;
																case 7:
																	message.cm = CM.internalBinaryRead(reader, reader.uint32(), options, message.cm);
																	break;
																default:
																	let u = options.readUnknownField;
																	if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																	let d = reader.skip(wireType);
																	if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
															}
														}
														return message;
													}
													internalBinaryWrite(message, writer, options) {
														if (message.tab) Tab.internalBinaryWrite(message.tab, writer.tag(5, WireType.LengthDelimited).fork(), options).join();
														if (message.cm) CM.internalBinaryWrite(message.cm, writer.tag(7, WireType.LengthDelimited).fork(), options).join();
														let u = options.writeUnknownFields;
														if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
														return writer;
													}
												}
												const ViewReply = new ViewReply$Type();
												class Tab$Type extends MessageType {
													constructor() {
														super("bilibili.app.viewunite.v1.Tab", [{ no: 1, name: "tab_module", kind: "message", repeat: 1, T: () => TabModule }]);
													}
													create(value) {
														const message = { tabModule: [] };
														globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
														if (value !== undefined) reflectionMergePartial(this, message, value);
														return message;
													}
													internalBinaryRead(reader, length, options, target) {
														let message = target ?? this.create(),
															end = reader.pos + length;
														while (reader.pos < end) {
															let [fieldNo, wireType] = reader.tag();
															switch (fieldNo) {
																case 1:
																	message.tabModule.push(TabModule.internalBinaryRead(reader, reader.uint32(), options));
																	break;
																default:
																	let u = options.readUnknownField;
																	if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																	let d = reader.skip(wireType);
																	if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
															}
														}
														return message;
													}
													internalBinaryWrite(message, writer, options) {
														for (let i = 0; i < message.tabModule.length; i++) TabModule.internalBinaryWrite(message.tabModule[i], writer.tag(1, WireType.LengthDelimited).fork(), options).join();
														let u = options.writeUnknownFields;
														if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
														return writer;
													}
												}
												const Tab = new Tab$Type();
												class TabModule$Type extends MessageType {
													constructor() {
														super("bilibili.app.viewunite.v1.TabModule", [{ no: 2, name: "introduction", kind: "message", oneof: "tab", T: () => IntroductionTab }]);
													}
													create(value) {
														const message = { tab: { oneofKind: undefined } };
														globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
														if (value !== undefined) reflectionMergePartial(this, message, value);
														return message;
													}
													internalBinaryRead(reader, length, options, target) {
														let message = target ?? this.create(),
															end = reader.pos + length;
														while (reader.pos < end) {
															let [fieldNo, wireType] = reader.tag();
															switch (fieldNo) {
																case 2:
																	message.tab = { oneofKind: "introduction", introduction: IntroductionTab.internalBinaryRead(reader, reader.uint32(), options, message.tab.introduction) };
																	break;
																default:
																	let u = options.readUnknownField;
																	if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																	let d = reader.skip(wireType);
																	if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
															}
														}
														return message;
													}
													internalBinaryWrite(message, writer, options) {
														if (message.tab.oneofKind === "introduction") IntroductionTab.internalBinaryWrite(message.tab.introduction, writer.tag(2, WireType.LengthDelimited).fork(), options).join();
														let u = options.writeUnknownFields;
														if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
														return writer;
													}
												}
												const TabModule = new TabModule$Type();
												class IntroductionTab$Type extends MessageType {
													constructor() {
														super("bilibili.app.viewunite.v1.IntroductionTab", [{ no: 2, name: "modules", kind: "message", repeat: 1, T: () => Module }]);
													}
													create(value) {
														const message = { modules: [] };
														globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
														if (value !== undefined) reflectionMergePartial(this, message, value);
														return message;
													}
													internalBinaryRead(reader, length, options, target) {
														let message = target ?? this.create(),
															end = reader.pos + length;
														while (reader.pos < end) {
															let [fieldNo, wireType] = reader.tag();
															switch (fieldNo) {
																case 2:
																	message.modules.push(Module.internalBinaryRead(reader, reader.uint32(), options));
																	break;
																default:
																	let u = options.readUnknownField;
																	if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																	let d = reader.skip(wireType);
																	if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
															}
														}
														return message;
													}
													internalBinaryWrite(message, writer, options) {
														for (let i = 0; i < message.modules.length; i++) Module.internalBinaryWrite(message.modules[i], writer.tag(2, WireType.LengthDelimited).fork(), options).join();
														let u = options.writeUnknownFields;
														if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
														return writer;
													}
												}
												const IntroductionTab = new IntroductionTab$Type();
												class Module$Type extends MessageType {
													constructor() {
														super("bilibili.app.viewunite.v1.Module", [
															{ no: 1, name: "type", kind: "scalar", T: 5 },
															{ no: 22, name: "relates", kind: "message", oneof: "data", T: () => Relates },
														]);
													}
													create(value) {
														const message = { type: 0, data: { oneofKind: undefined } };
														globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
														if (value !== undefined) reflectionMergePartial(this, message, value);
														return message;
													}
													internalBinaryRead(reader, length, options, target) {
														let message = target ?? this.create(),
															end = reader.pos + length;
														while (reader.pos < end) {
															let [fieldNo, wireType] = reader.tag();
															switch (fieldNo) {
																case 1:
																	message.type = reader.int32();
																	break;
																case 22:
																	message.data = { oneofKind: "relates", relates: Relates.internalBinaryRead(reader, reader.uint32(), options, message.data.relates) };
																	break;
																default:
																	let u = options.readUnknownField;
																	if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																	let d = reader.skip(wireType);
																	if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
															}
														}
														return message;
													}
													internalBinaryWrite(message, writer, options) {
														if (message.type !== 0) writer.tag(1, WireType.Varint).int32(message.type);
														if (message.data.oneofKind === "relates") Relates.internalBinaryWrite(message.data.relates, writer.tag(22, WireType.LengthDelimited).fork(), options).join();
														let u = options.writeUnknownFields;
														if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
														return writer;
													}
												}
												const Module = new Module$Type();
												class Relates$Type extends MessageType {
													constructor() {
														super("bilibili.app.viewunite.v1.Relates", [{ no: 1, name: "cards", kind: "message", repeat: 1, T: () => RelateCard }]);
													}
													create(value) {
														const message = { cards: [] };
														globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
														if (value !== undefined) reflectionMergePartial(this, message, value);
														return message;
													}
													internalBinaryRead(reader, length, options, target) {
														let message = target ?? this.create(),
															end = reader.pos + length;
														while (reader.pos < end) {
															let [fieldNo, wireType] = reader.tag();
															switch (fieldNo) {
																case 1:
																	message.cards.push(RelateCard.internalBinaryRead(reader, reader.uint32(), options));
																	break;
																default:
																	let u = options.readUnknownField;
																	if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																	let d = reader.skip(wireType);
																	if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
															}
														}
														return message;
													}
													internalBinaryWrite(message, writer, options) {
														for (let i = 0; i < message.cards.length; i++) RelateCard.internalBinaryWrite(message.cards[i], writer.tag(1, WireType.LengthDelimited).fork(), options).join();
														let u = options.writeUnknownFields;
														if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
														return writer;
													}
												}
												const Relates = new Relates$Type();
												class RelateCard$Type extends MessageType {
													constructor() {
														super("bilibili.app.viewunite.v1.RelateCard", [{ no: 1, name: "relate_card_type", kind: "scalar", T: 5 }]);
													}
													create(value) {
														const message = { relateCardType: 0 };
														globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
														if (value !== undefined) reflectionMergePartial(this, message, value);
														return message;
													}
													internalBinaryRead(reader, length, options, target) {
														let message = target ?? this.create(),
															end = reader.pos + length;
														while (reader.pos < end) {
															let [fieldNo, wireType] = reader.tag();
															switch (fieldNo) {
																case 1:
																	message.relateCardType = reader.int32();
																	break;
																default:
																	let u = options.readUnknownField;
																	if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																	let d = reader.skip(wireType);
																	if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
															}
														}
														return message;
													}
													internalBinaryWrite(message, writer, options) {
														if (message.relateCardType !== 0) writer.tag(1, WireType.Varint).int32(message.relateCardType);
														let u = options.writeUnknownFields;
														if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
														return writer;
													}
												}
												const RelateCard = new RelateCard$Type();
												class CM$Type extends MessageType {
													constructor() {
														super("bilibili.app.viewunite.v1.CM", [{ no: 3, name: "source_content", kind: "message", repeat: 1, T: () => Any }]);
													}
													create(value) {
														const message = { sourceContent: [] };
														globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
														if (value !== undefined) reflectionMergePartial(this, message, value);
														return message;
													}
													internalBinaryRead(reader, length, options, target) {
														let message = target ?? this.create(),
															end = reader.pos + length;
														while (reader.pos < end) {
															let [fieldNo, wireType] = reader.tag();
															switch (fieldNo) {
																case 3:
																	message.sourceContent.push(Any.internalBinaryRead(reader, reader.uint32(), options));
																	break;
																default:
																	let u = options.readUnknownField;
																	if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																	let d = reader.skip(wireType);
																	if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
															}
														}
														return message;
													}
													internalBinaryWrite(message, writer, options) {
														for (let i = 0; i < message.sourceContent.length; i++) Any.internalBinaryWrite(message.sourceContent[i], writer.tag(3, WireType.LengthDelimited).fork(), options).join();
														let u = options.writeUnknownFields;
														if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
														return writer;
													}
												}
												const CM = new CM$Type();
												class RelatesFeedReply$Type extends MessageType {
													constructor() {
														super("bilibili.app.viewunite.v1.RelatesFeedReply", [{ no: 1, name: "relates", kind: "message", repeat: 1, T: () => RelateCard }]);
													}
													create(value) {
														const message = { relates: [] };
														globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
														if (value !== undefined) reflectionMergePartial(this, message, value);
														return message;
													}
													internalBinaryRead(reader, length, options, target) {
														let message = target ?? this.create(),
															end = reader.pos + length;
														while (reader.pos < end) {
															let [fieldNo, wireType] = reader.tag();
															switch (fieldNo) {
																case 1:
																	message.relates.push(RelateCard.internalBinaryRead(reader, reader.uint32(), options));
																	break;
																default:
																	let u = options.readUnknownField;
																	if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
																	let d = reader.skip(wireType);
																	if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
															}
														}
														return message;
													}
													internalBinaryWrite(message, writer, options) {
														for (let i = 0; i < message.relates.length; i++) RelateCard.internalBinaryWrite(message.relates[i], writer.tag(1, WireType.LengthDelimited).fork(), options).join();
														let u = options.writeUnknownFields;
														if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
														return writer;
													}
												}
												const RelatesFeedReply = new RelatesFeedReply$Type();
												/******************  initialization finish  ******************/
												case "View": // 视频播放页
													switch (Settings?.Detail?.view) {
														case true:
														default:
															body = ViewUniteReply.fromBinary(rawBody);
															if (body.cm?.sourceContent?.length) {
																log("🎉 up主推荐广告去除");
																body.cm.sourceContent = [];
															}
															body.tab.tabModule[0].tab.introduction.modules = body.tab.tabModule[0].tab.introduction.modules.map(i => {
																if (i.type === 28) {
																	log("🎉 视频详情下方推荐卡广告去除");
																	i.data.relates.cards = i.data.relates.cards.filter(j => j.relateCardType !== 5 && j.relateCardType !== 4);
																}
																return i;
															});
															rawBody = ViewUniteReply.toBinary(body);
															break;
														case false:
															log("🚧 用户设置up主推荐广告不去除");
															break;
													}
													break;
												case "RelatesFeed":
													body = RelatesFeedReply.fromBinary(rawBody);
													body.relates = body.relates.filter(item => {
														if (item.relateCardType === 5) {
															log("🎉 推薦列表廣告卡去除");
															return false;
														}
														return true;
													});
													rawBody = RelatesFeedReply.toBinary(body);
													break;
											}
											break;
										case "bilibili.app.interface.v1.Teenagers": // 青少年模式
											switch (PATHs?.[1]) {
												case "ModeStatus": // 青少年模式
													/******************  initialization start  *******************/
													// protobuf/bilibili/app/interface/teenagers.proto
													/*
													class ModeStatus$Type extends MessageType {
														constructor() {
															super("ModeStatus", [{ no: 1, name: "modes", kind: "message", repeat: 1, T: () => Mode }]);
														}
														create(value) {
															const message = { modes: [] };
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 1:
																		message.modes.push(Mode.internalBinaryRead(reader, reader.uint32(), options));
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															for (let i = 0; i < message.modes.length; i++) Mode.internalBinaryWrite(message.modes[i], writer.tag(1, WireType.LengthDelimited).fork(), options).join();
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const ModeStatus = new ModeStatus$Type();
													class Mode$Type extends MessageType {
														constructor() {
															super("Mode", [
																{ no: 2, name: "name", kind: "scalar", T: 9 },
																{ no: 5, name: "f5", kind: "message", T: () => F5 },
															]);
														}
														create(value) {
															const message = { name: "" };
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 2:
																		message.name = reader.string();
																		break;
																	case 5:
																		message.f5 = F5.internalBinaryRead(reader, reader.uint32(), options, message.f5);
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															if (message.name !== "") writer.tag(2, WireType.LengthDelimited).string(message.name);
															if (message.f5) F5.internalBinaryWrite(message.f5, writer.tag(5, WireType.LengthDelimited).fork(), options).join();
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const Mode = new Mode$Type();
													class F5$Type extends MessageType {
														constructor() {
															super("F5", [{ no: 1, name: "f1", kind: "scalar", T: 5 }]);
														}
														create(value) {
															const message = { f1: 0 };
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 1:
																		message.f1 = reader.int32();
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															if (message.f1 !== 0) writer.tag(1, WireType.Varint).int32(message.f1);
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const F5 = new F5$Type();
													/******************  initialization finish  ******************/
													body = ModeStatus.fromBinary(rawBody);
													body.modes = body.modes.map(mode => {
														if (mode?.name === "teenagers") {
															if (mode?.f5?.f1) {
																mode.f5.f1 = 0;
																log("🎉 青少年模式弹窗去除");
															}
														}
														return mode;
													});
													rawBody = ModeStatus.toBinary(body);
													break;
											}
											break;
										case "bilibili.community.service.dm.v1.DM": //弹幕
											/******************  initialization start  *******************/
											// protobuf/bilibili/community/service/dm/dm.proto
											/*
											class CommandDm$Type extends MessageType {
												constructor() {
													super("CommandDm", [{ no: 1, name: "id", kind: "scalar", T: 3, L: 0 }]);
												}
												create(value) {
													const message = { id: 0n };
													globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
													if (value !== undefined) reflectionMergePartial(this, message, value);
													return message;
												}
												internalBinaryRead(reader, length, options, target) {
													let message = target ?? this.create(),
														end = reader.pos + length;
													while (reader.pos < end) {
														let [fieldNo, wireType] = reader.tag();
														switch (fieldNo) {
															case 1:
																message.id = reader.int64().toBigInt();
																break;
															default:
																let u = options.readUnknownField;
																if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																let d = reader.skip(wireType);
																if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
														}
													}
													return message;
												}
												internalBinaryWrite(message, writer, options) {
													if (message.id !== 0n) writer.tag(1, WireType.Varint).int64(message.id);
													let u = options.writeUnknownFields;
													if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
													return writer;
												}
											}
											const CommandDm = new CommandDm$Type();
											class DmView$Type extends MessageType {
												constructor() {
													super("DmView", [{ no: 1, name: "commandDms", kind: "message", repeat: 1, T: () => CommandDm }]);
												}
												create(value) {
													const message = { commandDms: [] };
													globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
													if (value !== undefined) reflectionMergePartial(this, message, value);
													return message;
												}
												internalBinaryRead(reader, length, options, target) {
													let message = target ?? this.create(),
														end = reader.pos + length;
													while (reader.pos < end) {
														let [fieldNo, wireType] = reader.tag();
														switch (fieldNo) {
															case 1:
																message.commandDms.push(CommandDm.internalBinaryRead(reader, reader.uint32(), options));
																break;
															default:
																let u = options.readUnknownField;
																if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																let d = reader.skip(wireType);
																if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
														}
													}
													return message;
												}
												internalBinaryWrite(message, writer, options) {
													for (let i = 0; i < message.commandDms.length; i++) CommandDm.internalBinaryWrite(message.commandDms[i], writer.tag(1, WireType.LengthDelimited).fork(), options).join();
													let u = options.writeUnknownFields;
													if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
													return writer;
												}
											}
											const DmView = new DmView$Type();
											class DmViewReply$Type extends MessageType {
												constructor() {
													super("DmViewReply", [
														{ no: 18, name: "activity_meta", kind: "scalar", repeat: 2, T: 9 },
														{ no: 22, name: "dmView", kind: "message", T: () => DmView },
													]);
												}
												create(value) {
													const message = { activityMeta: [] };
													globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
													if (value !== undefined) reflectionMergePartial(this, message, value);
													return message;
												}
												internalBinaryRead(reader, length, options, target) {
													let message = target ?? this.create(),
														end = reader.pos + length;
													while (reader.pos < end) {
														let [fieldNo, wireType] = reader.tag();
														switch (fieldNo) {
															case 18:
																message.activityMeta.push(reader.string());
																break;
															case 22:
																message.dmView = DmView.internalBinaryRead(reader, reader.uint32(), options, message.dmView);
																break;
															default:
																let u = options.readUnknownField;
																if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																let d = reader.skip(wireType);
																if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
														}
													}
													return message;
												}
												internalBinaryWrite(message, writer, options) {
													if (message.dmView) DmView.internalBinaryWrite(message.dmView, writer.tag(22, WireType.LengthDelimited).fork(), options).join();
													for (let i = 0; i < message.activityMeta.length; i++) writer.tag(18, WireType.LengthDelimited).string(message.activityMeta[i]);
													let u = options.writeUnknownFields;
													if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
													return writer;
												}
											}
											const DmViewReply = new DmViewReply$Type();
											class DmSegMobileReply$Type extends MessageType {
												constructor() {
													super("DmSegMobileReply", [{ no: 1, name: "elems", kind: "message", repeat: 1, T: () => DanmakuElem }]);
												}
												create(value) {
													const message = { elems: [] };
													globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
													if (value !== undefined) reflectionMergePartial(this, message, value);
													return message;
												}
												internalBinaryRead(reader, length, options, target) {
													let message = target ?? this.create(),
														end = reader.pos + length;
													while (reader.pos < end) {
														let [fieldNo, wireType] = reader.tag();
														switch (fieldNo) {
															case 1:
																message.elems.push(DanmakuElem.internalBinaryRead(reader, reader.uint32(), options));
																break;
															default:
																let u = options.readUnknownField;
																if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																let d = reader.skip(wireType);
																if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
														}
													}
													return message;
												}
												internalBinaryWrite(message, writer, options) {
													for (let i = 0; i < message.elems.length; i++) DanmakuElem.internalBinaryWrite(message.elems[i], writer.tag(1, WireType.LengthDelimited).fork(), options).join();
													let u = options.writeUnknownFields;
													if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
													return writer;
												}
											}
											const DmSegMobileReply = new DmSegMobileReply$Type();
											class DanmakuElem$Type extends MessageType {
												constructor() {
													super("DanmakuElem", [{ no: 24, name: "colorful", kind: "scalar", T: 5 }]);
												}
												create(value) {
													const message = { colorful: 0 };
													globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
													if (value !== undefined) reflectionMergePartial(this, message, value);
													return message;
												}
												internalBinaryRead(reader, length, options, target) {
													let message = target ?? this.create(),
														end = reader.pos + length;
													while (reader.pos < end) {
														let [fieldNo, wireType] = reader.tag();
														switch (fieldNo) {
															case 24:
																message.colorful = reader.int32();
																break;
															default:
																let u = options.readUnknownField;
																if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																let d = reader.skip(wireType);
																if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
														}
													}
													return message;
												}
												internalBinaryWrite(message, writer, options) {
													if (message.colorful !== 0) writer.tag(24, WireType.Varint).int32(message.colorful);
													let u = options.writeUnknownFields;
													if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
													return writer;
												}
											}
											const DanmakuElem = new DanmakuElem$Type();
											/******************  initialization finish  ******************/
											switch (PATHs?.[1]) {
												case "DmView": // 弹幕配置
													switch (Settings?.Detail?.commandDms) {
														case true:
															body = DmViewReply.fromBinary(rawBody);
															if (body.dmView?.commandDms?.length) {
																log("🎉 交互式弹幕去除");
																body.dmView.commandDms.length = 0;
															}
															if (body.activityMeta.length) {
																log("🎉 雲視聽水印去除");
																body.activityMeta = [];
															}
															rawBody = DmViewReply.toBinary(body);
															break;
														case false:
														default:
															log("🎉 用户设置交互式弹幕不去除");
															break;
													}
													break;
												case "DmSegMobile": // 弹幕列表
													switch (Settings?.Detail?.colorfulDms) {
														case true:
															body = DmSegMobileReply.fromBinary(rawBody);
															body.elems = body.elems.map(ele => {
																if (ele?.colorful === 60001) {
																	ele.colorful = 0;
																}
																return ele;
															});
															log("🎉 会员弹幕已替换为普通弹幕");
															rawBody = DmSegMobileReply.toBinary(body);
															break;
														case false:
														default:
															log("🎉 用户设置会员弹幕不修改");
															break;
													}
													break;
											}
											break;
										case "bilibili.main.community.reply.v1.Reply": //评论区
											switch (PATHs?.[1]) {
												case "MainList":
													/******************  initialization start  *******************/
													// protobuf/bilibili/main/community/reply/reply.proto
													class MainListReply$Type extends MessageType {
														constructor() {
															super("MainListReply", [{ no: 11, name: "cm", kind: "message", T: () => CM }]);
														}
														create(value) {
															const message = {};
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 11:
																		message.cm = CM.internalBinaryRead(reader, reader.uint32(), options, message.cm);
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															if (message.cm) CM.internalBinaryWrite(message.cm, writer.tag(11, WireType.LengthDelimited).fork(), options).join();
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const MainListReply = new MainListReply$Type();
													/******************  initialization finish  ******************/
													switch (Settings?.Detail?.MainList) {
														case true:
														default:
															body = MainListReply.fromBinary(rawBody);
															log("🎉 评论列表广告去除");
															body.cm = undefined;
															rawBody = MainListReply.toBinary(body);
															break;
														case false:
															log("🎉 用户设置评论列表广告不去除");
															break;
													}
													break;
											}
											break;
										case "bilibili.pgc.gateway.player.v2.PlayURL": // 番剧
											/******************  initialization start  *******************/
											/******************  initialization finish  *******************/
											switch (PATHs?.[1]) {
												case "PlayView": // 播放地址
													/******************  initialization start  *******************/
													/******************  initialization finish  *******************/
													break;
												case "PlayConf": // 播放配置
													break;
											}
											break;
										case "bilibili.app.nativeact.v1.NativeAct": // 活动-节目、动画、韩综（港澳台）
											switch (PATHs?.[1]) {
												case "Index": // 首页
													break;
											}
											break;
										case "bilibili.app.interface.v1.Search": // 搜索框
											switch (PATHs?.[1]) {
												case "Suggest3": // 搜索建议
													break;
											}
											break;
										case "bilibili.polymer.app.search.v1.Search": // 搜索结果
											switch (PATHs?.[1]) {
												case "SearchAll": {
													// 全部结果（综合）
													/******************  initialization start  *******************/
													/*
													class Item$Type extends MessageType {
														constructor() {
															super("bilibili.polymer.app.search.v1.Item", [
																{ no: 11, name: "game", kind: "message", oneof: "cardItem", T: () => SearchGameCard },
																{ no: 25, name: "cm", kind: "message", oneof: "cardItem", T: () => SearchAdCard },
															]);
														}
														create(value) {
															const message = { cardItem: { oneofKind: undefined } };
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 11:
																		message.cardItem = { oneofKind: "game", game: SearchGameCard.internalBinaryRead(reader, reader.uint32(), options, message.cardItem.game) };
																		break;
																	case 25:
																		message.cardItem = { oneofKind: "cm", cm: SearchAdCard.internalBinaryRead(reader, reader.uint32(), options, message.cardItem.cm) };
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															if (message.cardItem.oneofKind === "game") SearchGameCard.internalBinaryWrite(message.cardItem.game, writer.tag(11, WireType.LengthDelimited).fork(), options).join();
															if (message.cardItem.oneofKind === "cm") SearchAdCard.internalBinaryWrite(message.cardItem.cm, writer.tag(25, WireType.LengthDelimited).fork(), options).join();
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const Item = new Item$Type();
													class SearchAdCard$Type extends MessageType {
														constructor() {
															super("bilibili.polymer.app.search.v1.SearchAdCard", [{ no: 1, name: "json_str", kind: "scalar", T: 9 }]);
														}
														create(value) {
															const message = { jsonStr: "" };
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 1:
																		message.jsonStr = reader.string();
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															if (message.jsonStr !== "") writer.tag(1, WireType.LengthDelimited).string(message.jsonStr);
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const SearchAdCard = new SearchAdCard$Type();
													class SearchGameCard$Type extends MessageType {
														constructor() {
															super("bilibili.polymer.app.search.v1.SearchGameCard", [{ no: 1, name: "title", kind: "scalar", T: 9 }]);
														}
														create(value) {
															const message = { title: "" };
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 1:
																		message.title = reader.string();
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															if (message.title !== "") writer.tag(1, WireType.LengthDelimited).string(message.title);
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const SearchGameCard = new SearchGameCard$Type();
													class SearchAllResponse$Type extends MessageType {
														constructor() {
															super("bilibili.polymer.app.search.v1.SearchAllResponse", [{ no: 4, name: "item", kind: "message", repeat: 1, T: () => Item }]);
														}
														create(value) {
															const message = { item: [] };
															globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
															if (value !== undefined) reflectionMergePartial(this, message, value);
															return message;
														}
														internalBinaryRead(reader, length, options, target) {
															let message = target ?? this.create(),
																end = reader.pos + length;
															while (reader.pos < end) {
																let [fieldNo, wireType] = reader.tag();
																switch (fieldNo) {
																	case 4:
																		message.item.push(Item.internalBinaryRead(reader, reader.uint32(), options));
																		break;
																	default:
																		let u = options.readUnknownField;
																		if (u === "throw") throw new globalThis.Error(`Unknown field ${fieldNo}(wire type ${wireType})for ${this.typeName}`);
																		let d = reader.skip(wireType);
																		if (u !== false) (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
																}
															}
															return message;
														}
														internalBinaryWrite(message, writer, options) {
															for (let i = 0; i < message.item.length; i++) Item.internalBinaryWrite(message.item[i], writer.tag(4, WireType.LengthDelimited).fork(), options).join();
															let u = options.writeUnknownFields;
															if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
															return writer;
														}
													}
													const SearchAllResponse = new SearchAllResponse$Type();
													/******************  initialization finish  *******************/
													switch (Settings?.Detail?.search) {
														case true:
														default:
															body = SearchAllResponse.fromBinary(rawBody);
															log("🎉 搜索页广告去除");
															body.item = body.item.filter(i => !(i.cardItem?.oneofKind === "cm" || i.cardItem?.oneofKind === "game"));
															rawBody = SearchAllResponse.toBinary(body);
															break;
														case false:
															log("🚧 用户设置搜索页广告不去除");
															break;
													}
													break;
												}
												case "SearchByType": {
													// 分类结果（番剧、用户、影视、专栏）
													break;
												}
											}
											break;
									}
									break;
							}
							rawBody = gRPC.encode(rawBody);
							break;
					}
					// 写入二进制数据
					$response.body = rawBody;
					break;
				}
			}
			break;
		}
		case false:
			break;
	}
})()
	.catch(e => logError(e))
	.finally(() => done($response));
