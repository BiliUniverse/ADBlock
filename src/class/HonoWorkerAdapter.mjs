import { Lodash as _ } from "@nsnanocat/util";

/**
 * Hono 路由上下文类型。
 * Hono route context type.
 * @typedef {import("hono").Context} HonoContext
 */

/**
 * Worker 统一头部字典。
 * Worker normalized header dictionary.
 * @typedef {Record<string, string | string[] | undefined>} WorkerHeaders
 */

/**
 * Worker 内部统一请求对象。
 * Worker normalized internal request payload.
 * @typedef {{
 * 	method: string,
 * 	url: string,
 * 	headers: WorkerHeaders,
 * 	body?: ArrayBuffer,
 * 	bodyBytes?: ArrayBuffer,
 * }} WorkerRequest
 */

/**
 * Worker 内部统一响应对象。
 * Worker normalized internal response payload.
 * @typedef {{
 * 	status?: number,
 * 	statusCode?: number,
 * 	headers?: WorkerHeaders,
 * 	body?: string | ArrayBuffer | Uint8Array | null,
 * 	bodyBytes?: ArrayBuffer | Uint8Array | null,
 * }} WorkerResponse
 */

/**
 * Hono Worker 运行时适配器。
 * Hono worker runtime adapter.
 */
export default class HonoWorkerAdapter {
	/**
	 * 根据 worker 入口域名与回退路径重写目标路由 URL。
	 * Rewrite upstream target URL based on the worker host and fallback path.
	 * @param {URL} url 当前请求 URL / Current request URL.
	 * @param {string} restPath 回退路由路径 / Fallback route path.
	 * @returns {URL} 重写后的 URL / Routed URL.
	 */
	static routeRewrite(url, restPath = "") {
		switch (true) {
			case url.hostname.startsWith("app."):
				url.hostname = "app.bilibili.com";
				break;
			case url.hostname.startsWith("grpc."):
				url.hostname = "grpc.biliapi.net";
				break;
			default:
			case url.hostname.endsWith(".workers.dev"): {
				const [host, ...path] = `${restPath}`.split("/");
				if (!host) break;
				url.protocol = "https:";
				url.hostname = host;
				url.port = "443";
				url.pathname = `/${path.join("/")}`;
				break;
			}
		}
		return url;
	}

	/**
	 * 解析请求查询参数，兼容旧入口中的点路径嵌套写法。
	 * Parse request query arguments using the legacy dotted path convention.
	 * @param {string} search URL 查询串 / URL search string.
	 * @returns {Record<string, unknown>} 解析后的参数对象 / Parsed argument object.
	 */
	static parseRequestArguments(search = "") {
		globalThis.$argument = {};
		for (const [key, value] of new URLSearchParams(search).entries()) {
			_.set(globalThis.$argument, key, value);
		}
		return globalThis.$argument;
	}

	/**
	 * 清理并标准化转发请求头。
	 * Normalize headers before forwarding upstream.
	 * @param {WorkerHeaders} headers 原始请求头 / Raw request headers.
	 * @returns {WorkerHeaders} 标准化后的请求头 / Normalized request headers.
	 */
	static normalizeRequestHeaders(headers = {}) {
		const requestHeaderBlacklist = new Set(["connection", "x-forwarded-proto", "x-real-ip"]);
		return Object.entries(headers).reduce((normalizedHeaders, [key, value]) => {
			if (value === undefined) return normalizedHeaders;
			const normalizedKey = key.toLowerCase();
			if (normalizedKey.startsWith("cf-") || requestHeaderBlacklist.has(normalizedKey)) return normalizedHeaders;
			normalizedHeaders[key] = value;
			return normalizedHeaders;
		}, {});
	}

	/**
	 * 从 Hono context 构造内部统一请求对象。
	 * Build the normalized internal request payload from Hono context.
	 * @param {HonoContext} c Hono 上下文 / Hono context.
	 * @returns {Promise<WorkerRequest>} 标准化请求对象 / Normalized request object.
	 */
	static async buildRequest(c) {
		const url = HonoWorkerAdapter.routeRewrite(new URL(c.req.url), c.req.param("rest"));
		const method = c.req.method;
		let bodyBytes;
		switch (method) {
			case "GET":
			case "HEAD":
			case "OPTIONS":
				break;
			default:
				bodyBytes = await c.req.arrayBuffer().catch(error => {
					console.info(error);
					return undefined;
				});
				if (!bodyBytes?.byteLength) bodyBytes = undefined;
				break;
		}
		HonoWorkerAdapter.parseRequestArguments(url.search);
		return {
			method,
			url: url.toString(),
			headers: HonoWorkerAdapter.normalizeRequestHeaders(c.req.header()),
			body: bodyBytes,
			bodyBytes,
		};
	}

	/**
	 * 清理回包头，避免与 Cloudflare Workers 回写行为冲突。
	 * Clean response headers to avoid conflicts with Cloudflare Workers.
	 * @param {WorkerHeaders} headers 原始响应头 / Raw response headers.
	 * @returns {WorkerHeaders} 清理后的响应头 / Cleaned response headers.
	 */
	static cleanupResponseHeaders(headers = {}) {
		const normalizedHeaders = { ...headers };
		if (normalizedHeaders["Content-Encoding"]) normalizedHeaders["Content-Encoding"] = "identity";
		if (normalizedHeaders["content-encoding"]) normalizedHeaders["content-encoding"] = "identity";
		delete normalizedHeaders["Content-Length"];
		delete normalizedHeaders["content-length"];
		delete normalizedHeaders["Transfer-Encoding"];
		delete normalizedHeaders["transfer-encoding"];
		return normalizedHeaders;
	}

	/**
	 * 将内部统一响应对象写回 Hono response。
	 * Write the normalized internal response payload back to Hono.
	 * @param {HonoContext} c Hono 上下文 / Hono context.
	 * @param {WorkerResponse} $response 内部响应对象 / Internal response object.
	 * @returns {Response} Hono 响应 / Hono response.
	 */
	static writeResponse(c, $response = {}) {
		const headers = HonoWorkerAdapter.cleanupResponseHeaders($response.headers ?? {});
		for (const [key, value] of Object.entries(headers)) {
			if (Array.isArray(value)) {
				for (const entry of value) c.header(key, entry.toString(), { append: true });
				continue;
			}
			if (value !== undefined) c.header(key, value.toString());
		}
		c.status($response.status ?? $response.statusCode ?? 200);
		return c.body($response.body ?? $response.bodyBytes ?? null);
	}
}
