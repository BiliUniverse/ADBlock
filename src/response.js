import { $app, Console, done, fetch, Lodash as _, Storage } from "@nsnanocat/util";
import gRPC from "@nsnanocat/grpc";
import database from "./function/database.mjs";
import setENV from "./function/setENV.mjs";
import { PlayViewReply } from "./protobuf/bilibili/app/playurl/v1/playurl.js";
import { DynAllReply, DynVideoReply } from "./protobuf/bilibili/app/dynamic/v2/dynamic.js";
import { ViewReply, TFInfoReply } from "./protobuf/bilibili/app/view/v1/view.js";
import { ViewReply as ViewUniteReply, RelatesFeedReply } from "./protobuf/bilibili/app/viewunite/v1/viewunite.js";
import { ModeStatusReply } from "./protobuf/bilibili/app/interface/teenagers.js";
import { DmViewReply, DmSegMobileReply } from "./protobuf/bilibili/community/service/dm/v1/dm.js";
import { MainListReply } from "./protobuf/bilibili/main/community/reply/v1/reply.js";
import { PlayViewReply as PGCPlayViewReply } from "./protobuf/bilibili/pgc/gateway/player/v2/playurl.js";
import { SearchAllResponse } from "./protobuf/bilibili/polymer/app/search/v1/search.js";
import fixHeaders from "./function/fixHeaders.mjs";
/***************** Processing *****************/
// 解构URL
const url = new URL($request.url);
Console.info(`url: ${url.toJSON()}`);
// 获取连接参数
const PATHs = url.pathname.split("/").filter(Boolean);
Console.info(`PATHs: ${PATHs}`);
// 解析格式
const FORMAT = ($response.headers?.["Content-Type"] ?? $response.headers?.["content-type"])?.split(";")?.[0];
Console.info(`FORMAT: ${FORMAT}`);
(async () => {
	/**
	 * 设置
	 * @type {{Settings: import('./types').Settings}}
	 */
	const { Settings, Caches, Configs } = setENV("BiliBili", "ADBlock", database);
	Console.logLevel = Settings.LogLevel;
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
			//Console.debug(`body: ${JSON.stringify(body)}`);
			//$response.body = M3U8.stringify(body);
			break;
		case "text/xml":
		case "text/html":
		case "text/plist":
		case "application/xml":
		case "application/plist":
		case "application/x-plist":
			//body = XML.parse($response.body);
			//Console.debug(`body: ${JSON.stringify(body)}`);
			//$response.body = XML.stringify(body);
			break;
		case "text/vtt":
		case "application/vtt":
			//body = VTT.parse($response.body);
			//Console.debug(`body: ${JSON.stringify(body)}`);
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
							switch (Settings?.Splash) {
								case true:
								default: {
									Console.info("✅ 开屏页广告去除");
									const item = ["account", "event_list", "preload", "show"];
									if (body.data) {
										item.forEach(i => {
											delete body.data[i];
										});
									}
									break;
								}
								case false:
									Console.warn("用户设置开屏页广告不去除");
									break;
							}
							break;
						case "/x/v2/feed/index": // 推荐页
							switch (Settings?.Feed?.AD) {
								case true:
								default: {
									if (body.data.items?.length) {
										//区分pad与phone
										body.data.items = await Promise.all(
											body.data.items.map(async item => {
												const { card_type: cardType, card_goto: cardGoto, goto: Goto } = item;
												if (cardType && cardGoto) {
													if (["banner_v8", "banner_ipad_v8"].includes(cardType) && cardGoto === "banner") {
														switch (Settings?.Feed?.Activity) {
															case true:
																Caches.banner_hash = item.hash;
																Storage.setItem("@BiliBili.ADBlock.Caches", Caches); // 获取banner_hash,无此字段会有活动页且此字段无法伪造.
																Console.info("✅ 推荐页活动大图去除");
																return undefined;
															case false:
															default:
																if (item.banner_item) {
																	item.banner_item = item.banner_item.filter(i => {
																		if (i.type === "ad") {
																			Console.info("✅ 推荐页大图广告去除");
																			return false;
																		}
																		return true;
																	});
																}
																break;
														}
													} else if (["cm_v2", "cm_v1"].includes(cardType) && ["ad_web_s", "ad_av", "ad_web_gif"].includes(cardGoto)) {
														// ad_player大视频广告 ad_web_gif大gif广告 ad_web_s普通小广告 ad_av创作推广广告 ad_inline_3d  上方大的视频3d广告 ad_inline_eggs 上方大的视频广告 ad_inline_live 华为问界
														Console.log(`✅ ${cardGoto}广告去除`);
														if (url.searchParams.get("device") !== "phone") {
															return undefined; //pad直接去除
														} else {
															await fixPosition().then(result => (item = result)); //小广告补位
														}
													} else if (cardGoto === "live" && cardType === "small_cover_v9") {
														let BlockUpLiveList = Settings?.Feed?.BlockUpLiveList;
														if (typeof BlockUpLiveList === "number") {
															BlockUpLiveList = BlockUpLiveList.toString();
														}
														if (BlockUpLiveList?.includes(item?.args?.up_id?.toString())) {
															Console.log(`✅ 屏蔽Up主<${item?.args?.up_name}>直播推广`);
															await fixPosition().then(result => (item = result)); //小广告补位
														}
													} else if (cardType === "cm_v2" && ["ad_player", "ad_inline_3d", "ad_inline_eggs", "ad_inline_live"].includes(cardGoto)) {
														Console.log(`✅ ${cardGoto}广告去除`);
														return undefined; //大广告直接去除
													} else if (cardType === "small_cover_v10" && cardGoto === "game") {
														Console.info("✅ 游戏广告去除");
														if (url.searchParams.get("device") !== "phone") {
															return undefined; //pad直接去除
														} else {
															await fixPosition().then(result => (item = result)); //小广告补位
														}
													} else if (cardType === "cm_double_v9" && cardGoto === "ad_inline_av") {
														Console.info("✅ 大视频广告去除");
														return undefined; //大广告直接去除
													} else if (Goto === "vertical_av") {
														switch (Settings?.Feed?.Vertical) {
															case true:
																Console.info("✅ 竖屏视频去除");
																await fixPosition().then(result => (item = result)); //小视频补位
																break;
															case false:
															default:
																Console.warn("用户设置推荐页竖屏视频不去除");
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
										let itemsCache = Storage.getItem("@BiliBili.Index.Caches");
										let singleItem = {};
										if (itemsCache && itemsCache.length > 0) {
											singleItem = itemsCache.pop();
											Console.info("✅ 推荐页空缺位填充成功");
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
														Console.info("✅ 推荐页缓存数组补充成功");
													} else {
														Console.warn("访问推荐页尝试填补失败");
													}
												} catch (e) {
													Console.error(e, response);
												}
											});
											itemsCache = Storage.getItem("@BiliBili.Index.Caches");
											if (itemsCache.length > 0) {
												singleItem = itemsCache.pop();
												Console.info("✅ 推荐页空缺位填充成功");
											}
										}
										Storage.setItem("@BiliBili.Index.Caches", itemsCache);
										return singleItem;
									}
									break;
								}
								case false:
									Console.warn("用户设置推荐页广告不去除");
									break;
							}
							break;
						case "/x/v2/feed/index/story": // 首页短视频流
							switch (Settings?.Feed?.Story) {
								case true:
								default:
									if (body.data?.items) {
										// vertical_live 直播内容
										// vertical_pgc 大会员专享
										Console.info("✅ 首页短视频流广告去除");
										const filterSet = new Set(["vertical_ad_av", "vertical_ad_picture", "vertical_ad_live", "vertical_pgc"]);
										body.data.items = body.data.items.filter(i => !(i.hasOwnProperty("ad_info") || filterSet.has(i.card_goto)));
									}
									break;
								case false:
									Console.warn("用户设置首页短视频流广告不去除");
									break;
							}
							break;
						case "/x/v2/search/square": // 搜索页
							switch (Settings?.Search?.HotSearch) {
								case true:
								default:
									Console.info("✅ 搜索页热搜内容去除");
									body.data = body.data.filter(i => !(i.type === "trending"));
									break;
								case false:
									Console.warn("用户设置搜索页热搜内容不去除");
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
							switch (Settings?.PGC?.AD) {
								case true:
								default:
									if (body.result?.modules) {
										Console.info("✅ 观影页广告去除");
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
									Console.warn("用户设置观影页广告不去除");
									break;
							}
							break;
						case "/x/player/wbi/playurl": // UGC-用户生产内容-播放地址
							break;
						case "/x/web-interface/wbi/index/top/feed/rcmd": // web首页
							switch (Settings?.Feed?.AD) {
								case true:
								default:
									Console.info("✅ 首页广告内容去除");
									body.data.item = body.data.item.filter(i => !(i.goto === "ad"));
									break;
								case false:
									Console.warn("用户设置首页广告不去除");
									break;
							}
							break;
					}
					break;
				case "api.live.bilibili.com":
					switch (url.pathname) {
						case "/xlive/app-room/v1/index/getInfoByRoom": // 直播
							switch (Settings?.Xlive?.AD) {
								case true:
								default:
									Console.info("✅ 直播banner广告去除");
									delete body.data?.activity_banner_info;
									if (body.data?.shopping_info) {
										body.data.shopping_info = {
											is_show: 0,
										};
										Console.info("✅ 直播购物广告去除");
									}
									if (body.data?.new_tab_info?.outer_list?.length > 0) {
										body.data.new_tab_info.outer_list = body.data.new_tab_info.outer_list.filter(i => i.biz_id !== 33);
									}
									break;
								case false:
									Console.warn("用户设置直播页广告不去除");
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
			//Console.debug(`$response.body: ${JSON.stringify($response.body)}`);
			let rawBody = $app === "Quantumult X" ? new Uint8Array($response.bodyBytes ?? []) : ($response.body ?? new Uint8Array());
			//Console.debug(`isBuffer? ${ArrayBuffer.isView(rawBody)}: ${JSON.stringify(rawBody)}`);
			switch (FORMAT) {
				case "application/protobuf":
				case "application/x-protobuf":
				case "application/vnd.google.protobuf":
					break;
				case "application/grpc":
				case "application/grpc+proto":
					// headers修复
					$response.headers = fixHeaders($request.headers, $response.headers);
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
												Console.info("✅ 后台播放限制去除");
												body.playArc.backgroundPlayConf.isSupport = true;
												body.playArc.backgroundPlayConf.disabled = false;
												body.playArc.backgroundPlayConf.extraContent = null;
											} else {
												Console.warn("无后台播放限制");
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
											switch (Settings?.Dynamic?.HotTopics) {
												case true:
												default:
													Console.info("✅ 动态综合页热门话题去除");
													body.topicList = undefined;
													break;
												case false:
													Console.warn("用户设置动态综合页热门话题不去除");
													break;
											}
											switch (Settings?.Dynamic?.MostVisited) {
												case true:
													Console.info("✅ 动态综合页最常访问去除");
													body.upList = undefined;
													break;
												case false:
												default:
													switch (Settings?.Dynamic?.MostVisitedLiveOnly) {
														case true:
															Console.info("✅ 动态综合页最常访问仅显示直播");
															if (body.upList?.list?.length || body.upList?.listSecond?.length) {
																body.upList.list = [...body.upList.list || [], ...body.upList.listSecond || []]
																	.filter(item => {
																		return item.liveState == 1;
																	});
																body.upList.listSecond = [];
															} else {
																body.upList = undefined;
															}
															break;
														case false:
														default:
															Console.warn("用户设置动态综合页最常访问不去除");
															break;
													}
													break;
											}
											switch (Settings?.Dynamic?.AdCard) {
												case true:
												default:
													if (body.dynamicList?.list?.length) {
														body.dynamicList.list = body.dynamicList.list.filter(item => {
															if (item.cardType === 15) {
																Console.info("✅ 动态综合页广告动态去除");
																return false;
															} else return true;
														});
													}
													break;
												case false:
													Console.warn("用户设置动态综合页广告动态不去除");
													break;
											}
											rawBody = DynAllReply.toBinary(body);
											break;
										case "DynVideo": // 动态视频页
											body = DynVideoReply.fromBinary(rawBody);
											switch (Settings?.Dynamic?.MostVisited) {
												case true:
													Console.info("✅ 动态视频页最常访问去除");
													body.videoUpList = undefined;
													break;
												case false:
												default:
													Console.warn("用户设置动态视频页最常访问不去除");
													break;
											}
											rawBody = DynVideoReply.toBinary(body);
											break;
									}
									break;
								case "bilibili.app.view.v1.View": // 视频
									switch (PATHs?.[1]) {
										case "View": // 视频播放页
											switch (Settings?.View?.AD) {
												case true:
												default:
													body = ViewReply.fromBinary(rawBody);
													if (body.cms?.length) {
														Console.info("✅ 播放页广告卡片去除");
														body.cms = [];
													}
													if (body.relates?.length) {
														body.relates = body.relates.filter(item => {
															if (item.cm) {
																Console.info("✅ 播放页关联推荐广告去除");
																return false;
															}
															return true;
														});
													}
													if (body.cmConfig || body.cmIpad) {
														Console.info("✅ 播放页定制tab去除");
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
													Console.warn("用户设置播放页广告不去除");
													break;
											}
											break;
										case "TFInfo": {
											body = TFInfoReply.fromBinary(rawBody);
											Console.debug(`tipsId: ${body.tipsId}`);
											if (body?.tipsId) {
												Console.info("✅ 播放页办卡免流广告去除");
												body.tfToast = undefined;
												body.tfPanelCustomized = undefined;
											}
											rawBody = TFInfoReply.toBinary(body);
											break;
										}
									}
									break;
								case "bilibili.app.viewunite.v1.View": // 视频
									// 4: 游戏, 5: 广告, 11: 课程
									// cmStock: 广告字段, uniqueId: 推广视频
									const filterRelateCard = card => {
										if ([4, 5, 11].includes(card.relateCardType) || card.cmStock || card.basicInfo?.uniqueId) {
											Console.info("✅ 视频详情下方推荐列表广告去除");
											return false;
										}
										return true;
									};
									switch (PATHs?.[1]) {
										case "View": // 视频播放页
											switch (Settings?.View?.AD) {
												case true:
												default:
													body = ViewUniteReply.fromBinary(rawBody);
													Console.debug(`ViewUniteReply: ${JSON.stringify(body, null, 2)}`);
													if (body.cm) {
														Console.info("✅ 视频下方广告去除");
														delete body.cm;
													}
													if (body.tab?.tabModule?.[0]?.tab?.introduction?.modules) {
														body.tab.tabModule[0].tab.introduction.modules = body.tab.tabModule[0].tab.introduction.modules
															.map(i => {
																if (i.type === 28 && i.data?.relates?.cards) {
																	i.data.relates.cards = i.data.relates.cards.filter(filterRelateCard);
																}
																return i;
															})
															.filter(i => {
																if (i.type === 55) {
																	Console.info("✅ 视频详情下方up主分享好物去除");
																	return false;
																}
																if (i.type === 29) {
																	Console.info("✅ 番剧标题下方大会员横幅广告去除");
																	return false;
																}
																if (i.type === 18) {
																	Console.info("✅ 番剧下方活动横幅去除");
																	return false;
																}
															return true;
															});
													}
													rawBody = ViewUniteReply.toBinary(body);
													break;
												case false:
													Console.warn("用户设置up主推荐广告不去除");
													break;
											}
											break;
										case "RelatesFeed": // 播放页下方推荐卡
											body = RelatesFeedReply.fromBinary(rawBody);
											body.relates = body.relates.filter(filterRelateCard);
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
														Console.info("✅ 青少年模式弹窗去除");
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
											body = DmViewReply.fromBinary(rawBody);
											switch (Settings?.DM?.Command) {
												case true:
													Console.info("✅ 交互式弹幕去除");
													_.set(body, "commandDms[0].data", []);
													break;
												case false:
												default:
													Console.warn("用户设置交互式弹幕不去除");
													break;
											}
											if (body.activityMeta.length) {
												Console.info("✅ 雲視聽水印去除");
												body.activityMeta = [];
											}
											rawBody = DmViewReply.toBinary(body);
											break;
										case "DmSegMobile": // 弹幕列表
											switch (Settings?.DM?.Colorful) {
												case true:
													body = DmSegMobileReply.fromBinary(rawBody);
													body.elems = body.elems.map(ele => {
														if (ele?.colorful === 60001) {
															ele.colorful = 0;
														}
														return ele;
													});
													Console.info("✅ 会员弹幕已替换为普通弹幕");
													rawBody = DmSegMobileReply.toBinary(body);
													break;
												case false:
												default:
													Console.warn("用户设置会员弹幕不修改");
													break;
											}
											break;
									}
									break;
								case "bilibili.main.community.reply.v1.Reply": //评论区
									switch (PATHs?.[1]) {
										case "MainList":
											switch (Settings?.Reply?.AD) {
												case true:
												default:
													body = MainListReply.fromBinary(rawBody);
													const pattern = /https:\/\/b23\.tv\/(cm|mall)/;
													body.topReplies = body.topReplies.filter(item => {
														const urls = item.content?.url || {};
														const message = item.content?.message || '';
														if (Object.keys(urls).some(url => pattern.test(url)) || pattern.test(message)) {
															// 排查广告的方法为是否放了带货链接，如跳转淘宝京东等，判断力度较轻，避免杀错。
															// cm: 第三方链接, mall: 第三方APP, 视频链接不会被过滤
															Console.info("✅ 评论置顶带货广告去除");
															return false;
														}
														return true;
													});
													if (Object.keys(body.cm || {}).length) {
														body.cm = undefined;
														Console.info("✅ 评论列表广告去除");
													}
													body.subjectTopCards = body.subjectTopCards?.filter(item => {
														if (item.type === 3) {
															Console.info("✅ 评论列表广告去除");
															return false;
														}
														return true;
													})
													rawBody = MainListReply.toBinary(body);
													break;
												case false:
													Console.info("✅ 用户设置评论列表广告不去除");
													break;
											}
											break;
									}
									break;
								case "bilibili.pgc.gateway.player.v2.PlayURL": // 番剧
									switch (PATHs?.[1]) {
										case "PlayView": // 播放地址
											body = PGCPlayViewReply.fromBinary(rawBody);
											if (body.viewInfo?.tryWatchPromptBar) {
												body.viewInfo.tryWatchPromptBar = undefined;
												Console.info("✅ 番剧播放器下方提示栏去除");
											}
											if (body.playExtConf?.castTips) {
												body.playExtConf.castTips = { code: 0, message: '' };
												Console.info("✅ 番剧播放器下方提示栏去除");
											}
											rawBody = PGCPlayViewReply.toBinary(body);
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
											switch (Settings?.Search?.AD) {
												case true:
												default:
													body = SearchAllResponse.fromBinary(rawBody);
													Console.info("✅ 搜索页广告去除");
													body.item = body.item.filter(i => !(i.cardItem?.oneofKind === "cm" || i.cardItem?.oneofKind === "game"));
													rawBody = SearchAllResponse.toBinary(body);
													break;
												case false:
													Console.warn("用户设置搜索页广告不去除");
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
	.catch(e => Console.error(e))
	.finally(() => done($response));
