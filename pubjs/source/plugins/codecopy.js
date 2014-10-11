/**
 * 代码复制模块
 */
define(function(require, exports){
	var $ = require('jquery');
	var util = require('util');
	var app = null;
	var Module = null;
	var ModuleInstance = null;
	var und;

	var ModulePrototype = {
		init: function(config, parent){
			config = app.conf(config, {
				'width': 800,
				'data': null,
				"buttons": ['cancel', und],
				"buttonConfig":{
					"ok": und,
					"cancel": {"value": LANG("关闭"), "class": "uk-button-success"}
				},
				"class": 'M-dialogCodecopy uk-form',
				"showHead": false,
				"showClose": true
			});

			this.$tid = 0;
			this.$active = 0;
			this.$data = null;
			this.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			self.Super('afterBuild', arguments);

			var doms = self.$doms;
			// 生成标签容器
			doms.tabs = $('<ul class="uk-tab" />').appendTo(doms.body);
			// 生成说明消息容器
			doms.text = $('<p class="M-dialogCodecopyNote" />').appendTo(doms.body);
			// 生成代码显示框
			doms.code = $('<textarea class="M-dialogCodecopyCode" readonly />').appendTo(doms.body);
			// 操作提示信息
			doms.message = $('<p class="uk-text-success tc" />').appendTo(doms.body).hide();
			// 生成复制按钮代码
			doms.copy = $('<button class="uk-button M-dialogCodecopyCopy" />').text(LANG('复制代码')).appendTo(doms.body);

			// 绑定标签切换事件
			self.uiProxy(doms.tabs, 'li > a', 'click', 'eventChangeTab');
			self.uiBind(doms.copy, 'mouseenter', 'eventPrepareCopy');
		},
		// 切换标签回调事件
		eventChangeTab: function(evt, elm){
			elm = $(elm);
			var index = elm.attr('data-index');
			var item = this.$data[index];
			if (item){
				var doms = this.$doms;
				elm.parent()
					.addClass('uk-active')
					.siblings().removeClass('uk-active');
				doms.text.toggle(Boolean(item.text)).text(item.text);
				doms.code.val(item.code);
				doms.message.hide();
				this.$active = index;
				// 预加载粘贴板flash模块
				this.eventPrepareCopy(null, doms.copy);
			}
			return false;
		},
		// 准备复制内容事件
		eventPrepareCopy: function(evt, elm){
			var self = this;
			var item = self.$data[self.$active];
			if (item){
				Clip(item.code, elm, self.afterCopy, self);
			}
		},
		// 复制完成提示
		afterCopy: function(){
			var self = this;
			var dom = self.$doms.message;
			var item = self.$data[self.$active];
			dom.text(item.tip || LANG('复制成功! 请把代码粘贴在你的网站！')).show();
			if (self.$tid){
				clearTimeout(self.$tid);
			}
			self.$tid = setTimeout(function(){
				dom.hide();
			}, 5000);
		},
		// 设置代码内容
		setData: function(data){
			var self = this;
			var doms = self.$doms;
			var tabs = doms.tabs.empty();
			var count = 0;

			self.$data = [];
			self.$active = 0;
			util.each(data, function(item){
				$('<li><a href="#" data-index="'+count+'">' + util.html(item.title) + '</a></li>').appendTo(tabs);
				self.$data.push(item);
				if (!util.has(item, 'text')){
					item.text = LANG('请将下面的代码插入您的网站里');
				}
				count++
				if (count == 1){
					doms.text.toggle(Boolean(item.text)).text(item.text);
					doms.code.val(item.code);
				}
			});
			if (count){
				tabs.find('li:first').addClass('uk-active');
				self.show();
				// 预加载粘贴板flash模块
				self.eventPrepareCopy(null, doms.copy);
			}else {
				self.$data = null;
			}
			return self;
		}
	};

	function ModuleFactory(baseModule, configs){
		Module = exports.codecopy = baseModule.extend(ModulePrototype);
		ModuleInstance = app.core.create('SYSTEM_CODECOPY', Module);
		ModuleInstance.setData(configs).show();
	}

	function CodeCopy(configs){
		if (ModuleInstance){
			ModuleInstance.setData(configs).show();
		}else {
			app.loadModule('@base/dialog.base', configs, ModuleFactory);
		}
	}

	// Flash 粘贴板
	var zero = {
		flash: null,
		text: '',
		ready: false,
		callback: null,
		context: null,
		setText: function(text){
			this.text = text;
		},
		dispatch: function(evt, args){
			switch (evt){
				case 'load':
					this.flash.setHandCursor(true);
					this.ready = true;
				break;
				case 'dataRequested':
					this.flash.setText(this.text);
				break;
				case 'mouseOut':
					this.hide();
				break;
				case 'complete':
					if (this.callback){
						this.callback.call(this.context || window, evt, args);
					}
				break;
			}
		},
		hide: function(){
			if (this.div){
				this.div.css('top', -99999);
			}
		},
		build: function(){
			var url = app.ROOT_PATH + '/source/libs/clipboard/ZeroClipboard.swf';
			var html = [
				'<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" id="global-zeroclipboard-flash-bridge" width="100%" height="100%">',
				'<param name="movie" value="'+url+'"/>',
				'<param name="allowScriptAccess" value="always"/>',
				'<param name="scale" value="exactfit"/>',
				'<param name="loop" value="false"/>',
				'<param name="menu" value="false"/>',
				'<param name="quality" value="best" />',
				'<param name="bgcolor" value="#ffffff"/>',
				'<param name="wmode" value="transparent"/>',
				'<embed src="'+url+'" ',
				'loop="false" menu="false" quality="best" bgcolor="#ffffff" ',
				'width="100%" height="100%" name="global-zeroclipboard-flash-bridge" ',
				'allowScriptAccess="always" allowFullScreen="false" ',
				'type="application/x-shockwave-flash" wmode="transparent" ',
				'pluginspage="http://www.macromedia.com/go/getflashplayer" scale="exactfit"></embed>',
				'</object>'
			]
			this.div = $('<div />').css({position: 'absolute', zIndex: 9999}).appendTo('body').html(html.join(''));
			this.flash = document["global-zeroclipboard-flash-bridge"] || this.div.get(0).children[0].lastElementChild;
		}
	};

	function Clip(text, elm, cb, ctx){
		window.ZeroClipboard = zero;
		if (window.clipboardData){
			window.clipboardData.setData("Text", text);
			return;
		}
		if (!elm){
			zero.hide();
			return false;
		}
		if (!zero.flash){ zero.build(); }
		// 移动容器
		elm = $(elm);
		zero.div.css(elm.offset()).width(elm.width()).height(elm.height());
		zero.setText(text);
		zero.callback = cb;
		zero.context = ctx;
	}

	exports.plugin_init = function(pubjs, callback){
		app = pubjs;
		pubjs.codecopy = CodeCopy;
		pubjs.clip = Clip;
		callback();
	}
});