export interface Settings {
    /**
     * [开屏] 去除广告
     *
     * 是否启用此处修改
     *
     * @defaultValue true
     */
    Splash?: boolean;
    Feed?: {
    /**
         * [推荐] 去除广告
         *
         * 是否启用此处修改
         *
         * @defaultValue true
         */
        AD?: boolean;
    /**
         * [推荐] 去除“活动大图”
         *
         * 是否启用此处修改
         *
         * @defaultValue false
         */
        Activity?: boolean;
    /**
         * [推荐] 去除竖屏视频
         *
         * 是否启用此处修改
         *
         * @defaultValue false
         */
        Vertical?: boolean;
    /**
         * [推荐] 屏蔽UP主直播推广
         *
         * 填写up主uid，以英文逗号隔开。
         *
         * @defaultValue ""
         */
        BlockUpLiveList?: string;
    /**
         * [首页] 去除短视频流广告
         *
         * 是否启用此处修改
         *
         * @defaultValue true
         */
        Story?: boolean;
    /**
         * [首页] 去除Story商业按钮
         *
         * 移除Story中的“助TA必火”等商业推广按钮，不删除视频卡片。
         *
         * @defaultValue true
         */
        StoryCommercial?: boolean;
};
    Search?: {
    /**
         * [搜索] 去除广告
         *
         * 是否启用此处修改
         *
         * @defaultValue true
         */
        AD?: boolean;
    /**
         * [搜索] 移除响应跟踪参数
         *
         * 清理SearchAll结果对象及跳转链接中的trackid、report_flow_data，不修改播放签名和预加载数据。
         *
         * @defaultValue false
         */
        Tracking?: boolean;
    /**
         * [搜索] 去除“热搜”
         *
         * 是否启用此处修改
         *
         * @defaultValue true
         */
        HotSearch?: boolean;
};
    PGC?: {
    /**
         * [番剧电影] 去除广告
         *
         * 是否启用此处修改
         *
         * @defaultValue true
         */
        AD?: boolean;
};
    Xlive?: {
    /**
         * [直播] 去除广告
         *
         * 是否启用此处修改
         *
         * @defaultValue true
         */
        AD?: boolean;
    /**
         * [直播] 移除推荐回调
         *
         * 移除直播推荐卡的show_callback与click_callback；可能影响推荐状态和翻页。
         *
         * @defaultValue false
         */
        RemoveTrackingCallbacks?: boolean;
    /**
         * [直播] 移除预载链接trackid
         *
         * 只移除直播small_card_v1.subtitle_style.link中的trackid，保留播放、清晰度和会话参数。
         *
         * @defaultValue false
         */
        RemovePreloadTracking?: boolean;
};
    Dynamic?: {
    /**
         * [动态] 去除“热门话题”
         *
         * 是否启用此处修改
         *
         * @defaultValue true
         */
        HotTopics?: boolean;
    /**
         * [动态] 去除“最常访问”
         *
         * 是否启用此处修改
         *
         * @defaultValue false
         */
        MostVisited?: boolean;
    /**
         * [动态] “最常访问”仅显示直播
         *
         * 是否启用此处修改
         *
         * @defaultValue false
         */
        MostVisitedLiveOnly?: boolean;
    /**
         * [动态] 去除广告卡片
         *
         * 是否启用此处修改
         *
         * @defaultValue true
         */
        AdCard?: boolean;
    /**
         * [动态] 去除个人流广告卡片
         *
         * 过滤DynAllPersonal与DynVideoPersonal中的cardType=15；当前抓包尚无广告阳性样本。
         *
         * @defaultValue false
         */
        PersonalAdCard?: boolean;
};
    View?: {
    /**
         * [用户投稿] 去除视频广告
         *
         * 是否启用此处修改
         *
         * @defaultValue true
         */
        AD?: boolean;
};
    DM?: {
    /**
         * [弹幕] 去除交互式弹幕
         *
         * 是否启用此处修改
         *
         * @defaultValue false
         */
        Command?: boolean;
    /**
         * [弹幕] 替换彩色弹幕
         *
         * 是否启用此处修改
         *
         * @defaultValue false
         */
        Colorful?: boolean;
    /**
         * [弹幕] 空降助手
         *
         * 是否启用此处修改
         *
         * @defaultValue false
         */
        Airborne?: boolean;
};
    Reply?: {
    /**
         * [评论] 去除广告
         *
         * 是否启用此处修改
         *
         * @defaultValue true
         */
        AD?: boolean;
    /**
         * [评论] 禁用普通评论商业跳转
         *
         * 保留普通评论正文与回复树，仅移除已识别商品链接的可点击映射。
         *
         * @defaultValue false
         */
        CommercialLinks?: boolean;
    /**
         * [评论] 隐藏编辑器商品能力
         *
         * 移除SubjectDescription中的商品与商业助手按钮(type 5/8)；当前抓包中它们均为隐藏状态。
         *
         * @defaultValue false
         */
        SubjectDescriptionCommercial?: boolean;
};
    Privacy?: {
    /**
         * [隐私] 移除响应链接跟踪参数
         *
         * 清理推荐、Story 与评论跳转链接中的高置信度归因参数，保留目标和界面功能参数。
         *
         * @defaultValue true
         */
        Tracking?: boolean;
    /**
         * [隐私] 阻止B站商业上报
         *
         * 本地成功响应conversion/mobile/v2与fees/wise，阻止相关请求上传。
         *
         * @defaultValue false
         */
        BlockBiliCommercial?: boolean;
    /**
         * [隐私] 阻止第三方广告归因
         *
         * 本地响应已确认的千问与Solar Engine广告展示、点击和归因请求。
         *
         * @defaultValue false
         */
        BlockThirdParty?: boolean;
    /**
         * [隐私] 严格模式
         *
         * 同时启用响应跟踪清理、商业链接与上报阻断，并移除直播show/click callback；可能影响跳转、推荐和翻页。
         *
         * @defaultValue false
         */
        Strict?: boolean;
};
    /**
     * [调试] 日志等级
     *
     * 选择脚本日志的输出等级，低于所选等级的日志将全部输出。
     *
     * @remarks
     *
     * Possible values:
     * - `'OFF'` - 🔴 关闭
     * - `'ERROR'` - ❌ 错误
     * - `'WARN'` - ⚠️ 警告
     * - `'INFO'` - ℹ️ 信息
     * - `'DEBUG'` - 🅱️ 调试
     * - `'ALL'` - 全部
     *
     * @defaultValue "WARN"
     */
    LogLevel?: 'OFF' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'ALL';
}
