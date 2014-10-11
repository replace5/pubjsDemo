// 启动模块定义(路由模块)
define(function(require, exports){
	var Win = window,
		Loc = Win.location,
		Doc = Win.document,
		URL = Loc.href,
		app = null,
		tpl = null,
		ready = 0;

	// 定义路由操作状态
	var env = exports.env = {
		login: null,
		module: null,
		action: null,
		param: null,
		search: null,
		current: null,
		wait_template: false
	};

	/**
	 * 参数格式化
	 * @param  {String} search 附加参数字符串
	 * @return {Object}        格式化完的附加参数对象
	 * @preserve
	 */
	function _formatSearch(search){
		search = search.split("&");
		var p = {};
		for(var i =0;i<search.length;i++){
			search[i] = search[i].split("=");
			p[search[i].shift()] = search[i].join('=');
		}
		return p;
	}

	// 监听Hash变化事件
	function hashChanged(){
		URL = Loc.href;
		var hash = Loc.hash.replace(/^[#\/\!]+/, '');
		var search = hash.split('?');
		var param = search.shift().split('/');

		var module = param.shift();
		var action = param.shift();
		param  = param.join('/');
		search = search.join('?');

		run(module, action, param, search);
	}

	var tpl_file_name;
	function is_loading_template(){
		var loading = (tpl === true || (tpl && tpl.isLoading()));
		if (loading){
			env.wait_template = loading;
		}
		return loading;
	}
	function load_tpl_engin_callback(mod){
		tpl = mod;
		tpl.on('template_loaded', load_template_callback);
		tpl.load(tpl_file_name);
	}
	function load_template_callback(id, statue, loading){
		if (env.wait_template && !loading){
			env.wait_template = false;
			reload(true);
		}
	}
	function load_template(file){
		if (!tpl){
			// 模板引擎还没有加载, 加载引擎
			tpl = true;
			tpl_file_name = file;
			app.use('@plugins/template', load_tpl_engin_callback);
		}else if (tpl !== true && tpl.load(file)){
			// 模板文件还加载完成
			return true;
		}
		env.wait_template = true;
		return false;
	}


	// 重新加载当前操作
	function reload(silent){
		if (env.current){
			run.apply(exports, env.current);
		}
		// 发送全局消息
		if (!silent){
			app.core.cast('reload');
		}
	}

	// 定义无需登录检查的模块
	function run(module, action, param, search){
		var router = app.config('router') || {};

		env.module = module || router.default_module || 'default';
		env.action = action || router.default_action || 'main';
		env.param  = param || null;
		env.search = search || null;

		var isPublic = false, publics = router.publics || [];
		for (var i = publics.length - 1; i >= 0; i--) {
			if (env.module === publics[i]){
				isPublic = true;
				break;
			}
		}
		// 判断登录状态
		if (!isPublic && !app.isLogin()){
			var login_module = router.login_module || 'login';
			env.login = (env.module == login_module ? [] : [env.module, env.action, env.param, env.search]);
			env.module = login_module;
			env.action = router.login_action || 'main';
			env.param = env.search = null;
		}

		// 加载控制器
		require.async(app.config('app_base')+env.module, onRun);
	}

	function onRun(mod){
		// 已经被运行过, 防止快速点击的时候重复运行
		if (!env.module || !env.action) {return false;}

		// 模块加载完成，检查方法是否有效，有效则调用
		var act = 'on' + app.util.ucFirst(env.action);
		if (!mod){
			app.error('Module is missing - ' + env.module + ':' + act + '()');
		}else {
			var now = {
				name: env.module + app.util.ucFirst(env.action),
				module: env.module,
				action: env.action,
				param: env.param,
				search: env.search,
				method: act
			};

			env.current = [env.module, env.action, env.param, env.search];

			// 检查模版文件依赖
			if (mod.TEMPLATE_FILE && !load_template(mod.TEMPLATE_FILE)){
				return;
			}

			if (mod[act] && app.util.isFunc(mod[act])){
				// 设置当前运行模块信息到系统配置中
				app.config('router/current_module', env.module);
				app.config('router/current_action', env.action);

				// 处理附加seache参数
				if(now.search){
					now.search = _formatSearch(now.search);
				}

				// 模块预处理调用
				if (mod.beforeAction && app.util.isFunc(mod.beforeAction)){
					mod.beforeAction(exports, now, app);
					if (is_loading_template()){ return;	}
				}

				// 调用指定动作
				mod[act](exports, now, app);
				if (is_loading_template()){ return;	}

				// 模块后处理调用
				if (mod.afterAction && app.util.isFunc(mod.afterAction)){
					mod.afterAction(exports, now, app);
					if (is_loading_template()){ return;	}
				}
			}else {
				app.error('Action is invalid - ' + env.module + ':' + act + '()');
			}
			if (env.module == now.module && env.action == now.action && env.param == now.param){
				env.module = env.action = env.param = null;
			}
		}
	}

	exports.run = run;
	exports.reload = reload;
	exports.load_template = load_template;

	/**
	 * 路由切换方法
	 * @param  {String} uri 路由地址 / 数字表示跳转的历史
	 * @return {Undefined}  无返回值
	 */
	exports.navigate = function(uri){
		if (typeof(uri) == 'string'){
			if (uri.charAt(0) == '/'){
				Loc.href = uri;
			}else {
				Loc.hash = "#"+uri;
			}
		}else {
			Win.history.go(uri);
		}
	}

	// 登录成功回调功能
	exports.afterLogin = function(){
		if (env.login){
			var argvs = env.login;
			env.login = null;
			run.apply(exports, argvs);
		}else {
			var cur = env.current;
			var router = app.config('router') || {};
			var mod = router.login_module || 'login';
			var act = router.login_action || 'main';

			if (cur[0] == mod && cur[1] == act){
				exports.navigate('');
			}
		}
	}

	// 开始执行路由
	exports.start = function(context){
		app = context || app;
		if (app && !ready){
			ready = 1;
			if (('onhashchange' in Win) && (Doc.documentMode === undefined || Doc.documentMode==8)){
				if (Win.addEventListener){
					Win.addEventListener('hashchange', hashChanged, false);
				}else if (Win.attachEvent){
					Win.attachEvent('onhashchange', hashChanged);
				}else {
					Win.onhashchange = hashChanged;
				}
			} else {
				setInterval(function(){
					if (URL != Loc.href){ hashChanged.call(Win); }
				}, 150);
			}

			// 强制运行一次
			hashChanged();
		}
	}

	exports.plugin_init = function(pubjs, callback){
		app = pubjs;
		app.controller = exports;
		callback();
	}
});