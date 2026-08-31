const TRACKING_PARAMETERS = new Set([
	"bsource",
	"from_comid",
	"from_source",
	"from_spmid",
	"from_trackid",
	"live_from",
	"msource",
	"report_flow_data",
	"search_from_source",
	"seid",
	"share_medium",
	"share_plat",
	"share_session_id",
	"share_source",
	"share_tag",
	"spm_id_from",
	"spmid",
	"track_id",
	"trackid",
	"unique_k",
	"vd_source",
]);

const URL_FIELDS = new Set(["appUrlSchema", "app_url_schema", "jumpUri", "jumpUrl", "jump_uri", "jump_url", "link", "pcUrl", "pc_url", "uri", "url"]);
const TRACKING_METADATA_FIELDS = new Set(["report_flow_data", "track_id", "trackid"]);

export function sanitizeUrlParameters(value, parameterNames) {
	if (typeof value !== "string" || value.length === 0) return value;
	const protocolRelative = value.startsWith("//");
	if (!protocolRelative && !/^[a-z][a-z\d+.-]*:\/\//i.test(value)) return value;
	const parameters = parameterNames instanceof Set ? parameterNames : new Set(parameterNames);

	try {
		const url = new URL(protocolRelative ? `https:${value}` : value);
		let changed = false;
		for (const name of [...url.searchParams.keys()]) {
			if (parameters.has(name.toLowerCase())) {
				url.searchParams.delete(name);
				changed = true;
			}
		}
		if (!changed) return value;
		const sanitized = url.toString();
		return protocolRelative ? sanitized.replace(/^https:/, "") : sanitized;
	} catch {
		return value;
	}
}

export function sanitizeUrl(value) {
	return sanitizeUrlParameters(value, TRACKING_PARAMETERS);
}

export function sanitizeUrlFields(value) {
	if (Array.isArray(value)) {
		value.forEach(sanitizeUrlFields);
		return value;
	}
	if (!value || typeof value !== "object") return value;

	for (const [key, child] of Object.entries(value)) {
		if (TRACKING_METADATA_FIELDS.has(key)) value[key] = undefined;
		else if (URL_FIELDS.has(key) && typeof child === "string") value[key] = sanitizeUrl(child);
		else if (child && typeof child === "object") sanitizeUrlFields(child);
	}
	return value;
}
