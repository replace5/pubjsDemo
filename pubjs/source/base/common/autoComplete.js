define(function(require, exports) {
	var $ = require('jquery'),
		util = require('util'),
		pubjs = require('pubjs'),
		view = require('@base/view');

	var Base = view.container.extend({
		init: function(config){
			var self = this;
			config = pubjs.conf(config, {
				'url': '',
				'param': null,
				/*'items': [
					{
						"name": '123',
						"link": '#'    //如果有link属性则表示为链接,可跳转
					}
				],*/
				'item_name_key': 'name',  //name对应的键名
				'item_link_key': 'link'   //链接对应的键名
			});
			self.$data = [];
			self.$doms = {};
			self.$param = {};
			self.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this,
				doms = self.$doms,
				container = self.getContainer();

			self.addClass('M-autoComplete');
			doms.input = $('<input type="text" >').appendTo(container);
			doms.closeBtn = $('<span class="M-autoComplete-close">X</span>').appendTo(container).hide();
			doms.menuWrap = $('<div class="M-autoComplete-menuWrap"/>').appendTo(container).hide();
			doms.arrow = $('<div class="M-autoComplete-menuWrap-arrow"/>').appendTo(doms.menuWrap);
			doms.menu = $('<div class="M-autoComplete-menu" />').appendTo(doms.menuWrap);
			doms.menuContent = $('<ul class="M-autoComplete-menuContent"/>').appendTo(doms.menu);
			doms.placeholder = $('<span class="M-autoComplete-placeholder"><i></i>搜索</span>').appendTo(container);

			self.createAsync(
				'complete_menu_scroller',
				'@base/common/base.scroller',
				{
					"target": doms.menu,
					"content": doms.menuContent,
					"dir": 'V',
					'pad': false,
					"watch": 200
				}
			);

			self.uiBind(doms.closeBtn, 'click.autoComplete', 'eventClearInput')
				.uiBind(doms.input, 'focus.autoComplete', 'eventInputFocus')
				.uiBind(doms.input, 'blur.autoComplete', 'eventInputBlur')
				.uiBind(doms.input, 'keyup.autoComplete', 'eventInputKeyup')
				.uiBind(doms.placeholder, 'click.placeholder', 'eventPlacehoderClick')
				.uiProxy(doms.menuContent, 'li', 'click.autoComplete', 'evnetItemClick')
		},
		reset: function() {
			var self = this,
				doms = self.$doms;
			doms.menuContent.empty();
			if (doms.input.val()) {
				doms.placeholder.hide();
			} else {
				doms.placeholder.show();
			}
			self.$data = [];
			return self;
		},
		setParam: function(param) {
			var self = this;
			self.$param = $.extend({}, param, self.getConfig('param'));
			return self;
		},
		load: function() {
			var self = this,
				param = self.$param;
			pubjs.data.get(self.getConfig('uri'), param, self);
			return self;
		},
		onData: function(err, data) {
			var self = this;
			if (!err && util.isArray(data.items)) {
				self.setData(data.items);
			}
		},
		setData: function(items) {
			var self = this,
				data = self.$data,
				doms = self.$doms,
				cfg = self.getConfig(),
				name = cfg['item_name_key'];
			util.each(items, function(item) {
				var itemDom, txtDom;
				if (name in item) {
					itemDom = $('<li>').appendTo(doms.menuContent);
					if (cfg['item_link_key'] in item) {
						txtDom = $('<a href="' + item[cfg['item_link_key']] + '"></a>').appendTo(itemDom);
					} else {
						txtDom = $('<span></span>').appendTo(itemDom);
					}
					txtDom.addClass('M-autoComplete-text').text(item[name]);
					data.push({
						"name": item[name],
						"el": itemDom
					})
				}
			});
			return self;
		},
		update: function() {
			var count = 0,
				self = this,
				data = self.$data,
				doms = self.$doms,
				inputTxt = doms.input.val();
			if (inputTxt) {
				doms.closeBtn.show();
				if ( util.isArray(data)) {
					util.each(data, function(item) {
						var txtDom, originTxt, html;
						if (item["name"].indexOf(inputTxt) !== -1) {
							txtDom = item['el'].find('.M-autoComplete-text');
							originTxt = txtDom.attr('data-originTxt') || txtDom.text();
							html = originTxt.replace(util.starRegExp(inputTxt), "<span class='M-autoComplete-matchText'>$&</span>");
							txtDom.html(html).attr('data-originTxt', originTxt);
							item["el"].show();
							++count;
						} else {
							item["el"].hide();
						}
					});
				}
			} else {
				doms.closeBtn.hide();
			}
			doms.menuWrap.toggle(!!count);
		},
		eventClearInput: function(evt, ele) {
			var self = this,
				doms = self.$doms;
			doms.input.val('');
			doms.menuWrap.hide();
			$(ele).hide();
		},
		eventInputFocus: function(evt) {
			var self = this;
			self.update();
			self.$doms.placeholder.hide();
		},
		eventInputBlur: function(evt) {
			var self = this,
				doms = self.$doms;
			if (!doms.input.val()) {
				doms.placeholder.show();
			}
			self.setTimeout(function() {
				doms.menuWrap.hide();
			}, 500);
		},
		eventInputKeyup: function(evt) {
			var self = this;
			self.update();
		},
		eventPlacehoderClick: function(evt) {
			this.$doms.input.focus();
		},
		evnetItemClick: function(evt) {
			var self = this,
				doms = self.$doms,
				el = $(evt.currentTarget)
			doms.input.val(el.text());
		}
	});
	exports.base = Base;
});