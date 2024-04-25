import _ from './ENV/Lodash.mjs'
import $Storage from './ENV/$Storage.mjs'
import ENV from "./ENV/ENV.mjs";

import Database from "./database/BiliBili.mjs";
import setENV from "./function/setENV.mjs";
import pako from "./pako/dist/pako.esm.mjs";
import addgRPCHeader from "./function/addgRPCHeader.mjs";

import MD5 from '../node_modules/crypto-js/md5.js';
import { WireType, UnknownFieldHandler, reflectionMergePartial, MESSAGE_TYPE, MessageType, BinaryReader, isJsonObject, typeofJsonValue, jsonWriteOptions } from "../node_modules/@protobuf-ts/runtime/build/es2015/index.js";

const $ = new ENV("📺 BiliBili: 🛡️ ADBlock v0.3.1(1004) request.beta");

// 构造回复数据
let $response = undefined;

/***************** Processing *****************/
// 解构URL
const url = new URL($request.url);
$.log(`⚠ url: ${url.toJSON()}`, "");
// 获取连接参数
const METHOD = $request.method, HOST = url.hostname, PATH = url.pathname, PATHs = url.pathname.split("/").filter(Boolean);
$.log(`⚠ METHOD: ${METHOD}, HOST: ${HOST}, PATH: ${PATH}` , "");
// 解析格式
const FORMAT = ($request.headers?.["Content-Type"] ?? $request.headers?.["content-type"])?.split(";")?.[0];
$.log(`⚠ FORMAT: ${FORMAT}`, "");
!(async () => {
	// 读取设置
	const { Settings, Caches, Configs } = setENV("BiliBili", "ADBlock", Database);
	$.log(`⚠ Settings.Switch: ${Settings?.Switch}`, "");
	switch (Settings.Switch) {
		case true:
		default:
			// 创建空数据
			let body = { "code": 0, "message": "0", "data": {} };
			// 方法判断
			switch (METHOD) {
				case "POST":
				case "PUT":
				case "PATCH":
				case "DELETE":
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
							//body = M3U8.parse($request.body);
							//$.log(`🚧 body: ${JSON.stringify(body)}`, "");
							//$request.body = M3U8.stringify(body);
							break;
						case "text/xml":
						case "text/html":
						case "text/plist":
						case "application/xml":
						case "application/plist":
						case "application/x-plist":
							//body = XML.parse($request.body);
							//$.log(`🚧 body: ${JSON.stringify(body)}`, "");
							//$request.body = XML.stringify(body);
							break;
						case "text/vtt":
						case "application/vtt":
							//body = VTT.parse($request.body);
							//$.log(`🚧 body: ${JSON.stringify(body)}`, "");
							//$request.body = VTT.stringify(body);
							break;
						case "text/json":
						case "application/json":
							//body = JSON.parse($request.body ?? "{}");
							//$.log(`🚧 body: ${JSON.stringify(body)}`, "");
							//$request.body = JSON.stringify(body);
							break;
						case "application/protobuf":
						case "application/x-protobuf":
						case "application/vnd.google.protobuf":
						case "application/grpc":
						case "application/grpc+proto":
						case "applecation/octet-stream":
							//$.log(`🚧 $request.body: ${JSON.stringify($request.body)}`, "");
							let rawBody = $.isQuanX() ? new Uint8Array($request.bodyBytes ?? []) : $request.body ?? new Uint8Array();
							//$.log(`🚧 isBuffer? ${ArrayBuffer.isView(rawBody)}: ${JSON.stringify(rawBody)}`, "");
							switch (FORMAT) {
								case "application/protobuf":
								case "application/x-protobuf":
								case "application/vnd.google.protobuf":
									break;
								case "application/grpc":
								case "application/grpc+proto":
									// 先拆分B站gRPC校验头和protobuf数据体
									let header = rawBody.slice(0, 5);
									body = rawBody.slice(5);
									// 处理request压缩protobuf数据体
									switch (header?.[0]) {
										case 0: // unGzip
											break;
										case 1: // Gzip
											body = pako.ungzip(body);
											header[0] = 0; // unGzip
											break;
									};
									// 解析链接并处理protobuf数据
									switch (HOST) {
										case "grpc.biliapi.net": // HTTP/2
										case "app.bilibili.com": // HTTP/1.1
											/******************  initialization start  *******************/
											var CodeType;!function(CodeType){CodeType[CodeType.NOCODE=0]="NOCODE",CodeType[CodeType.CODE264=1]="CODE264",CodeType[CodeType.CODE265=2]="CODE265",CodeType[CodeType.CODEAV1=3]="CODEAV1"}(CodeType||(CodeType={}));
											/******************  initialization finish  *******************/
											switch (PATHs?.[0]) {
												case "bilibili.app.playerunite.v1.Player":
													switch (PATHs?.[1]) {
														case "PlayViewUnite": { // 播放地址
															break;
														};
													};
													break;
												case "bilibili.app.playurl.v1.PlayURL": // 普通视频
													switch (PATHs?.[1]) {
														case "PlayView": // 播放地址
															break;
														case "PlayConf": // 播放配置
															break;
													};
													break;
												case "bilibili.pgc.gateway.player.v2.PlayURL": // 番剧
													switch (PATHs?.[1]) {
														case "PlayView": { // 播放地址
															break;
														};
														case "PlayConf": // 播放配置
															break;
													};
													break;
												case "bilibili.app.nativeact.v1.NativeAct": // 活动-节目、动画、韩综（港澳台）
													switch (PATHs?.[1]) {
														case "Index": // 首页
															break;
													};
													break;
												case "bilibili.app.interface.v1.Search": // 搜索框
													switch (PATHs?.[1]) {
														case "Suggest3": // 搜索建议
															break;
													};
													break;
												case "bilibili.polymer.app.search.v1.Search": // 搜索结果
													switch (PATHs?.[1]) {
														case "SearchAll": { // 全部结果（综合）
															break;
														};
														case "SearchByType": { // 分类结果（番剧、用户、影视、专栏）
															break;
														};
													};
													break;
											};
											break;
									};
									// protobuf部分处理完后，重新计算并添加B站gRPC校验头
									rawBody = addgRPCHeader({ header, body }); // gzip压缩有问题，别用
									break;
							};
							// 写入二进制数据
							$request.body = rawBody;
							break;
					};
					//break; // 不中断，继续处理URL
				case "GET":
				case "HEAD":
				case "OPTIONS":
				default:
					// 主机判断
					switch (HOST) {
						case "www.bilibili.com":
							break;
						case "search.bilibili.com":
							break;
						case "app.bilibili.com":
						case "app.biliapi.net":
							// 路径判断
							switch (PATH) {
								case "/x/v2/splash/show": // 开屏页
								case "/x/v2/splash/list": // 开屏页
								case "/x/v2/splash/brand/list": // 开屏页
								case "/x/v2/splash/event/list2": // 开屏页
									break;
								case "/x/v2/feed/index": // 推荐页
									switch (Settings?.Detail?.feed) {
										case true:
										default:
											switch (Settings?.Detail?.activity) {
												case true:
												default:
													if (url.searchParams.has("banner_hash")) { // 无论如何此字段都为空，因为客户端无法收到（只要去了大图）
														if (url.searchParams.get("login_event") !== "0") { // 此字段可区分第一次请求和后续请求
															url.searchParams.delete("sign");
															url.searchParams.set("open_event", "");
															url.searchParams.set("pull", 0);
															if (Caches.banner_hash) {
																url.searchParams.set("banner_hash", Caches.banner_hash);
																$.log(`🎉 读取hash缓存成功`);
															};
															const string = url.search.substring(1) + "c2ed53a74eeefe3cf99fbd01d8c9c375";
															const newMD5 = MD5(string).toString();
															url.searchParams.set("sign", newMD5);
														};
													};
													break;
												case false:
													$.log(`🚧 用户设置推荐页活动大图不去除`);
													break;
											}
											break;
										case false:
											$.log(`🚧 用户设置推荐页广告不去除`);
											break;
									};
									break;
								case "/x/v2/feed/index/story": // 首页短视频流
									break;
								case "/x/v2/search/square": // 搜索页
									break;
								case "/x/v2/search": // 搜索-全部结果-api（综合）
								case "/x/v2/search/type": // 搜索-分类结果-api（番剧、用户、影视、专栏）
									break;
								case "/x/v2/space": // 用户空间
									break;
							};
							break;
						case "api.bilibili.com":
						case "api.biliapi.net":
							switch (PATH) {
								case "/pgc/page/bangumi": // 追番页
								case "/pgc/page/cinema/tab": // 观影页
									break;
								case "/x/player/wbi/playurl": // UGC-用户生产内容-播放地址
									break;
								case "/x/web-interface/wbi/index/top/feed/rcmd": // web首页
									break;
							};
							break;
						case "api.live.bilibili.com":
							switch (PATH) {
								case "/xlive/app-room/v1/index/getInfoByRoom": // 直播
									break;
							};
							break;
					};
					break;
				case "CONNECT":
				case "TRACE":
					break;
			};
			$request.url = url.toString();
			$.log(`🚧 调试信息`, `$request.url: ${$request.url}`, "");
			break;
		case false:
			break;
	};
})()
	.catch((e) => $.logErr(e))
	.finally(() => {
		switch ($response) {
			default: // 有构造回复数据，返回构造的回复数据
				//$.log(`🚧 finally`, `echo $response: ${JSON.stringify($response, null, 2)}`, "");
				if ($response.headers?.["Content-Encoding"]) $response.headers["Content-Encoding"] = "identity";
				if ($response.headers?.["content-encoding"]) $response.headers["content-encoding"] = "identity";
				if ($.isQuanX()) {
					if (!$response.status) $response.status = "HTTP/1.1 200 OK";
					delete $response.headers?.["Content-Length"];
					delete $response.headers?.["content-length"];
					delete $response.headers?.["Transfer-Encoding"];
					$.done($response);
				} else $.done({ response: $response });
				break;
			case undefined: // 无构造回复数据，发送修改的请求数据
				//$.log(`🚧 finally`, `$request: ${JSON.stringify($request, null, 2)}`, "");
				$.done($request);
				break;
		};
	})
