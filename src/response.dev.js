import { $platform, Lodash as _, Storage, gRPC, fetch, notification, log, logError, wait, done } from "@nsnanocat/util";
import database from "./function/database.mjs";
import setENV from "./function/setENV.mjs";
import { PlayViewReply } from "./protobuf/bilibili/pgc/gateway/player/v2/playurl.js";
import { DynAllReply, DynVideoReply } from "./protobuf/bilibili/app/dynamic/v2/dynamic.js";
import { ViewReply, TFPanelCustomized } from "./protobuf/bilibili/app/view/v1/view.js";
import { ViewReply as ViewUniteReply, RelatesFeedReply } from "./protobuf/bilibili/app/viewunite/v1/viewunite.js";
import { ModeStatusReply } from "./protobuf/bilibili/app/interface/teenagers.js";
import { DmViewReply, DmSegMobileReply } from "./protobuf/bilibili/community/service/dm/v1/dm.js";
import { MainListReply } from "./protobuf/bilibili/main/community/reply/v1/reply.js";
import { SearchAllResponse } from "./protobuf/bilibili/polymer/app/search/v1/search.js";
/***************** Processing *****************/
// 解构URL
const url = new URL($request.url);
log(`⚠ url: ${url.toJSON()}`, "");
// 获取连接参数
const PATHs = url.pathname.split("/").filter(Boolean);
log(`⚠ PATHs: ${PATHs}`, "");
// 解析格式
const FORMAT = ($response.headers?.["Content-Type"] ?? $response.headers?.["content-type"])?.split(";")?.[0];
log(`⚠ FORMAT: ${FORMAT}`, "");
// 读取设置
const { Settings, Caches, Configs } = setENV("BiliBili", "ADBlock", database);
!(async () => {
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
			switch (url.hostname) {
				case "www.bilibili.com":
					break;
				case "app.bilibili.com":
				case "app.biliapi.net":
					switch (url.pathname) {
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
					switch (url.pathname) {
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
					switch (url.pathname) {
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
					switch (url.hostname) {
						case "grpc.biliapi.net": // HTTP/2
						case "app.biliapi.net": // HTTP/1.1
						case "app.bilibili.com": // HTTP/1.1
							switch (PATHs?.[0]) {
								case "bilibili.app.playurl.v1.PlayURL": // 投稿视频
									switch (PATHs?.[1]) {
										case "PlayView": {
											// 播放地址
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
										case "View": // 视频播放页
											switch (Settings?.Detail?.view) {
												case true:
												default:
													body = ViewUniteReply.fromBinary(rawBody);
													log("ViewUniteReply", JSON.stringify(body, null, 2), "");
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
											body.relates.cards = body.relates.cards.filter(item => {
												if (item.relateCardType === 5 || item.relateCardType === 4) {
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
											body = ModeStatusReply.fromBinary(rawBody);
											body.modes = body.modes.map(mode => {
												if (mode?.name === "teenagers") {
													if (mode?.f5?.f1) {
														mode.f5.f1 = 0;
														log("🎉 青少年模式弹窗去除");
													}
												}
												return mode;
											});
											rawBody = ModeStatusReply.toBinary(body);
											break;
									}
									break;
								case "bilibili.community.service.dm.v1.DM": //弹幕
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
									switch (PATHs?.[1]) {
										case "PlayView": // 播放地址
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
})()
	.catch(e => logError(e))
	.finally(() => done($response));
