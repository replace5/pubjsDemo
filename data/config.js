/********************
 *	系统全局配置信息
 ********************/
define(function(){
	var win = window;
	var host = win.location.host;
	var ROOT = win.ROOT;
	var SITEBASE = win.APP_SITEBASE || '/';

	return {
		// 调试模式
		debug: 2,
		// 默认路由入口
		router: {
			default_module: 'project',
			default_action: 'main',
			login_module: 'login',
			login_action: 'main',
			publics: ['login']
		},
		login: {
			cookie_expires: 30, // 保存30天
			user_cookie_name: 'bx_user_cookie'
		},
		// 站点首目录
		site_base: SITEBASE,
		// 站点地址格式化字符串
		site_url: SITEBASE + '%1/',
		// 控制器所在目录
		app_base: ROOT('controller/'),
		// 中间件基础目录
		plugin_base: 'plugins/',
		// 模板文件基础路径
		template_base: ROOT('tpl/'),
		// 系统名称
		app_title: _T('Tag Kong'),
		app_footer: _T('© 2014 Tag Kong'),
		app_logo: {
			title: _T('Tag Kong'),
			small: ROOT('resources/images/logo_small.png'),
			big: ROOT('resources/images/logo_big.png')
		},
		// 导航菜单设置
		app_channel: [
		],
		app_user_toolbar: [
			{text:_T("修改密码"), link:"#user/password"},
			{text:_T("退出"), link:"#login/logout"}
		],
		// 边栏模块配置
		app_side: {
		},

		// 数据中心参数配置
		data:{
			max_query: 10,
			points: {
				'/i18n': ROOT('i18n/')
				,'/user/login': '/site-login'                                       // 登录
				,'/user/logout': '/site/user/logout'                                // 登出
				,'/user/setpassword': '/site/user/editpassword'                     // 修改密码
				,'/user/user_data': '/site-logininfo'                               // 拉取用户信息
			}
		},
		// 进入对应路由所需要权限, hash和当前正则比较
		router_auth_map: {
		},
		// 权限对照关系
		auth_map: {
		},
		// 多语言配置
		language:{
			'default': 'zhCN',
			'cookie': 'lang',
			'style': ROOT('i18n/')
		}
	};
});