define(function (require, exports) {
	var DOC = document,
		app = require("pubjs"),
		util = require('util'),
		$ = require("jquery"),
		view = require('@base/view');

	var Platform = app.Module.extend({
		init: function (config) {
			var self = this;
			self.$config = app.conf(config, {
				'target': 'body'
			});

			self.$ready = false;
			self.$activeScenes = null;
			self.$delayUpdate = false;
			self.$containers = {};
			self.$sideContainers = {};
			self.$sideWaits = {};
			self.build();
		},
		build: function () {
			var self = this;
			if (self.$ready) {
				return self;
			}
			self.$ready = true;

			// 构建框架模块
			var html = [
				'<div id="SCENES_MAIN" class="G-frameScenes">',
					'<div class="G-frameWrapper">',
						'<div class="G-frameHead">',
							'<div class="G-frameHeadLogo">',
								'<a href="/"><img border="0"/></a>',
							'</div>',
							'<ul class="G-frameHeadMenu"/>',
							'<div class="G-frameHeadToolbar">',
								'<div class="G-frameHeadLanguage">',
									'<a href="#i18n/zhCN" title="中文" class="G-frameHeadLanguageCN"/>',
									'<a href="#i18n/enUS" title="English" class="G-frameHeadLanguageEN"/>',
								'</div>',
							'</div>',
						'</div>',
						'<div class="G-frameBody">',
							'<div class="G-frameBodyInner">',
								'<div class="G-frameSideWrapper">',
									'<div class="G-frameSide" >',
										'<a href="##" class="G-frameSideCollapseBtn" ><i class="arrow-left"/></a>',
									'</div>',
									'<div class="G-frameFooter"/>',
								'</div>',
								'<div class="G-frameBodyContent" />',
							'</div>',
						'</div>',
					'</div>',
				'</div>',
				'<div id="SCENES_POPUP" class="G-frameScenes" />',
				'<div id="SCENES_LOGIN" class="G-frameScenes">',
				'<div class="G-frameLoginContainer" />',
				'</div>',
				'<div id="SCENES_PRELOADER"><b/><a/><em/><i/></div>'
			].join('');

			var body = self.$target = $(self.$config.get('target')).append(html);
			var doms = self.$doms = {
				'wrapper': $('.G-frameWrapper', body),
				'head': $('.G-frameHead', body),
				'logo': $('.G-frameHeadLogo', body),
				'channel': $('.G-frameHeadMenu', body),
				'toolbar': $('.G-frameHeadToolbar', body),
				'body': $('.G-frameBody', body),
				'side': $('.G-frameSide', body),
				'sideCollapseBtn': $('.G-frameSideCollapseBtn', body),
				'container': $('.G-frameBodyContent', body),
				'login_container': $('.G-frameLoginContainer', body),
				'footer': $('.G-frameFooter', body),
				'SCENES_MAIN': $('#SCENES_MAIN'),
				'SCENES_POPUP': $('#SCENES_POPUP'),
				'SCENES_LOGIN': $('#SCENES_LOGIN')
			};

			// 初始化动态内容
			var C = app.config;
			// body.toggleClass('G-frameWideScreen', (WIN.screen.availWidth > 1024));
			var viewport = util.getViewport();
			doms.body.height(viewport.height - doms.head.height());
			doms.login_container.height(viewport.height);

			// 内容标题栏设置
			self.$minHeight = doms.container.height();
			// self.setTitle(LANG('网站列表'));

			// 顶部信息设置
			doms.logo.find('a').attr('title', LANG(C('app_logo/title')))
				.find('img').attr('src', C('app_logo/small'));
			self.buildChannel();
			self.create('toolbar', UserToolbar, {target: doms.toolbar});

			doms.footer.html(C('app_footer'));

			self.uiBind($(window), 'resize.platform', 'eventViewportResize');
			self.uiBind(doms.sideCollapseBtn, 'click', 'eventCollapseSide');
			self.uiProxy(body, '.G-frameHeadLanguage > a', 'click', 'eventSwitchLang');
			self.uiProxy(doms.setup, '.uk-button', 'click', 'eventSetupClick');

			// 预加载图标文件, 2秒后删除
			setTimeout(function () {
				$('#SCENES_PRELOADER', body).remove();
			}, 2000);
		},
		// 构建大渠道列表
		buildChannel: function () {
			var list = [];
			util.each(app.config('app_channel'), function (item, idx) {
				// 权限过滤
				if (item.auth && !app.checkAuth(item.auth)) {
					return;// 没有权限, 不添加
				}

				list.push(
					'<li data-id="' + idx + '">',
					'<a href="' + item.link + '">',
						util.html(LANG(item.text)),
					'</a></li>'
				);
			});
			this.$doms.channel.html(list.join(''))
			// 更新菜单状态
			return this.updateChannel();
		},
		// 更新大渠道激活状态
		updateChannel: function (mod, act) {
			var C = app.config;
			var self = this;
			var channel = self.$doms.channel;
			var module = mod || C('router/current_module');
			var action = act || C('router/current_action');


			if (module && action){
				var index = -1;
				util.each(C('app_channel'), function(item, idx){
					var links = [];
					if (util.isArray(item.other)) {
						links = item.other;
					} else if (util.isString(item.other)) {
						links.push(item.other);
					}
					if (util.isString(item.link)) {
						links.push(item.link);
					}
					util.each(links, function(link) {
						var arr = link.split(/[#\/]+/, 3);
						if (arr[1] == module && (!arr[2] || arr[2] == action)){
							index = idx;
							return false;
						}
					});
					if (item.def){
						index = idx;
					}
				});
				if (index != -1){
					channel.find('li[data-id='+index+']')
						.addClass('act')
						.siblings().removeClass('act');
				}
			}

			// HACK: 当顶部导航只有一个时影藏导航
			channel.toggle(channel.find("li").length > 1);

			return self;
		},
		// 更新模块状态
		update: function(side, mod, act){
			var self = this;
			self.$delayUpdate = (self.$activeScenes !== 'MAIN');
			if (!self.$delayUpdate){
				self.updateChannel(mod, act);
				self.updateSide(side, mod, act);
			}else {
				self.$delayUpdate = [mod, act];
			}
			return self;
		},
		// 切换场景
		switchScenes: function(name){
			var self = this;
			var body = self.$target;

			name = name.toUpperCase();
			body.removeClass('appScenesLogin appScenesMain');
			switch (name){
				case 'MAIN':
					body.addClass('appScenesMain');
					break;
				case 'LOGIN':
					body.addClass('appScenesLogin');
					break;
				default:
					return self;
			}

			self.$activeScenes = name;
			if (name === 'MAIN' && self.$delayUpdate){
				self.update.apply(self, self.$delayUpdate);
			}

			return self;
		},
		toggleSide: function(showSide) {
			var self = this;
			self.$doms.body.toggleClass('G-frameBodyNoSide', !showSide);
			return self;
		},
		updateSide: function(sideMode, mod, action) {
			var uri, name, sideModule, callback;
			var self = this;
			var scons = self.$sideContainers;
			var side_cfg = app.config('app_side');

			if (!(sideMode in side_cfg)) {
				sideMode = 0;
			}
			self.toggleSide(!!sideMode);

			if (sideMode) {
				uri = side_cfg[sideMode];
				name = 'app_side_' + uri;

				scons[name] = scons[name] || {};
				scons[name]['current'] = scons[name]['current'] || {};
				scons[name]['current'][mod + '/' + action] = 1;

				callback = function(module) {
					delete self.$sideWaits[name];

					if ((app.config('router/current_module') + '/' + app.config('router/current_action')) in scons[name]['current']) {
						module.show().update();
					} else {
						module.hide();
					}

					scons[name]['module'] = module;
				};
				util.each(scons, function(sideInfo, sideName){
					if (util.isModule(sideInfo["module"])) {
						if (sideName !== name) {
							if (sideInfo["module"]) {
								sideInfo["module"].hide();
							}
						} else {
							sideModule = sideInfo["module"];
						}
					}
				});

				if (sideModule) {
					callback(sideModule);
				} else if (!(name in self.$sideWaits)) {
					self.$sideWaits[name] = 1;
					self.createAsync(
						name,
						uri,
						{
							target: self.getSideDOM(),
							'class': 'G-frameSideContainer',
							attr: {'side-container-name': name}
						},
						callback
					);
				}
			}
		},
		updateMenu: function() {
			var self = this,
				current_module = app.config('router/current_module'),
				current_action = app.config('router/current_action');
			util.each(self.$sideContainers, function(sideInfo){
				if (sideInfo['current'][current_module + '/' + current_action]) {
					sideInfo["module"].reload();
				}
			});
		},
		getSideDOM: function() {
			return this.$doms.side;
		},
		// 设置标题
		setTitle: function(title){
			if (title){
				DOC.title = title + ' - ' + app.config('app_title');
			}
			return this;
		},
		// 获取容器DOM对象
		getDOM: function(name){
			if (name === 'popup'){
				name = 'SCENES_POPUP';
			}
			if (!name || !this.$doms[name]){
				name = 'container';
			}
			return this.$doms[name];
		},
		getContainer: function(name, scenes, no_create){
			if (!name){ name = 'container'; }

			var self = this;
			var list = self.$containers;
			var cont = list[name];
			if (!cont){
				if (no_create){
					return null;
				}
				cont = list[name] = self.create(view.container, {
					target: self.getDOM(scenes + '_container'),
					attr: {'container-name': name}
				});
			}else {
				if (scenes){
					cont.appendTo(self.getDOM(scenes + '_container'));
				}
			}
			return cont;
		},
		eventCollapseSide: function(evt, ele) {
			var self = this,
				doms = self.$doms,
				collapseClass = 'G-frameSideCollapsed';
			if (doms.body.hasClass(collapseClass)) {
				doms.body.removeClass(collapseClass);
				doms.footer.show();
				//恢复隐藏的内容, 注意不要显示之前就隐藏的内容
				$(ele)
					.siblings().removeClass('G-frameSideCollapsed-hide')
					.end().find("i").removeClass('arrow-right').addClass('arrow-left');
			} else {
				doms.body.addClass(collapseClass);
				doms.footer.hide();
				//隐藏side除按钮外所有内容
				$(ele)
					.siblings().addClass('G-frameSideCollapsed-hide')
					.end().find("i").removeClass('arrow-left').addClass('arrow-right');
			}
			evt.preventDefault();
		},
		onSysUserLogin: function(){
			this.buildChannel();
		},
		// 语言切换响应事件
		eventSwitchLang: function(evt, elm){
			var lang = $(elm).attr('href').substr(6);
			app.i18n.load(lang);
			return false;
		},
		eventViewportResize: function(ev) {
			var doms = this.$doms,
				viewport = util.getViewport();
			doms.body.height(viewport.height - doms.head.height());
			doms.login_container.height(viewport.height);
		}
	});
	exports.main = Platform;

	/*
	 * 用户工具栏模块
	 * @param {Object}     config   导航设置
	 * @return {Undefined}          无返回值
	 */
	var UserToolbar = app.Module.extend({
		init: function (config) {
			var self = this;
			self.$config = app.conf(config, {
				'target': 'body',
				'list': app.config('app_user_toolbar')
			});

			self.$ready = false;
			self.$isShow = false;
			self.build();
		},
		build: function () {
			var self = this;
			if (self.$ready) {
				return self;
			}
			self.$ready = true;
			var c = self.$config.get();

			var html = [
				'<div class="G-frameUserToolbar">',
				'<div class="G-frameUserToolbarBox">',
					'<span class="G-frameUserToolbarName"/>',
					'<span class="uk-icon-caret-down"/>',
				'</div>',
				'<ul class="G-frameUserToolbarList"/>',
				'</div>'
			].join('');

			var target = $(c.target);
			target.append(html);

			var doms = self.$doms = {
				'name': $('.G-frameUserToolbarName', target),
				'box': $('.G-frameUserToolbarBox', target),
				'list': $('.G-frameUserToolbarList', target)
			};

			// 生产功能列表
			util.each(c.list, function (item) {
				doms.list.append(
					'<li><a href="' + item.link + '">' +
						util.html(LANG(item.text)) +
						'</a></li>'
				);
			});

			// 绑定事件
			self.uiBind(doms.box, 'click', 'eventButtonClick');

			self.update();
		},
		update: function () {
			var user = app.getUser();
			this.$doms.name.text(
				user && (user.username || user.email) || LANG('未登录')
			);
			return this;
		},
		unbindGlobal: function () {
			$(document).unbind('mouseup.usertoolbar');
			return this;
		},
		eventButtonClick: function () {
			var self = this;
			self.$isShow = !self.$isShow;
			self.$doms.list.toggle(self.$isShow);
			self.$doms.box.toggleClass('act', self.$isShow);
			if (self.$isShow) {
				self.uiBind(document, 'mouseup.usertoolbar', 'eventClickHide');
			} else {
				self.unbindGlobal();
			}
		},
		eventClickHide: function () {
			this.$isShow = false;
			this.unbindGlobal();
			this.$doms.box.toggleClass('act', this.$isShow);
			this.$doms.list.hide();
		},
		/**
		 * 用户登录后的响应函数
		 * @param  {Object}  ev 消息对象
		 * @return {Boolean}    阻止广播
		 */
		onSysUserLogin: function (ev) {
			this.update();
			return false;
		},
		/**
		 * 用户退出后的响应函数
		 * @param  {Object}  ev 消息对象
		 * @return {Boolean}    阻止广播
		 */
		onSysUserLogout: function (ev) {
			this.update();
			return false;
		}
	});
});