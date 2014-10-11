define(function(require, exports){
	var util = require('util');

	/**
	 * 表格字段说明
	 */
	function Labels(){
		var numberFormat = this.numberFormat;
		/**
		 * 列表数据结构
		 * text: {String} 字段显示名字
		 * desc: {String} 字段备注文字
		 * field: {String} 数据字段名称
		 * format: {Function} 字段内容格式化函数 function(val)
		 * render: {Function} Table字段渲染函数 function(index, value, rowData)
		 * type: {String} 子表格图表类型 (sub - 子表格, button - 图表触发按钮, 不触发子表格容器创建和现实)
		 */
		this.config = {
			// 特殊类型字段
			'type_id': {text:LANG('序号')},
			'type_op': {text:LANG('操作')},
			'type_select': {text:LANG('选择')},

			// 表格图表
			'grid_trend': {
				text:LANG('趋势图'),
				mode:'chart',
				module:'grid/chart.trend',
				colors: ['#FF005F', '#0EC900'],
				series:[
					// {y_field:'clicks', label_field:'hour', group:'date', init:this.formatChartToday}
					{y_field:'pageviews', label_field:'date', param:{name:LANG('页面展示量(pv)')}},
					{y_field:'sessions', label_field:'date', param:{name:LANG('访问次数')}},
					{y_field:'visitors', label_field:'date', param:{name:LANG('独立访客数')}}
				]
			},
			'grid_day_compare': {
				text:LANG('今日昨日PV对比'),
				mode:'chart',
				module:'grid/chart.dayCompare',
				colors: ['#FF005F', '#0EC900'],
				series:[
					{y_field:'pageviews', label_field:'hour', param:{name:LANG('今天')}},
					{y_field:'pageviews2', label_field:'hour', param:{name:LANG('昨天')}}
				]
			},
			'grid_visitor': {
				text:LANG('访客列表'),
				mode:'chart',
				module:'popwin.visitorPop'
			},

			// 二级表格
			'grid_page': {text:LANG('受访内容'), mode:'sub', module:'tab/page.main'},
			'grid_page_landing': {text:LANG('进入页面'), mode:'sub', module:'grid/page_analytics.page_entrance'},
			'grid_loyalty':{text:LANG('访问质量'),mode:'sub', module:"tab/loyalty.main"},
			'grid_keyWord': {text:LANG('关键词'), mode:'sub', module:'grid/keyword.keyWord'},
			"grid_se":{text:LANG("搜索引擎"),mode:"sub", module:'grid/keyword.se'},
			"grid_referer":{text:LANG("来源列表"),mode:"sub", module:'tab/referer.main'},
			"grid_referer_url":{text:LANG("来源页面"),mode:"sub", module:'grid/referer.url'},
			"grid_page_url":{text:LANG("受访页面"),mode:"sub", module:'grid/page.page_url'},
			'grid_city':{text:LANG('城市'), mode:'sub', module:'grid/geo.city'},
			'grid_customs':{text:LANG("行为统计"),mode:'sub', module:"pages/customs.main"},
			'grid_utm_spot': {text:LANG('广告'), mode:'sub', module:'pages/ad.main'},
			"grid_geo":{text:LANG("地理特征"),mode:"sub", module:'tab/geo.main'},
			"grid_client":{text:LANG("访问设备"),mode:"sub", module:"tab/client.main"},

			'grid_visit':{text:LANG('访客来源'), mode:'sub'},
			'grid_flow':{text:LANG('上站时间'), mode:'sub'},
			'grid_utm_medium':{text:LANG('媒体'), mode:'sub'},
			'grid_gutm_medium':{text:LANG('媒体'), mode:'sub'},
			'grid_utm_keyword': {text:LANG('关键字'), mode:'sub'},
			'grid_gutm_campaign': {text:LANG('广告'), mode:'sub'},
			'grid_gutm_term': {text:LANG('关键字'), mode:'sub'},
			'grid_comp': {text:LANG('趋势图'), mode:'sub'},
			'grid_creative': {text:LANG('创意列表'), mode:'sub'},
			'grid_sweety': {text:LANG('创意包列表'), mode:'sub'},
			'grid_product': {text:LANG('产品列表'), mode:'sub'},
			'grid_campaign': {text:LANG('活动列表'), mode:'sub'},
			"grid_platform":{text:LANG("平台列表"),mode:"sub"},
			'grid_channel':{text:LANG('渠道'),mode:'sub'},
			'grid_ads':{text:LANG('广告位'),mode:'sub'},
			'grid_mediaChannel':{text:LANG('频道'),mode:'sub'},
			'grid_detail':{text:LANG("详情")},
			'grid_media':{text:LANG("媒体列表"),mode:'sub'},
			'grid_mediaAndAd':{text:LANG("媒体&广告位"),mode:'sub',module:"tab.mediaAndAd"},
			'grid_mediaAndAdCampaign':{text:LANG("媒体&广告位"),mode:'sub',module:"tab.mediaAndAdCampaign"},
			'grid_pixels':{text:LANG("窗口大小"),mode:'sub'},

			// 一般字段说明
			'Name':{text:LANG('名称')},
			'_id':{text:LANG('ID')},
			'Description':{text:LANG('描述')},
			'SweetyName': {text:LANG('创意包名称')},
			'SweetySizeLack': {text:LANG('尺寸')},
			'Status':{text:LANG('状态'), render: this.renderState},
			'pixelSize':{text:LANG('尺寸'), render: this.renderPixelSize},
			'FileType':{text:LANG('类型'), format: this.formatFileType},
			'Type':{text:LANG('物料类型')},
			'AdPageViews':{text:LANG('广告展示次数'), format: numberFormat},
			'AdUniqueVisit':{text:LANG('独立访客'),format: numberFormat},
			'register': {text:LANG('注册量'), format: numberFormat},
			'login': {text:LANG('登录量'), format: numberFormat},
			"click_rate":{text:LANG("点击率"),desc:LANG("前端广告被有效点击的比率（点击率=点击量/展示量*100%）"),format:this.formatRate},

			"reg_rate":{text:LANG("注册率"),format:this.formatRate},

			"back_avg_loadtime":{text:LANG("B_平均加载时间"),desc:LANG("落地页的加载时间是指从该落地页加载时，到落地页加载完成的时间。平均加载时间是指所有落地页的加载时间的平均值。<br />B代表落地页（Landing Page）。"),format:this.formatTime},
			'url':{text:LANG('前端网址')},
			'sitename':{text:LANG('前端网站名称')},
			'campaign_name':{text:LANG('前端广告活动')},
			'product_name':{text:LANG('前端游戏产品')},
			'platform_name':{text:LANG('前端平台名称')},
			'sweety_creative_name':{text:LANG('前端前端创意')},
			'sweety_name':{text:LANG('前端前端创意包')},
			'whisky_creative_name':{text:LANG('前端落地页创意')},
			'source0_id':{text:LANG('前端来源类型')},
			'source0_name':{text:LANG('前端来源类型')},
			'se':{text:LANG('前端搜索引擎')},
			'se_name':{text:LANG('前端搜索引擎')},
			'simword':{text:LANG('前端相关关键词')},
			'sim_level':{text:LANG('前端优化难度')},
			'sim_rate':{text:LANG('前端相关度')},
			'baidu_indexs':{text:LANG('前端百度收录量')},
			'referer_domain_name':{text:LANG('前端来源域名')},
			'referer_url_name':{text:LANG('前端来源页面')},
			// 'active_visitors':{text:LANG('前端活跃用户')},
			// 'new_pageviews':{text:LANG('前端新访客PV'),desc:LANG("新访客PV是指新访客产生的网页展示次数。")},
			'country_name':{text:LANG('国家')},
			'country_icon':{text:LANG('前端国家图标')},
			'region_name':{text:LANG('访客地区')},
			'region_location':{text:LANG('前端访客地区')},
			'city_name':{text:LANG('城市')},
			'isp_name':{text:LANG('网络接入商')},
			'resolution':{text:LANG('落地页分辨率')},
			'resolution_name':{text:LANG('分辨率')},
			'resolution_width':{text:LANG('落地页分辨率(宽)')},
			'resolution_height':{text:LANG('落地页分辨率(高)')},
			'pixels':{text:LANG('前端页面像素(万)')},
			// 'pixels_name':{text:LANG('前端页面像素(万)')},
			'language':{text:LANG('语言')},
			'language_name':{text:LANG('语言')},
			'os':{text:LANG('操作系统')},
			'os_name':{text:LANG('操作系统')},
			'os_type':{text:LANG('操作系统类型')},
			'os_type_name':{text:LANG('操作系统类型')},
			'os_version':{text:LANG('操作系统版本')},
			'os_subversion':{text:LANG('操作系统子版本')},
			'online':{text:LANG('前端在线状态')},
			'browser':{text:LANG('浏览器')},
			'browser_name':{text:LANG('浏览器')},
			'browser_type':{text:LANG('浏览器类型')},
			'browser_type_name':{text:LANG('浏览器类型')},
			'browser_version':{text:LANG('浏览器版本')},
			'browser_subversion':{text:LANG('浏览器子版本')},
			'platform_type':{text:LANG('前端平台')},
			'pageviews_per_session':{text:LANG('前端访问深度')},
			'page_url':{text:LANG('前端受访页面')},

			'page_url_title':{text:LANG('前端受访页面标题')},
			'page_domain_name':{text:LANG('前端受访域名')},
			'channel_name':{text:LANG('前端频道名称')},
			'speed':{text:LANG('前端访问速度')},
			'date':{text:LANG('前端日期')},

			// 'exit':{text:LANG('前端当前停留')},
			'begintime':{text:LANG('前端上站时间')},
			'endtime':{text:LANG('前端最后访问')},
			'ip':{text:LANG('IP地址')},
			'staytime':{text:LANG('前端停留时间')},
			'status':{text:LANG('前端状态')},
			// 'avg_loading_time':{text:LANG('前端平均加载时间')},
			// 'avg_stay_time':{text:LANG('前端平均停留时间(秒)')},
			// 'avg_pageviews':{text:LANG('前端平均访问深度')},

			'utm_campaign_caid':{text:LANG('前端活动ID')},
			'utm_campaign_mzcaid':{text:LANG('前端活动ID')},
			'utm_campaign_starttime':{text:LANG('前端开始时间')},
			'utm_campaign_endtime':{text:LANG('前端结束时间')},
			'utm_spot_spid':{text:LANG('前端广告ID')},
			'utm_spot_mzspid':{text:LANG('前端广告ID')},
			'utm_spot_pubid':{text:LANG('前端网站ID')},
			'utm_keyword_kwid':{text:LANG('前端关键词ID')},
			'utm_keyword_mzkwid':{text:LANG('前端关键词ID')},
			'utm_keyword_name':{text:LANG('前端关键词')},
			'utm_keyword_url':{text:LANG('前端URL')},
			'ips':{text:LANG('独立IP数')},
			'channel_sessions':{text:LANG('前端访问次数')},
			'channel_visitors':{text:LANG('前端独立访客数(UV)')},
			// 'bounces':{text:LANG('前端跳出次数')},
			'total_pagestay':{text:LANG('前端总停留时间')},
			'total_pagespeed':{text:LANG('前端总加载时间')},
			// 'new_visitors':{text:LANG('新访客量'),desc:LANG("新访客是指在历史统计周期内没有见过的访问者。<br />新访客量是指新访客的数量。")},
			// 'old_visitors':{text:LANG('老访客量'),desc:LANG("老访客是指在历史统计周期内出现过的访问者。老访客 量是指老访客的数量。")},
			'old_visitor_rate':{text:LANG('老访客比例'),desc:LANG("老访客量在独立访客量中的占比（老访客比例=老访客量/UV量*100%）")},
			'pagestay':{text:LANG('前端平均停留时间')},
			// 'sessions':{text:LANG('回访数'),format:numberFormat},
			'depth_name':{text:LANG('前端访问深度')},
			'tag':{text:LANG('前端关键词分组')},
			'client':{text:LANG('前端客户端')},
			'over':{text:LANG('前端在线状态')},
			'session':{text:LANG('前端访问人次')},
			'invalid_sessions':{text:LANG('前端无效访问数')},
			'def':{text:LANG('前端默认')},
			'traffic':{text:LANG('前端流量指标')},
			'quality':{text:LANG('前端质量指标')},
			'reserve':{text:LANG('前端转化指标')},
			'custom':{text:LANG('前端自定义')},
			'gutm_source_name':{text:LANG('前端广告来源')},
			'gutm_term_name':{text:LANG('前端关键词')},
			'gutm_medium_name':{text:LANG('前端媒体')},
			'gutm_content_name':{text:LANG('前端广告内容')},
			'gutm_campaign_name':{text:LANG('前端广告')},
			'advertise_name':{text:LANG('前端来源分类')},
			'back_url':{text:LANG('落地页网址')},
			'back_sitename':{text:LANG('落地页网站名称')},
			'back_campaign_name':{text:LANG('落地页广告活动')},
			'back_product_name':{text:LANG('落地页游戏产品')},
			'back_platform_name':{text:LANG('落地页平台名称')},
			'back_sweety_creative_name':{text:LANG('落地页前端创意')},
			'back_sweety_name':{text:LANG('落地页前端创意包')},
			'back_whisky_creative_name':{text:LANG('落地页落地页创意')},
			'back_source0_id':{text:LANG('落地页来源类型')},
			'back_source0_name':{text:LANG('落地页来源类型')},
			'back_se':{text:LANG('落地页搜索引擎')},
			'back_se_name':{text:LANG('落地页搜索引擎')},
			'back_keyword_name':{text:LANG('落地页关键词')},
			'back_simword':{text:LANG('落地页相关关键词')},
			'back_sim_level':{text:LANG('落地页优化难度')},
			'back_sim_rate':{text:LANG('落地页相关度')},
			'back_searchs':{text:LANG('落地页搜索量')},
			'back_baidu_indexs':{text:LANG('落地页百度收录量')},
			'back_referer_domain_name':{text:LANG('落地页来源域名')},
			'back_referer_url_name':{text:LANG('落地页来源页面')},
			'back_active_visitors':{text:LANG('落地页活跃用户')},
			'back_new_pageviews':{text:LANG('B_新访客展示量'),desc:LANG("落地页被新访客浏览的次数。<br />B代表落地页（Landing Page）。"),format:numberFormat},
			'back_country_name':{text:LANG('落地页国家')},
			'back_country_icon':{text:LANG('落地页国家图标')},
			'back_region_name':{text:LANG('落地页访客地区')},
			'back_region_location':{text:LANG('落地页访客地区')},
			'back_city_name':{text:LANG('落地页城市')},
			'back_isp_name':{text:LANG('落地页网络接入商')},
			'back_entrance_url_name':{text:LANG('落地页入口页')},
			'back_resolution':{text:LANG('落地页分辨率')},
			'back_resolution_name':{text:LANG('落地页分辨率')},
			'back_resolution_width':{text:LANG('落地页分辨率(宽)')},
			'back_resolution_height':{text:LANG('落地页分辨率(高)')},
			'back_pixels':{text:LANG('落地页页面像素(万)')},
			'back_pixels_name':{text:LANG('落地页页面像素(万)')},
			'back_language':{text:LANG('落地页语言')},
			'back_language_name':{text:LANG('落地页语言')},
			'back_os':{text:LANG('落地页操作系统')},
			'back_os_name':{text:LANG('落地页操作系统')},
			'back_os_type':{text:LANG('落地页操作系统类型')},
			'back_os_type_name':{text:LANG('落地页操作系统类型')},
			'back_os_version':{text:LANG('落地页操作系统版本')},
			'back_os_subversion':{text:LANG('落地页操作系统子版本')},
			'back_online':{text:LANG('落地页在线状态')},
			'back_browser':{text:LANG('落地页浏览器')},
			'back_browser_name':{text:LANG('落地页浏览器')},
			'back_browser_type':{text:LANG('落地页浏览器类型')},
			'back_browser_type_name':{text:LANG('落地页浏览器类型')},
			'back_browser_version':{text:LANG('落地页浏览器版本')},
			'back_browser_subversion':{text:LANG('落地页浏览器子版本')},
			'back_platform_type':{text:LANG('落地页平台')},
			'back_pageviews_per_session':{text:LANG('落地页访问深度')},
			'back_page_url':{text:LANG('落地页受访页面')},
			'back_page_url_name':{text:LANG('落地页受访页面')},
			'back_page_url_title':{text:LANG('落地页受访页面标题')},
			'back_page_domain_name':{text:LANG('落地页受访域名')},
			'back_channel_name':{text:LANG('落地页频道名称')},
			'back_speed':{text:LANG('落地页访问速度')},
			'back_date':{text:LANG('落地页日期')},
			'back_entrance':{text:LANG('落地页入口页面')},
			'back_exit':{text:LANG('落地页当前停留')},
			'back_begintime':{text:LANG('落地页上站时间')},
			'back_endtime':{text:LANG('落地页最后访问')},
			'back_ip':{text:LANG('落地页IP地址')},
			'back_staytime':{text:LANG('落地页停留时间')},
			'back_status':{text:LANG('落地页状态')},
			'back_avg_staytime':{text:LANG('B_平均停留时间(秒)'),desc:LANG("落地页的停留时间是指用户在一个落地页的停留时间。平均停留时间是指所有落地页的停留时间的平均值。<br />B代表落地页（Landing Page）。")},
			'back_avg_pageviews':{text:LANG('落地页平均访问深度')},
			'back_avg_pagepixels':{text:LANG('B_平均窗口大小'),desc:LANG("窗口大小是指落地页可视窗口大小。平均窗口大小是指所有落地页的窗口大小的平均值。<br />B代表落地页（Landing Page）。")},
			'back_utm_campaign_caid':{text:LANG('落地页活动ID')},
			'back_utm_campaign_mzcaid':{text:LANG('落地页活动ID')},
			'back_utm_campaign_name':{text:LANG('落地页活动名称')},
			'back_utm_campaign_starttime':{text:LANG('落地页开始时间')},
			'back_utm_campaign_endtime':{text:LANG('落地页结束时间')},
			'back_utm_spot_spid':{text:LANG('落地页广告ID')},
			'back_utm_spot_mzspid':{text:LANG('落地页广告ID')},
			'back_utm_spot_position':{text:LANG('落地页位置')},
			'back_utm_spot_channel':{text:LANG('落地页频道')},
			'back_utm_spot_website':{text:LANG('落地页媒体')},
			'back_utm_spot_pubid':{text:LANG('落地页网站ID')},
			'back_utm_keyword_kwid':{text:LANG('落地页关键词ID')},
			'back_utm_keyword_mzkwid':{text:LANG('落地页关键词ID')},
			'back_utm_keyword_name':{text:LANG('落地页关键词')},
			'back_utm_keyword_url':{text:LANG('落地页URL')},
			'back_ips':{text:LANG('落地页IP')},
			'back_pageviews':{text:LANG('B_展示量'),desc:LANG("落地页被访问者浏览的次数。<br />B代表落地页（Landing Page）。"),format:numberFormat},
			'back_sessions':{text:LANG('落地页访问次数'),format:numberFormat},
			'back_visitors':{text:LANG('B_独立访客量'),desc:LANG("独立访客(Unique Visitor)，简称UV，指在一个特定时间周期内(DSP的周期是一天)，访问过该落地页，具有唯一访问标识Cookie的访问者。B_独立访客量是指落地页独立访客数的数量。）<br />B代表落地页（Landing Page）。"),format:numberFormat},
			'back_channel_sessions':{text:LANG('落地页访问次数')},
			'back_channel_visitors':{text:LANG('落地页独立访客数(UV)')},
			'back_bounces':{text:LANG('落地页跳出次数')},
			'back_total_pagestay':{text:LANG('落地页总停留时间')},
			'back_total_pagespeed':{text:LANG('落地页总加载时间')},
			'back_new_visitors':{text:LANG('B_新访客量'),desc:LANG("新访客是指在历史统计周期内没有见过的访问者。新访客量是指新访客的数量。<br />B代表落地页（Landing Page）。"),format:numberFormat},
			'back_new_visitor_rate':{text:LANG('B_新访客比例'),desc:LANG("新访客量在独立访客量中的占比（B_新访客比例=B_新访客量/B_UV量*100%）。<br />B代表落地页（Landing Page）。"),format:this.formatRate},
			'back_old_visitors':{text:LANG('B_老访客量'),desc:LANG("老访客是指在历史统计周期内出现过的访问者。老访客 量是指老访客的数量。<br />B代表落地页（Landing Page）。"),format:numberFormat},
			'back_old_visitor_rate':{text:LANG('B_老访客比例'),desc:LANG("老访客量在独立访客量中的占比（B_老访客比例=B_老访客量/B_UV量*100%）。<br />B代表落地页（Landing Page）。"),format:this.formatRate},
			'back_pagestay':{text:LANG('落地页平均停留时间(秒)')},
			'back_entrances':{text:LANG('落地页入口页次数')},
			'back_exits':{text:LANG('落地页出口页次数')},
			'back_bounce_rate':{text:LANG('落地页跳出率')},
			'back_reviews':{text:LANG('落地页访问次数')},
			'back_reviewslot':{text:LANG('落地页访问次数')},
			'back_reviewslot_name':{text:LANG('落地页访问次数')},
			'back_depth':{text:LANG('落地页访问深度')},
			'back_depth_name':{text:LANG('落地页访问深度')},
			'back_stayslot':{text:LANG('落地页停留时间')},
			'back_stayslot_name':{text:LANG('落地页停留时间')},
			'back_clicks':{text:LANG('B_点击累计数'),desc:LANG("落地页被访问者有效点击的次数(累计同一个展示的点击)。<br />B代表落地页（Landing Page）。"),format:numberFormat},
			'back_click':{text:LANG('B_点击数'),desc:LANG("落地页被访问者有效点击的次数(不累计同一个展示的点击)。<br />B代表落地页（Landing Page）。"),format:numberFormat},
			"back_click_rate":{text:LANG("B_点击率"),desc:LANG("落地页被有效点击的比率（B_点击率=B_点击量/B_展示量*100%）。<br />B代表落地页（Landing Page）。"),format:this.formatRate},
			'back_inclick':{text:LANG('落地页站内点击')},
			'back_outclick':{text:LANG('落地页站外点击')},
			'back_stop':{text:LANG('落地页静止时间')},
			'back_inputs':{text:LANG('B_输入次数'),desc:LANG("输入次数是指访问者在落地页上的键盘按键的次数。<br />B代表落地页（Landing Page）。"),format:numberFormat},
			'back_tag':{text:LANG('落地页关键词分组')},
			'back_client':{text:LANG('落地页客户端')},
			'back_reserve0':{text:LANG('落地页注册')},
			'back_reserve1':{text:LANG('落地页邮件验证')},
			'back_reserve2':{text:LANG('落地页订单数')},
			'back_reserve3':{text:LANG('落地页订单金额')},
			'back_reserve4':{text:LANG('落地页订单确认')},
			'back_over':{text:LANG('落地页在线状态')},
			'back_session':{text:LANG('落地页访问人次')},
			'back_invalid_sessions':{text:LANG('落地页无效访问数')},
			'back_label0_name':{text:LANG('落地页按钮名称')},
			'back_label1_name':{text:LANG('落地页统计项1')},
			'back_label2_name':{text:LANG('落地页统计项2')},
			'back_label3_name':{text:LANG('落地页统计项3')},
			'back_value0_name':{text:LANG('落地页点击次数')},
			'back_value1_name':{text:LANG('落地页统计值1')},
			'back_value2_name':{text:LANG('落地页统计值2')},
			'back_value3_name':{text:LANG('落地页统计值3')},
			'back_def':{text:LANG('落地页默认')},
			'back_traffic':{text:LANG('落地页流量指标')},
			'back_quality':{text:LANG('落地页质量指标')},
			'back_reserve':{text:LANG('落地页转化指标')},
			'back_custom':{text:LANG('落地页自定义')},
			'back_gutm_source_name':{text:LANG('落地页广告来源')},
			'back_gutm_term_name':{text:LANG('落地页关键词')},
			'back_gutm_medium_name':{text:LANG('落地页媒体')},
			'back_gutm_content_name':{text:LANG('落地页广告内容')},
			'back_gutm_campaign_name':{text:LANG('落地页广告')},
			'back_advertise_name':{text:LANG('落地页来源分类')},
			"back_old_pageviews":{text:LANG("B_老访客展示量"),desc:LANG("落地页被老访客浏览的次数。<br />B代表落地页（Landing Page）。")},

			// 广告位信息
			'ads_name':{text:LANG('广告位名称'), field:'Name'},
			'ads_size':{text:LANG('广告位尺寸'), render:this.renderPixelSize},
			'ads_price':{text:LANG('资源底价'), field:'BidFloor',format:function(val){return _formatCurrency(val/100, false, 2);}},
			'ads_type':{text:LANG('资源类型'), field:'AdType'},
			'ScreenName':{text:LANG('屏次'), format:formatPositionProp, align:'center'},
			'LocQualityName':{text:LANG('资源类型'), format:formatPositionProp, align:'center'},
			'AdsPreview':{text:LANG('预览'), format:formatPositionPreview, align:'center'},
			"impressions":{text:LANG('展示量'),format:numberFormat,desc:LANG("前端广告被访问者浏览的次数")},
			"new_impressions":{text:LANG('新访客展示量'),desc:LANG("前端广告被新访客浏览的次数"),format:numberFormat},
			"old_impressions":{text:LANG("老访客展示量"),desc:LANG("前端广告被老访客浏览的次数"),format:numberFormat},
			"pagepixels":{text:LANG('窗口大小'),format:numberFormat},
			"cost":{text:LANG('总成本(元)'),desc:LANG("RTB活动总成本：活动消费的总费用。<br /><br />代理活动总成本根据广告位单价和计价方式来区分：<br />CPM方式的总成本：暂无法计算。<br />CPC方式的总成本：CPC单价*点击量。<br />CPA方式的总成本：CPA价格*注册量。<br />CPS方式的总成本：暂无法计算。"),format:this.formatCurrency},
			"back_regs":{text:LANG("注册量"),desc:LANG("注册游戏的用户数量。"),format:numberFormat},
			"back_reg_click_rate":{text:LANG("点击注册率"),desc:LANG("点击注册率=注册量/点击量*100%。"),format:this.formatRate},
			"back_reg_rate":{text:LANG("B_注册率"),desc:LANG("落地页注册率=注册数/B_展示量*100%<br />B代表落地页（Landing Page）。"),format:this.formatRate},
			"back_login_rate":{text:LANG("B_登录率"),desc:LANG("B_登录率=登录量/B_展示量*100%<br />B代表落地页（Landing Page）。"),format:this.formatRate},
			"back_logins":{text:LANG("登录量"),desc:LANG("登录游戏的用户数量，不包括新注册用户的数量。"),format:numberFormat},
			"back_login_click_rate":{text:LANG("点击登录率"),desc:LANG("点击登录率=登录量/点击量*100%。"),format:this.formatRate},
			"avg_click_cost":{text:LANG('点击单价(元)'),desc:LANG("指前端广告每次被点击所消费的费用(点击单价=总成本/点击量)"),format:this.formatCurrencyKeep3},
			"avg_reg_cost":{text:LANG("注册单价(元)"),desc:LANG("指游戏中的每个注册所消耗的费用(注册单价=总成本/注册量)。"),format:this.formatCurrency,render:this.renderAvgRegCost},
			"back_reach_cost":{text:LANG("到达单价(元)"),format:this.formatCurrency},
			"cpm":{text:LANG("CPM单价(元)"),desc:LANG("千次展现成本，简称CPM单价，指前端广告每展示1000次所付的费用(CPM单价=总成本*1000/展示量)。"),format:this.formatCurrencyKeep3},
			"reg_per_mile":{text:LANG("千次展现注册率"),desc:LANG("千次展现注册率=注册量/展示量*100%。"),format:this.formatRate},
			"login_per_mile":{text:LANG("千次展现登录率"),desc:LANG("千次展现登录率=登录量/展示量*100%。"),format:this.formatRate}
			,"CreateTime":{text:LANG("创建时间"),desc:LANG("数据被创建的时间。"),format:this.formatDate,type:'dim',sort:true}
			,"click_reach_rate":{text:LANG("点击到达率"),desc:LANG("点击到达率=B_展示量/点击量*100%<br />B代表落地页（Landing Page）。"),format:this.formatRateKeep2}
			,"MassMediaName":{text:LANG("媒体"), format:formatMediaName}
			,"MassChannelName":{text:LANG('频道'), format:formatMediaName}
			// "cpm":{text:LANG("CPM"),desc:LANG("")},
			// "cpc":{text:LANG("CPC"),desc:LANG("")},
			// "cpa":{text:LANG("CPA"),desc:LANG("")},
			// "cps":{text:LANG("CPS"),desc:LANG("")}
			,"pixels_name":{text:LANG("窗口大小")}

			// 竞价指标
			,'bid_num':{text:LANG('出价数'), type:'dim'}
			,'win_num':{text:LANG('成功出价数'), type:'dim'}
			,'win_rate':{text:LANG('竞价成功率'), type:'dim'}
			,'new_bid_num':{text:LANG('最新出价数'), type:'dim'}
			,'new_win_num':{text:LANG('最新成功出价数'), type:'dim'}
			,'new_win_rate':{text:LANG('最新竞价成功率'), type:'dim'}

			//clicki字段
			,'onlines':{text:LANG('在线访客数'), nick:LANG('在线访客'), format:numberFormat}
			,'visitor_id':{text:LANG('在线状态')}

			// ,'sessions':{text:LANG('会话次数'),format:numberFormat}

			,'old_visitors':{text:LANG('旧访客PV'), nick:LANG('老访客')}
			,'unit_price':{text:LANG('单价')}
			,'count':{text:LANG('数量')}
			,'amount':{text:LANG('总价')}
			,'active_visitors':{text:LANG('活跃用户')}
			,'utm_campaign_name':{text:LANG('活动名称')}
			,'utm_spot_position':{text:LANG('位置')}
			,'utm_spot_channel':{text:LANG('频道')}
			,'utm_spot_website':{text:LANG('媒体')}
			,'keyword_name':{text:LANG('关键字')}
			,'stayslot':{text:LANG('停留时间')}
			,'reviewslot':{text:LANG('访问次数'), field:'sessions'}
			,'depth':{text:LANG("访问深度")}
			,'entrance_url_id':{text:LANG('入口页面')}
			,'exit':{text:LANG('出口页面')}
			,'searchs':{text:LANG('搜索次数')}
			,"logins":{text:LANG("登陆次数"),format:numberFormat}
			,"login_peoples":{text:LANG("登陆人数"),format:numberFormat}
			,"regs":{text:LANG("注册人数"),format:numberFormat}
			,'shares':{text:LANG("分享次数"),format:numberFormat}
			,'share_peoples':{text:LANG("分享人数"),format:numberFormat}
			,'avg_view_space':{text:LANG("上一次访问平均间隔")}
			,'add_in_trolley':{text:LANG("加入购物车 ")}
			,'orders':{text:LANG("下单次数")}
			,'pays':{text:LANG("付费次数")}
			,'pay_peoples':{text:LANG("付费人数")}
			,'new_pay_peoples':{text:LANG("新增付费人数")}
			,'pay_count':{text:LANG("付款金额")}
			,'buys':{text:LANG("购买数量")}
			,'avg_consume_space':{text:LANG("上一次消费平均间隔")}
			,'page_url_name':{text:LANG('受访页面')}
			,'view_frequency':{text:LANG('访问频次')}
			,'reserve0':{text:LANG('订单数')}
			,'reserve1':{text:LANG('金额')}
			,'reserve2':{text:LANG('订单数')}
			,'reserve3':{text:LANG('订单金额')}
			,'reserve4':{text:LANG('订单确认')}

			// 受访内容的某些指标
			,"page_pv":{text:LANG("浏览量"), field:"pageviews"}
			,"page_sessions":{text:LANG("唯一浏览量"), field:"sessions"}

			// 字段修改@20131114 jing-dev 默认维度 12个
			// 页面浏览量改为了浏览量
			,'pageviews':{text:LANG('浏览量'), desc:LANG("页面浏览量指浏览的总页数。系统会计入对单页的重复浏览。"), format:numberFormat, nick:'展示量(PV)'}
			,'sessions':{text:LANG('访问次数'), desc:LANG("访问次数指网站获得的会话次数（Sessions）。一次会话是指网站被打开到网站被关闭的整个过程。"), format:numberFormat, nick:LANG('访问次数')}
			,'visitors':{text:LANG('独立访客数'), desc:LANG("独立访客数（日独立访客数）指一天内网站上的非重复（只计算一次）访问者人数。多天独立访客数则在每个单天基础上直接加和。"), format:numberFormat, nick:'独立访客(UV)'}
			,'avg_pageviews':{text:LANG('平均访问深度'), desc:LANG("平均访问深度（平均浏览页数）指您的网站上每次访问的平均网页浏览量。系统会计入对单页的重复浏览。")}
			,'avg_stay_time':{text:LANG('平均停留时间'), desc:LANG("访问会话的平均持续时间。"), format:_formatTimeSecond}
			,'bounce_rate':{text:LANG('跳出率'), desc:LANG("跳出率指访问者从进入页面离开网站而未与网页互动（自定义行为统计或自定义指标）的访问次数所占的百分比。"), format:_formatRate}
			,'avg_pagesize':{text:LANG('平均窗口大小'), desc:LANG("平均窗口大小指页面被浏览时的可视区域大小。如，200*200的广告其平均窗口大小约为4万像素。"), format: _formatPixels}
			,'new_pageviews':{text:LANG('新访客浏览量'), desc:LANG("初次访问网站的访客所产生的页面浏览量。")}
			,'new_visitor_rate':{text:LANG('新访客比例'), desc:LANG("初次访问网站的访客所占独立访客数量的百分比。"), format:this.formatRate}
			,'new_visitors':{text:LANG('新访客数'), desc:LANG("初次访问网站的访客数量。"), format:numberFormat, nick:LANG('新访客')}
			,'bounces':{text:LANG('跳出次数'), desc:LANG("跳出次数指访问者从进入页面离开网站而未与网页互动（自定义行为统计或自定义指标）的次数。")}
			,'avg_loading_time':{text:LANG('平均加载时间'), desc:LANG("平均加载时间指加载boot统计代码到第一个页面浏览量产生的平均时间。"), format:_formatTime}
			// 受访内容维度 15个
			,'entrances':{text:LANG('进入次数'), desc:LANG("进入次数指访问者从某个网页进入您网站的次数。")}
			,'exits_rate':{text:LANG('退出率'), desc:LANG("退出率指从某个网页退出网站的次数所占网页访问次数的百分比。"), format:_formatRate}
			,'avg_pagepixels':{text:LANG('平均页面窗口大小')}
			,'exits':{text:LANG('退出次数'), desc:LANG("退出次数指访问者从某个网页退出您的网站的次数。")}
			,"clicks":{text:LANG("点击次数"), desc:LANG("在网页中的总点击次数，无视点击区域是否有响应。Flash部分不计入在内。"), format:numberFormat}
			,'inputs':{text:LANG('输入次数'), desc:LANG("输入次数指用户焦点在网页的时候，键盘被敲击的次数。")}
			,'avg_staytime':{text:LANG('页面平均停留时间'), desc:LANG("页面平均停留时间指网页平均被打开（至关闭）时长。")}
			,'avg_loadtime':{text:LANG('平均加载时间')}
			,'inner_clicks':{text:LANG('站内点击'), desc:LANG("被点链接为站内链接的点击次数。站内链接指受访页面域名和目标网址域名一致的链接。")}
			,'outer_clicks':{text:LANG('出站点击'), desc:LANG("被点链接为站外链接的点击次数。站外链接指受访页面域名和目标网址域名不一致的链接。")}
			,'silent_time':{text:LANG('静止时间'), desc:LANG("访问者在30秒或更长的无任何行为（点击、输入等）的时间总和。")}
			// 浏览量改为了页面浏览量
			,'pageviews_page':{text:LANG("页面浏览量"), desc:LANG("浏览量指网页被浏览的总次数。系统会计入对单页的重复浏览。"), field:'pageviews',format:numberFormat}
			,'sessions_page':{text:LANG("页面访问次数"), desc:LANG("页面访问次数指网页被浏览的的访问次数。"), field:'sessions',format:numberFormat}
			,'visitors_page':{text:LANG("页面独立访客数"), desc:LANG("页面独立访客数指网页被浏览的独立访客数。"), field:'visitors',format:numberFormat}
			,'avg_stay_time_page':{text:LANG("页面平均停留时间"), desc:LANG("页面平均停留时间指网页平均被打开（至关闭）时长。"), field:'avg_page_staytime',format:_formatTimeSecond}

			,'entrance_url_name':{text:LANG('进入页面')}
			,'sessions_page_enter':{text:LANG("进入访问次数"),field:'sessions',format:numberFormat}
			,'visitors_page_enter':{text:LANG("进入访客数"),field:'visitors',format:numberFormat}
			,'sessions_page_exit':{text:LANG("退出访问次数"),field:'sessions',format:numberFormat}
			,'visitors_page_exit':{text:LANG("退出访客数"),field:'visitors',format:numberFormat}
		};

		// 自定义指标配置
		// TODO: 暂不知道这里的依赖，先注释掉
		/*
		var reserve = window.APP_RESERVE;
		if(reserve.id1){
			// 跟后端返回数据格式有关
			reserve = reserve.id1[0];
			// 需求暂时是两组自定义指标，命名从1开始
			for(var i = 1; i<=2; i++){
				// 分组记号
				var tag = (i!==1) ? i-1 : '';
				// 组数据
				var data = reserve['reserve'+i];
				for (var x = 0; x < data.length; x++) {
					this.config['reserve'+tag+x] = {text:LANG(data[x].name)};
				}
			}
		}
		*/
	}

	/**
	 * 格式化货币。
	 * 保留小数点后2位。
	 * @param  {Number} val  金额
	 * @param  {Bool}   pure 是否返回纯数字
	 * @param  {Number} size <可选> 保留的小数位数, 默认为2
	 * @return {String}      格式化后的字符串
	 * @private
	 * @todo 有谁敢提供个更好的方法么？
	 */
	function _formatCurrency(val, pure, size){
		if (isNaN(+size)){ size = 2; }
		val = util.round0(val, size);
		return (pure?"":LANG("￥"))+util.numberFormat(val);
	}

	/**
	 * 文件扩展名转换
	 */
	function _formatFileType(val){
		return val.toString().toUpperCase();
	}

	/**
	 * 格式化时间
	 * @param  {Number} ms 毫秒
	 * @return {String}    格式化完的数据
	 * @private
	 */
	function _formatTime(ms){
		ms = +ms;
		var format = "s.MMM"+LANG("秒");
		if(!isNaN(ms)){
			var sm = new Date();
			sm.setHours(0);
			sm.setMinutes(0);
			sm.setSeconds(0);
			sm.setMilliseconds(ms);
			sm = {
				"h":sm.getHours()
				,"m":sm.getMinutes()
				,"s":sm.getSeconds()
				,"M":sm.getMilliseconds()
			}
			format = format.replace(/(h+|m+|s+|M+)/g,function(v){
				var sv = sm[v.slice(0,v.charAt(0) === v.charAt(1)?1:3)];
				sv = v.length > 1 && v.charAt(0) === v.charAt(1) && sv<10?"0"+sv:sv;
				return sv
			});
			sm = null;
			return format;
		}else{
			return "";
		}
	}
	// 格式化时间的第二版本，以后可能用上，暂时保留
	/*
	function _formatTimeSecondV2(totalSecond) {
		if(!isNaN(totalSecond)){
			var result = '',
					timeDataArray = totalSecond.toString().split('.'),
					timeObj = new Date();
			timeObj.setHours(0);
			timeObj.setMinutes(0);
			timeObj.setSeconds(timeDataArray[0]);
			//timeObj.setMilliseconds(timeObj[1] || 0);

			// 小时
			var h = timeObj.getHours();
			if (h) {
				result += h + '小时';
			}
			// 分钟
			var m = timeObj.getMinutes();
			if (m) {
				result += m + '分钟';
			}
			// 秒
			var s = timeObj.getSeconds();
			if (s || result === '') {
				result += s + '秒';
			}

			return result;
		}else{
			return "";
		}
	}
	*/
	// 格式化时间的最终版本
	/**
	 * 格式化时间
	 * @param  {Number}  totalSecond 秒
	 * @return {String}    格式化完的数据
	 * @private
	 */
	function _formatTimeSecond(totalSecond) {
		if(!isNaN(totalSecond)){
			return (+totalSecond).toFixed(2) + '秒';
		}else{
			return "";
		}
	}

	/**
	 * 日期
	 * @param  {Number} ms 时间戳
	 * @return {String}    格式化完的数据
	 * @private
	 */
	function _formatDate(ts){
		return util.date("Y-m-d",ts);
	}

	/**
	 * 格式化百分率
	 * @param  {Float} rate 百分比小数
	 * @param {Number} size <可选> 保留的小数位位数, 默认为3位
	 * @return {String}     格式化完带百分号的数据
	 * @private
	 */
	function _formatRate(rate, size){
		if (isNaN(+size)){ size = 3; }
		rate = util.round0(rate * 100, size);
		return util.numberFormat(rate) + '%';
	}

	/**
	 * 格式化媒体名称
	 * @param  {String} val 媒体名称
	 * @return {String}     处理后的媒体名称
	 * @private
	 */
	function formatMediaName(val){
		if(!val){
			val = LANG('<i class="tdef">默认</i>');
		}
		return val;
	}

	function formatPositionProp(val){
		if (val){ return val; }
		return LANG('<i class="tdef">未设置</i>');
	}

	function formatPositionPreview(val){
		if (val){
			return '<a href="'+val+'" target="_blank">'+LANG("预览")+'</a>';
		}else {
			return '-';
		}
	}

	function _formatPixels(val){
		if (val === null){
			return '-';
		}else {
			return val + LANG('万像素');
		}
	}

	Labels.prototype = {
		get: function(){
			var a = arguments;
			for (var i=0; i<a.length; i++){
				if (this.config.hasOwnProperty(a[i])){
					return this.config[a[i]];
				}
			}
			return {text: LANG(a[0])};
		},
		/**
		 * 转换状态值为状态文字
		 */
		renderState: function(index, val, row){
			var text, cls = 'stateDisable';
			if (row.IsDraft){
				text = '草稿';
			}else {
				switch (val){
					case -2:
						text = '审核中';
					break;
					case -1:
						text = '未通过';
					break;
					case 1:
						text = '已通过';
						cls = 'stateEnable';
					break;
					case 2:
						text = '已停用';
					break;
					default:
						text = '待审核';
					break;
				}
			}
			return ('<span class="'+cls+'">' + text + '</span>');
		},
		/**
		 * 格式化货币。
		 */
		formatCurrency: function(val){
			return _formatCurrency(val, false, 2);
		},
		formatCurrencyKeep3: function(val){
			return _formatCurrency(val, false, 3);
		},
		formatFileType:_formatFileType,
		/**
		 * 像素大小格式化
		 */
		renderPixelSize: function(index, value, row){
			return row.Width + '*' + row.Height;
		},

		/**
		 * 渲染注册单价
		 * 当注册量为0时，显示注册单价为“-”
		 */
		renderAvgRegCost: function(id, text, dat){
			if(dat.back_regs === 0){
				return "-";
			}else {
				return text;
			}
		},
		/**
		 * 格式化时间
		 */
		formatTime:_formatTime,
		/**
		 * 日期
		 */
		formatDate:_formatDate,
		/**
		 * 格式化百分率
		 */
		formatRate: function(val){
			return _formatRate(val, 3);
		},
		formatRateKeep2: function(val){
			return _formatRate(val, 2);
		},
		numberFormat: function(val){
			return util.numberFormat(val, ',', 3);
		},
		/**
		 * 表格转换昨天和今天名称
		 */
		formatChartToday:function(item, data, config){
			var today = util.date('Y-m-d');
			if (item.name == today){
				item.name = LANG('今天');
			}else {
				item.name = LANG('昨天');
			}
		}
	}
	exports.labels = new Labels();

	/**
	 * 固定格式转换函数
	 */
	exports.format = {
		currency:_formatCurrency
		,fileType:_formatFileType
		,number: util.numberFormat
		,time:_formatTime
		,date:_formatDate
		,rate:_formatRate
	}
})

