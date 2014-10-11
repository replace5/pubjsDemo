(function(Sea, Win, Doc){
	// 基本目录配置
	var pubjs = '/pubjs/source/';
	var path = Win.location.href.split('#').shift();
	var root = path;
	var app, controller, jQuery, util, platform;

	// 获取并切换模块容器
	var _lastLayoutName = null;
	function getContainer(config){
		if (util.isString(config)){
			config = util.parse(config);
		}
		var c = util.extend({
			scenes: 'main',
			title: false,
			side: 0,  //侧边栏模式, 0为无侧边栏, 大于0对应config中的模块路径
			module: app.config('router/current_module'),
			action: app.config('router/current_action')
		}, config);

		platform
			.switchScenes(c.scenes)		// 更新场景
			.setTitle(c.title)			// 更新标题
			.update(c.side, c.module, c.action)  // 更新顶部导航状态

		if (_lastLayoutName){
			var cont = platform.getContainer(_lastLayoutName, 0, 1);
			if (cont){
				cont.hide();
			}
		}
		_lastLayoutName = c.module + '/' + c.action;
		return platform.getContainer(_lastLayoutName, c.scenes).show();
	}
	function getSideDOM(name) {
		if (platform) {
			return platform.getSideDOM(name);
		} else {
			return null;
		}
	}
	function updateMenu() {
		if (platform) {
			platform.updateMenu();
		}
	}
	function toggleSide(showSide) {
		if (platform) {
			platform.toggleSide(showSide);
		}
	}
	function getPlatformDom(name){
		if (platform){
			return platform.getDOM(name);
		}else {
			return null;
		}
	}

	// 项目根目录修正
	function ROOT(path){
		if (root && path.charAt(0) != '/'){
			return root + path;
		}
		return path;
	}

	// 框架根目录修正
	function PUBJS(path){
		if (path.charAt(0) != '/'){
			return pubjs + path;
		}
		return path;
	}

	Win.ROOT = ROOT;
	Win.PUBJS = PUBJS;
	Win._T = function(text){ return text; }


	// 返回SeaJS配置信息
	function sea_config(){
		return {
			base: ROOT("project/"),
			alias: {
				// 全局初始配置
				"sys_config":	ROOT("data/config.js"),
				'grobalVMConf': ROOT('data/global_VM_config.js'),

				// 基本模块缩写
				"app":			"@core/pub.js",
				"pubjs":		"@core/pub.js",
				"util":			"@core/util.js",
				"@controller":	"@plugins/controller.js",
				"@tpl":			"@plugins/template.js",
				"jquery":		"@libs/jquery/jquery-1.8.3.min.js"
			},
			paths: {
				// 目录缩写
				"@core":		PUBJS("core"),
				"@base":		PUBJS("base"),
				"@libs":		PUBJS("libs"),
				"@plugins":		PUBJS("plugins")
			},
			map: [
				[/^.*$/, function(url){
					/* 加入版本号码 */
					if (Win.VERSION){
						url += (url.indexOf('?') == -1 ? '?v=' : '&v=') + Win.VERSION;
					}
					return url;
				}]
			],
			preload:[
				Win.JSON ? "" : "@libs/json.js",
				Function.prototype.bind ? "" : "@libs/es5-safe.js",
				PUBJS('resources/css/uikit.min.css'),
				PUBJS('resources/css/app.css')
			],
			debug: 0
		};
	}

	// 分部初始化函数
	function INIT_PROCESS(){
		var cb = INIT_STEPS[INIT_STAGE++];
		if (cb){
			cb.apply(Win, arguments);
		}
	}
	var INIT_STAGE = 0;
	var INIT_STEPS = [
		// 修正页面路径
		function(){
			if (root.slice(-1) !== '/'){
				root = root.substr(0, root.lastIndexOf('/') + 1);
			}
			var node = Doc.getElementsByTagName('base');
			if (node.length){
				root = node[0].getAttribute('href');
				node[0].setAttribute('href', path);
			}
			pubjs = ROOT(pubjs.substring(1));
			// SeaJS全局配置
			Sea.config(sea_config());
			// 引入模块, 开始初始化
			Sea.use(['pubjs', 'sys_config', 'jquery', 'util'], INIT_PROCESS);
		},

		// 加载pubjs和系统全局配置
		function(pubjs, config, JQUERY, UTIL){
			app = pubjs;
			jQuery = JQUERY;
			util = UTIL;
			app.getContainer = getContainer;
			app.toggleSide = toggleSide;
			app.updateMenu = updateMenu;
			app.getSideDOM = getSideDOM;
			app.getPlatformDom = getPlatformDom;

			app.init(config);

			// 加载用户及控制器等插件模块
			app.use([
				'@plugins/controller',
				'@plugins/i18n',
				'@plugins/model',
				'@plugins/user',
				'@plugins/alert',
				'@plugins/codecopy',
				'@plugins/storage',
				'@plugins/mvvm'
			], INIT_PROCESS);
		},

		// 拉取用户数据user_data
		function(CONTROLLER){
			controller = CONTROLLER;
			app.data.get('/user/user_data', null, INIT_PROCESS);
		},

		// 系统模块初始化完成, 创建全局框架
		function(err, user_data){
			app.setUser(user_data);
			app.core.createAsync(
				'SYS_PLATFORM',
				'layout/platform.main',
				INIT_PROCESS
			);
		},

		// 配置完成, 启动应用
		function(PLATFORM){
			app.platform = platform = PLATFORM;
			app.DEFAULT_POPUP_CONTAINER = platform.getDOM('popup');
			// 移除初始加载界面
			jQuery('body').removeClass('appLoading');
			jQuery('.loadingBox, noscript').remove();
			// 启动路由
			controller.start();
			app.log('PubJS App BOOTED!!');
			// 若已登录
			if(app.isLogin()){
				// do somethings
			}


		}
	];

	// 初始化应用对象
	INIT_PROCESS();
})(seajs, window, document);
