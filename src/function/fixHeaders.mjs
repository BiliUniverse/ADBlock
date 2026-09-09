import { Console } from "@nsnanocat/util";

/**
 * Fix Headers
 * 用于修复 content-type: application/grpc 的响应头
 * @author VirgilClyne
 * @param {Object} requestHeaders 请求头
 * @param {Object} responseHeaders 响应头
 * @returns {Object} 修复后的响应头
 */
export default function fixHeaders(requestHeaders, responseHeaders) {
	Console.log("☑️ Fix Headers");
	const request = requestHeaders && typeof requestHeaders === "object" ? requestHeaders : {};
	const response = responseHeaders && typeof responseHeaders === "object" ? responseHeaders : {};
	const ua = String(request["User-Agent"] ?? request["user-agent"] ?? "");
	switch (true) {
		// 粉B：请求头中存在x-bili-moss-engine-type: 1的，响应头必须有grpc-status: 0。否则有没有都不影响
		case ua.startsWith("bili-universal/"):
		case ua.includes("bili-universal/"):
			if (request["x-bili-moss-engine-type"] === "1") {
				response["grpc-status"] = "0";
			}
			break;
		// 白B：不能有grpc-status: 0
		case ua.startsWith("bili-inter/"):
		case ua.includes("bili-inter/"):
			Reflect.deleteProperty(response, "grpc-status");
			break;
		// 蓝B：必须有grpc-status: 0
		case ua.startsWith("bili-blue/"):
		case ua.includes("bili-blue/"):
			response["grpc-status"] = "0";
			break;
	}

	Console.log("✅ Fix Headers");
	return response;
}
