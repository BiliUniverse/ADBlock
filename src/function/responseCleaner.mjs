import { sanitizeUrl, sanitizeUrlFields, sanitizeUrlParameters } from "./sanitizeUrl.mjs";

export const asArray = value => (Array.isArray(value) ? value : []);

export const isObject = value => value !== null && typeof value === "object";

export function stringListIncludes(value, target) {
	if (target == null) return false;
	return String(value ?? "")
		.split(",")
		.map(item => item.trim())
		.filter(Boolean)
		.includes(String(target));
}

export function isFeedAd(item) {
	if (!isObject(item)) return false;
	const cardType = typeof item.card_type === "string" ? item.card_type : "";
	const cardGoto = typeof item.card_goto === "string" ? item.card_goto : "";
	const hasAdInfo = Object.prototype.hasOwnProperty.call(item, "ad_info") && item.ad_info != null;
	return hasAdInfo || cardType.startsWith("cm_") || cardGoto.startsWith("ad_") || item.goto === "ad" || item.is_ad === true;
}

const COMMERCIAL_REPLY_PATTERN = /https?:\/\/(?:b23\.tv\/(?:cm|mall)|cm\.bilibili\.com\/ad-showcase-h5\/?#\/goods-select)/i;

export const isCommercialUrl = value => COMMERCIAL_REPLY_PATTERN.test(String(value ?? ""));

export function isCommercialReply(reply) {
	if (!isObject(reply)) return false;
	const content = reply.content;
	if (!isObject(content)) return false;
	if (isCommercialUrl(content.message)) return true;
	for (const [key, link] of Object.entries(content.url ?? {})) {
		if (isCommercialUrl(key)) return true;
		if (!isObject(link)) continue;
		if (isCommercialUrl(link.appUrlSchema) || isCommercialUrl(link.pcUrl)) return true;
	}
	return false;
}

export function isLiveCardAd(card) {
	if (!isObject(card)) return false;
	const explicitAd = value => value === true || value === 1 || value === "1";
	const transparent = card.ad_transparent_content;
	const hasTransparentAd = typeof transparent === "string" ? transparent.trim().length > 0 : isObject(transparent) ? Object.keys(transparent).length > 0 : Boolean(transparent);
	return explicitAd(card.is_ad) || explicitAd(card.show_ad_icon) || hasTransparentAd;
}

export function cleanLiveCardTracking(card, removeTracking = true, removeCallbacks = false, removePreloadTracking = false) {
	if (!isObject(card)) return card;
	if (removeTracking) {
		card.trackid = undefined;
		card.track_id = undefined;
		card.report_flow_data = undefined;
		if (typeof card.link === "string") card.link = sanitizeUrlParameters(card.link, new Set(["trackid"]));
	}
	if (removeCallbacks) {
		card.show_callback = undefined;
		card.click_callback = undefined;
	}
	if (removePreloadTracking && typeof card.subtitle_style?.link === "string") {
		card.subtitle_style.link = sanitizeUrlParameters(card.subtitle_style.link, new Set(["trackid"]));
	}
	return card;
}

export function cleanJsonTracking(item) {
	if (!isObject(item)) return item;
	sanitizeUrlFields(item);
	delete item.track_id;
	delete item.report_flow_data;
	return item;
}

const SEARCH_URL_FIELDS = new Set(["appUrlSchema", "jumpUri", "jumpUrl", "link", "liveLink", "pcUrl", "uri", "url"]);
const SEARCH_TRACKING_FIELDS = new Set(["reportFlowData", "trackId", "trackid"]);

/**
 * 清理 SearchAll Protobuf 中的跟踪字段。
 * Protobuf 标量字段必须恢复为默认空字符串，不能像 JSON 字段一样设为 undefined。
 */
export function cleanSearchTracking(value) {
	if (!isObject(value)) return 0;
	let changed = 0;
	for (const [key, child] of Object.entries(value)) {
		if (SEARCH_TRACKING_FIELDS.has(key) && typeof child === "string" && child !== "") {
			value[key] = "";
			changed++;
		} else if (SEARCH_URL_FIELDS.has(key) && typeof child === "string") {
			const sanitized = sanitizeUrl(child);
			if (sanitized !== child) {
				value[key] = sanitized;
				changed++;
			}
		} else if (isObject(child)) changed += cleanSearchTracking(child);
	}
	return changed;
}

export function cleanStoryItem(item, removeCommercial = true, removeTracking = false) {
	if (!isObject(item)) return item;
	if (removeCommercial && Array.isArray(item.share_bottom_button)) {
		item.share_bottom_button = item.share_bottom_button.filter(button => {
			if (!isObject(button) || button.type !== 20) return true;
			return !asArray(button.button_metas).some(meta => {
				if (!isObject(meta)) return false;
				if (meta.text === "助TA必火") return true;
				try {
					const link = new URL(meta.link);
					return link.hostname === "cm.bilibili.com" && link.pathname === "/fly-h5";
				} catch {
					return false;
				}
			});
		});
	}
	if (removeTracking) cleanJsonTracking(item);
	return item;
}

export function cleanReplyCommercialLinks(reply) {
	if (!isObject(reply)) return 0;
	let changed = 0;
	const urls = reply.content?.url;
	if (isObject(urls)) {
		for (const [key, link] of Object.entries(urls)) {
			if (isCommercialUrl(key) || (isObject(link) && (isCommercialUrl(link.appUrlSchema) || isCommercialUrl(link.pcUrl)))) {
				delete urls[key];
				changed++;
			}
		}
	}
	for (const child of asArray(reply.replies)) changed += cleanReplyCommercialLinks(child);
	return changed;
}

export function cleanReplyTracking(reply) {
	if (!isObject(reply)) return 0;
	let changed = 0;
	for (const link of Object.values(reply.content?.url ?? {})) {
		if (!isObject(link)) continue;
		const appUrlSchema = sanitizeUrl(link.appUrlSchema);
		const pcUrl = sanitizeUrl(link.pcUrl);
		if (appUrlSchema !== link.appUrlSchema) {
			link.appUrlSchema = appUrlSchema;
			changed++;
		}
		if (pcUrl !== link.pcUrl) {
			link.pcUrl = pcUrl;
			changed++;
		}
		if (link.clickReport) {
			link.clickReport = "";
			changed++;
		}
		if (link.exposureReport) {
			link.exposureReport = "";
			changed++;
		}
	}
	for (const child of asArray(reply.replies)) changed += cleanReplyTracking(child);
	return changed;
}
