export default {
	ADBlock: {
		Settings: {
			Splash: true,
			Feed: {
				AD: true,
				Activity: false,
				Vertical: false,
				BlockUpLiveList: "",
				Story: true,
				StoryCommercial: true,
			},
			Search: {
				AD: true,
				Tracking: false,
				HotSearch: true,
			},
			PGC: {
				AD: true,
			},
			Xlive: {
				AD: true,
				RemoveTrackingCallbacks: false,
				RemovePreloadTracking: false,
			},
			Dynamic: {
				HotTopics: true,
				MostVisited: false,
				MostVisitedLiveOnly: false,
				AdCard: true,
				PersonalAdCard: false,
			},
			View: {
				AD: true,
			},
			DM: {
				Command: false,
				Colorful: false,
			},
			Reply: {
				AD: true,
				CommercialLinks: false,
				SubjectDescriptionCommercial: false,
			},
			Privacy: {
				Tracking: true,
				BlockBiliCommercial: false,
				BlockThirdParty: false,
				Strict: false,
			},
		},
		Configs: {
			Feed: {
				StoryAdCardGotos: ["vertical_ad_av", "vertical_ad_picture", "vertical_ad_live", "vertical_pgc"],
			},
			Privacy: {
				TrackingParameters: [
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
				],
				TrackingFields: {
					JSON: ["report_flow_data", "track_id", "trackid"],
					Search: ["reportFlowData", "trackId", "trackid"],
				},
				URLFields: {
					JSON: ["appUrlSchema", "app_url_schema", "jumpUri", "jumpUrl", "jump_uri", "jump_url", "link", "pcUrl", "pc_url", "uri", "url"],
					Search: ["appUrlSchema", "jumpUri", "jumpUrl", "link", "liveLink", "pcUrl", "uri", "url"],
				},
			},
		},
	},
	Default: {
		Settings: {
			LogLevel: "WARN",
		},
	},
};
