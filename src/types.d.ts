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
         * [动态] 去除广告卡片
         *
         * 是否启用此处修改
         *
         * @defaultValue true
         */
        AdCard?: boolean;
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
};
}
