define(function(require, exports){
	var $ = require('jquery'),
		util = require('util'),
		pubjs = require('pubjs'),
		view = require('@base/view');

	var Project = view.container.extend({
		init: function(config) {
			var self = this;
			config = pubjs.conf(config, {
				url: '/side/project/list'
			});
			self.$doms = {};
			self.$dataReady = false;
			self.Super('init', arguments);
		},
		afterBuild: function() {
			var self = this,
				doms = self.$doms,
				container = self.getContainer();
			doms.search = $('<div class="G-frameSideSearch"/>').appendTo(container);
			doms.scrollerContainer = $('<div class="G-frameSideScrollerContainer"></div>').appendTo(container);
			doms.scrollerContent = $('<div class="G-frameSideScrollerContent"></div>').appendTo(doms.scrollerContainer);
			doms.menu = $('<div class="G-frameSideMenu"/>').appendTo(doms.scrollerContent);
			doms.createProjectBtn = $('<div class="G-frameSideBtn"> <i class="uk-icon-plus-circle"></i>' + LANG('添加项目') + '</div>').appendTo(doms.scrollerContent);
			self.createDelay(
				"app_side_search",
				"@base/autoComplete.base",
				{
					"target": doms.search,
					"class": 'G-frameSideSearchContent'
				}
			);
			self.createDelay(
				'menu_scroller',
				'@base/common/base.scroller',
				{
					"target": doms.scrollerContainer,
					"content": doms.scrollerContent,
					"dir": 'V',
					"size": 6,
					'pad': false,
					"watch": 200,
					"class": "G-frameSideScroller G-frameSideScrollerHide"
				}
			);
			self.createDelay(
				"app_side_menu",
				"@base/accordionMenu.base",
				{
					"target": doms.menu,
					"class": 'G-frameSideMenuProject'
				}
			);

			self.createDelay(true, function() {
				doms.scrollerContainer.height(doms.scrollerContainer.parent().height() - doms.search.outerHeight());
				self.load();
			});

			self.createAsync('add_project', 'dialog/project/addProject.main');

			self.uiBind('mouseover', 'eventSelfMouseOver');
			self.uiBind('mouseout', 'eventSelfMouseOut');
			self.uiBind(doms.createProjectBtn, 'click', 'eventCreateProject');
		},
		reset: function() {
			var self = this;
			self.get('app_side_menu').reset();
			self.$dataReady = false;
		},
		reload: function() {
			var self = this;
			self.reset();
			self.load();
		},
		load: function() {
			var self = this;
			if (!self.$dataReady) {
				pubjs.data.get(self.getConfig('url'), self);
			}
		},
		onData: function(err, data) {
			var self = this;
			if (util.isArray(data.items)) {
				self.setData(data.items, true);
			} else {
				pubjs.alert(LANG('加载菜单数据格式错误'));
			}
		},
		setData: function(items, isUpdate) {
			var menuData, searchList, sideMenu,
				self = this;
			menuData = self.buildMenuData(items);
			sideMenu = self.get('app_side_menu');
			sideMenu.setData(menuData);
			if (isUpdate) {
				sideMenu.update();
			}
			searchList = self.buildSearchList(items);
			self.get('app_side_search').setData(searchList);
			self.updateScroll();
			self.$dataReady = true;
		},
		//构建搜索数据配置信息
		buildSearchList: function(items) {
			var searchList = [];
			util.each(items, function(projectInfo) {
				if (util.isNumber(projectInfo["Id"]) && util.isString(projectInfo["Name"])) {
					searchList.push({
						name: projectInfo["Name"],
						link: '#project/experiment/' + projectInfo["Id"]
					});
				}
			});
			return searchList;
		},
		/**
		 * 构建菜单对应内容
		 * @param  {Array} items [拉取的数据items]
		 * @return {Array}       [构建好的菜单内容数组]
		 */
		buildMenuData: function(items) {
			var menuData = [];
			menuData.push({
				link: '#project/overview',
				html: LANG('概览'),
				hashMatch: /^(#project(\/overview|\/main|\/$|$)|$)/
			});

			util.each(items, function(projectInfo){
				var sub = [];
				if (util.isNumber(projectInfo["Id"]) && util.isString(projectInfo["Name"])) {
					sub.push({
						html: '<span>' + LANG('实验列表') + '</span><em style="display:none;" class="S-expericount">' + projectInfo["Count"] + '</em>',
						hashMatch: new RegExp('#project/experiment/' + projectInfo["Id"] + '$'),
						link: '#project/experiment/' + projectInfo["Id"]
					});
					sub.push({
						html: '<span>' + LANG('数据报表') + '</span>',
						hashMatch: new RegExp('#project/report/' + projectInfo["Id"]+ '$'),
						link: '#project/report/' + projectInfo["Id"]
					});
					sub.push({
						html: '<span>' + LANG('人群分类') + '</span>',
						hashMatch: new RegExp('#project/segment/' + projectInfo["Id"]+ '$'),
						link: '#project/segment/' + projectInfo["Id"]
					});
					menuData.push({
						html: projectInfo["Name"],
						sub: sub
					})
				}
			});

			return menuData;
		},
		updateScroll: function() {
			var self = this,
				scroller = self.get('menu_scroller');
			scroller.update();
		},
		update: function() {
			var self = this;
			self.get('app_side_menu').update();
		},
		eventSelfMouseOver: function(evt) {
			var self = this,
				scroller = self.get('menu_scroller');
			if (scroller) {
				scroller.removeClass('G-frameSideScrollerHide');
			}

		},
		eventSelfMouseOut: function(evt) {
			var self = this,
				scroller = self.get('menu_scroller');
			if (scroller) {
				scroller.addClass('G-frameSideScrollerHide');
			}

		},
		eventCreateProject: function(evt) {
			var self = this;
			self.get('add_project').reset().show();
		},
		onMenuHeightChange: function(ev) {
			var self = this;
			self.updateScroll();
		}
	});

	exports.project = Project;

	var Auth = view.container.extend({
		init: function(config) {
			var self = this;
			config = pubjs.conf(config, {
			});
			self.$doms = {};
			self.$dataReady = false;
			self.Super('init', arguments);
		},
		afterBuild: function() {
			var self = this,
				doms = self.$doms,
				container = self.getContainer();
			doms.menu = $('<div class="G-frameSideMenu"/>').appendTo(container);
			self.createAsync(
				"app_menu_auth",
				"@base/accordionMenu.base",
				{
					"target": doms.menu,
					"class": 'G-frameSideMenuPermission',
					"items": self.buildMenuData()
				}
			);
		},
		update: function() {
			var self = this;
			self.get('app_menu_auth').update();
		},
		/**
		 * 构建菜单对应内容
		 * @return {Array}       [构建好的菜单内容数组]
		 */
		buildMenuData: function() {
			var menuData = [];
			menuData.push({
				link: '#auth/user',
				html: LANG('用户管理'),
				hashMatch: /#auth(\/user|\/main|\/$|$)/
			});
			menuData.push({
				link: '#auth/authorize',
				html: LANG('授权管理'),
				hashMatch: '#auth/authorize'
			});
			menuData.push({
				link: '#auth/role',
				html: LANG('角色管理'),
				hashMatch: '#auth/role'
			});
			menuData.push({
				link: '#auth/syslog',
				html: LANG('系统监控'),
				hashMatch: '#auth/syslog'
			});
			return menuData;
		}
	});

	exports.auth = Auth;
});