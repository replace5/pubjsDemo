define(function(require, exports){
	var $ = require('jquery'),
		util = require('util'),
		pubjs = require('pubjs'),
		view = require('@base/view');

	var Base = view.container.extend({
		init: function(config) {
			var self = this;
			config = pubjs.conf(config, {
				currentClass: 'M-accordionMenu-current',   // 当前激活的样式
				openClass: 'M-accordionMenu-open',         // 菜单打开的样式
				/*items: [
					{
						link: '123',
						html: '项目概述',
						icon: 'angle-right',    // 图标，对应fortawesome 中的uk-icon-angle-right, 优先显示图标，如无图标有子菜单，显示箭头
						openNewWindow: false,   // 是否新窗口打开
						hashMatch: '123'     @type [Array|RegExp|String]     // location.hash如果包含hashMatch,则该项激活
					},
					{
						html: '项目名称D',
						open: false,
						sub: [
							{
								link: '#sites',
								html: '实验管理',
								hashMatch: '#sites'
								sub: [
									link: '#main',
									html: 'xxx',
									hashMatch: '#main'
								]
							},
							{
								link: '#2',
								html: '实验报表',
								hashMatch: '123'
							}
						]
					}
				],*/
				'sub_key': 'sub',         // 子菜单名称属性
				'menu_html_key': 'html',  // 菜单名称属性名
				'menu_link_key': 'link'   // 菜单链接属性名
			});
			self.Super('init', arguments);
		},
		afterBuild: function() {
			var self = this,
				c = self.getConfig(),
				container = self.getContainer();
			self.addClass('M-accordionMenu');
			if (util.isArray(c.items)) {
				self.setData(c.items);
			}
			self.uiProxy(container, '.M-accordionMenu-head', 'click.accordionMenu', 'eventMenuToggle')
				.uiProxy(container, '.no-default-event', 'click', function(evt) {
					evt.preventDefault();
				});

		},
		reset: function() {
			var self = this;
			self.getDOM().empty();
			return self;
		},
		setData: function(items) {
			var self = this;
			self.reset();
			self.$menus = self.buildItems(items, self.getDOM(), 1);
		},
		/**
		 * 构建某一级菜单
		 * @param  {Array}   items  [当前级别菜单配置]
		 * @param  {jQuery}  target [菜单插入目标]
		 * @param  {Number}  level  [菜单层级，从1开始]
		 * @return {Array}          [返回创建后的菜单数据]
		 */
		buildItems: function(items, target, level) {
			var self = this,
				stack = [],
				ulDom = $('<ul class="M-accordionMenu-ul"/>').appendTo(target);

			// 子菜单需要影藏
			if (level > 1) {
				ulDom.hide();
			}
			ulDom.addClass('M-accordionMenu-ul-level' + level);
			util.each(items, function(item, i) {
				stack.push(self.buildItem(item, ulDom, i, level));
			});
			return stack;
		},
		/**
		 * 构建菜单的某一项
		 * @param  {Object}  item          [当前项配置]
		 * @param  {jQuery}  menuContainer [放置菜单子项的容器，通常为ul，菜单项为li]
		 * @param  {Number}  index         [当前项序号，从0开始]
		 * @param  {Number}  level         [菜单层级，从1开始]
		 * @return {Object}                [返回创建后的菜单项配置]
		 */
		buildItem: function(item, menuContainer, index, level) {
			var	itemDom,
				innerDom,
				itemIcon,
				itemHeader,
				itemHeaderC,
				self = this,
				itemData = {},
				c = self.getConfig(),
				itemSub = item[c['sub_key']],
				link = item[c['menu_link_key']],
				html = item[c['menu_html_key']],
				itemHasSub = util.isArray(itemSub) && itemSub.length;

			if (c['menu_html_key'] in item) {
				itemDom = $('<li class="M-accordionMenu-item"></li>').appendTo(menuContainer);
				itemDom.attr('data-index', index).attr('data-level', level).addClass('M-accordionMenu-item-level'+level);
				itemHeaderC = $('<div class="M-accordionMenu-head-con"></div>').appendTo(itemDom);
				itemHeader = $('<a href="' + (link || '#') + '" class="M-accordionMenu-head"></a>').appendTo(itemHeaderC);

				itemHeader.addClass('M-accordionMenu-head-level'+level);
				if (item.openNewWindow) {
					innerDom.attr('target', '_blank');
				}
				if (!link || itemHasSub) {
					itemHeader.addClass('no-default-event');
				}

				innerDom = $('<div class="M-accordionMenu-html"></div>').appendTo(itemHeader).html(html);

				itemData.el = itemDom;
				itemData.link = link;
				itemData.hasSub = itemHasSub;
				itemData.html = html;
				itemData.hashMatch = item.hashMatch;

				if (itemHasSub) {
					itemIcon = 'angle-right M-accordionMenu-arrow';
					itemData.sub = self.buildItems(itemSub, itemDom, ++level);
					if (item.open) {
						self.slideDownItem(itemDom, true);
					}
					itemDom.addClass('M-accordionMenu-hassub');
				} else {
					itemDom.addClass('M-accordionMenu-nosub');
				}

				itemIcon = item.icon || itemIcon;
				if (itemIcon) {
					$('<i class="M-accordionMenu-icon uk-icon-' + itemIcon + '"></i>').appendTo(itemHeader);
				}
			}
			return itemData;
		},
		/**
		 * 菜单展开
		 * @param  {jQuery}  itemDom   [要展开的菜单的上层dom]
		 * @param  {Boolean} noAnimate [true则无动画]
		 * @return {Undefined}
		 */
		slideUpItem: function(itemDom, noAnimate) {
			var self = this,
				openClass = self.getConfig('openClass'),
				subCon = itemDom.children('.M-accordionMenu-ul');
			if (subCon.length) {
				itemDom.removeClass(openClass)
						.children('.M-accordionMenu-head').find('.M-accordionMenu-arrow')
						.addClass('uk-icon-angle-right')
						.removeClass('uk-icon-angle-down');
				if (noAnimate) {
					subCon.slideUp(0);
				} else {
					subCon.slideUp();
				}
			}
		},
		/**
		 * 菜单收起
		 * @param  {jQuery}  itemDom   [要收起的菜单的上层dom]
		 * @param  {Boolean} noAnimate [true则无动画]
		 * @return {Undefined}
		 */
		slideDownItem: function(itemDom, noAnimate) {
			var self = this,
				openClass = self.getConfig('openClass'),
				subCon = itemDom.children('.M-accordionMenu-ul');
			if (subCon.length) {
				itemDom.addClass(openClass)
						.children('.M-accordionMenu-head').find('.M-accordionMenu-arrow')
						.addClass('uk-icon-angle-down')
						.removeClass('uk-icon-angle-right');
				if (noAnimate) {
					subCon.slideDown(0);
				} else {
					subCon.slideDown();
				}
			}
		},
		/**
		 * 检测hashMatch是否匹配url hash
		 * @param  {Array|String|RegExp}  hashMatch [要匹配的类型]
		 * @return {Boolean}                        [其中一个匹配则为真]
		 */
		isHashMatch: function(hashMatch) {
			var isMatched = false,
				hash = location.hash,
				type = $.type(hashMatch);
			switch (type) {
				case 'array':
					util.each(hashMatch, function(eachHashMatch) {
						isMatched = arguments.callee(eachHashMatch);
						return !isMatched;
					});
				break;
				case 'string':
					isMatched = hash.indexOf(hashMatch) !== -1;
				break;
				case 'regexp':
					isMatched = hashMatch.test(hash);
				break;
			}
			return isMatched;
		},
		/**
		 * 更新菜单内容
		 */
		update: function() {
			var self = this,
				currentClass = self.getConfig('currentClass'),
				currentParentClass = currentClass + '-parent';
			self.find('.' + currentClass).removeClass(currentClass).removeClass(currentParentClass);
			util.each(self.$menus, function(item, key) {
				if (item.hasSub) {
					util.each(item.sub, function(subItem) {
						if (self.isHashMatch(subItem.hashMatch)) {
							item.el.addClass(currentParentClass);
							subItem.el.addClass(currentClass);
							self.slideDownItem(item.el, true);
						}
					});
				} else if (self.isHashMatch(item.hashMatch)) {
					item.el.addClass(currentClass);
				}
			});
		},
		eventMenuToggle: function(ev) {
			var self = this,
				el = $(ev.currentTarget),
				openClass = self.getConfig('openClass'),
				itemDom = el.closest('.M-accordionMenu-item');

			if (itemDom.hasClass(openClass)) {
				self.slideUpItem(itemDom);
			} else {
				self.slideDownItem(itemDom);
			}
		}
	});

	exports.base = Base;
});