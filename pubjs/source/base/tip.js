define(function(require, exports){
	var $ = require('jquery');
	var pubjs = require('../core/pub');
	var util = require('../core/util');
	var view = require('./view');

	var DOCUMENG = document;
	var BODY_ELEMENT = DOCUMENG.body;
	var DOC_ELEMENT  = DOCUMENG.documentElement;
	var BODY_BOUND = (DOCUMENG.compatMode === "CSS1Compat" ? DOC_ELEMENT : BODY_ELEMENT);

	function has(need){
		return (has.string.indexOf(need) !== -1);
	}
	/**
	 * 自动隐藏参数值说明
	 *  'click': 点击标签或锚点或页面其他位置隐藏
	 *  'click_tip': 点击标签时隐藏
	 *  'click_anchor': 点击锚点时隐藏
	 *  'click_body': 点击页面上隐藏
	 *  'leave': 离开标签或离开锚点对象时隐藏
	 *  'leave_tip': 离开标签时隐藏
	 *  'leave_anchor': 离开锚点时隐藏
	 */
	var Base = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'target': pubjs.DEFAULT_POPUP_CONTAINER,
				'autoHide': 'click leave', // 鼠标离开控件区域自动隐藏
				'autoShow': true, // 创建后立刻显示
				'delayShow': 0, // 显示延迟时间
				'delayHide': 0, // 隐藏延迟时间
				'anchor': null, // 定位对象
				'pos': 'tm', // 定位模式
				'offsetX': 0, // 水平偏移位置
				'offsetY': 0, // 垂直偏移位置
				'width': null,
				'hasArrow': true
			});

			var self = this;
			self.$showTid = 0; // 延迟显示计时器
			self.$hideTid = 0; // 延迟隐藏计时器
			self.$autoTid = 0; // 自动隐藏计时器
			self.$skipClick = 0;
			self.$isShow = false;
			self.$visible = false;
			self.$anchor = null;
			self.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			self.addClass('M-tip');

			var c = self.getConfig();
			var el = self.getDOM();

			if (c.width){
				el.width(c.width);
			}

			// 保存锚点对象
			self.$anchor = c.anchor || null;

			// 生成基本结构
			self.$doms = {
				'content': $('<div class="M-tipContent" />').appendTo(el),
				'arrow': $('<div class="M-tipArrow" />').toggle(!!c.hasArrow).appendTo(el)
			};

			if (c.autoHide){
				self.$eventNamespace = '.tipHide' + util.guid();
				c.autoHide = ' ' + c.autoHide + ' ';
			}

			// 创建后自动显示
			if (c.autoShow){
				self.show();
			}
		},
		show: function(){
			var self = this;
			if (!self.$isShow){
				self.$isShow = 1;
				var c = self.getConfig('delayShow');
				if (c){
					self.$showTid = self.setTimeout('doShow', c);
				}else {
					self.doShow();
				}
			}
			if (self.$hideTid){
				clearTimeout(self.$hideTid);
				self.$hideTid = 0;
			}
		},
		doShow: function(){
			var self = this;
			self.$showTid = 0;
			self.css('display', 'block');
			self.css('opacity', 1);
			self.$visible = true;
			self.updatePosition();
			var auto_hide = self.getConfig('autoHide');
			if (auto_hide){
				var evt_name;
				var ns = self.$eventNamespace;
				has.string = auto_hide;

				var all = has(' click ');
				evt_name = 'mouseup'+ns;
				// 点击标签隐藏或拦截隐藏
				self.uiBind(
					evt_name,
					(all || has(' click_tip ')) ? 'eventAutoHide' : 'eventSkipHide'
				);

				// 点击定位元素隐藏或拦截隐藏
				if (self.$anchor){
					self.uiBind(
						self.$anchor, evt_name,
						(all || has(' click_anchor ')) ? 'eventAutoHide' : 'eventSkipHide'
					);
				}
				// 点击页面隐藏
				if (all || has(' click_body ')){
					self.uiBind($(BODY_ELEMENT), evt_name, 'eventAutoHide');
				}

				all = has(' leave ');
				evt_name = 'mouseleave'+ns+' mouseenter'+ns;
				// 离开标签隐藏
				if (all || has(' leave_tip ')){
					self.uiBind(evt_name, 'eventAutoHide');
				}
				// 离开定位元素隐藏
				if (self.$anchor && (all || has(' leave_anchor '))){
					self.uiBind(self.$anchor, evt_name, 'eventAutoHide');
				}
			}
			return self;
		},
		eventSkipHide: function(evt){
			this.$skipClick = evt.timeStamp;
		},
		eventAutoHide: function(evt, elm){
			var self = this;
			if (self.$autoTid){
				clearTimeout(self.$autoTid);
				self.$autoTid = 0;
			}
			switch (evt.type){
				case 'mouseleave':
					self.$autoTid = self.setTimeout(self.hide, 100);
					break;
				case 'mouseup':
					if (this.$skipClick !== evt.timeStamp){
						self.hide();
					}
					break;
			}
		},
		hide: function(){
			var self = this;
			if (self.$isShow){
				self.$isShow = 0;
				var c = self.getConfig('delayHide');
				if (c){
					self.$hideTid = self.setTimeout('doHide', c);
				}else {
					self.doHide();
				}
			}
			if (self.$showTid){
				clearTimeout(self.$showTid);
				self.$showTid = 0;
			}
		},
		doHide: function(){
			var self = this;
			self.$hideTid = 0;
			self.css('opacity', 0);
			self.$visible = false;
			var auto_hide = self.getConfig('autoHide');
			if (auto_hide){
				// 解除所有事件绑定
				var ns = self.$eventNamespace;
				var evt_name = 'mouseleave'+ns+' mouseenter'+ns+' mouseup'+ns;
				self.uiUnbind(evt_name);
				self.uiUnbind($(BODY_ELEMENT), evt_name);
				if (self.$anchor){
					self.uiUnbind(self.$anchor,  evt_name);
				}
			}
			self.setTimeout('realHide', 500);
			return self;
		},
		realHide: function(){
			if (!this.$isShow){
				this.css('display', 'none');
			}
		},
		// 显示完毕后, 更新状态
		updatePosition: function(){
			// 更新位置
			var self = this;
			if (self.$visible){
				var el = self.getDOM();
				// 如果超出浏览器底部范围同时上方有足够的高度展示，将弹层显示在目标点的上面
				if( (el.height()+self.getPos().top > $(window).height()) && (self.getPos().top > el.height()) ){
					self.css({
						left: self.getPos().left,
						top: self.getPos().top-el.height()
					});
				}else{
					self.css(self.getPos());
				}
			}
		},
		// 显示设置
		update: function(config){
			var self = this;

			// 定位锚点对象
			var anchor = $(config.anchor);
			self.$anchor = anchor.length ? anchor : null;

			self.extendConfig(config);
			// 如果界面已显示, 立即更新一次界面
			self.updatePosition();

			return self;
		},
		// 设置显示内容
		setData: function(data){
			var con = this.$doms.content;
			if (util.isString(data)){
				con.text(data);
			}else {
				con.empty().append(data);
			}
			this.updatePosition();
			return this;
		},
		/**
		 * 获取弹出层的位置
		 * @return {Object} 包含弹出层top与left数值
		 */
		getPos:function(){
			var self = this;
			var pos;
			var c = self.getConfig();
			var el = self.getDOM();
			var anchor = self.$anchor;
			var arrow  = self.$doms.arrow;
			var arrow_w, arrow_h;

			// 处理箭头位置和位移
			if (c.hasArrow && c.pos){
				// 修正类名
				var cname = arrow.attr('class');
				cname = cname && cname.replace(/ M-tipArrow\w+/g, '') || '';
				arrow.attr('class', cname + ' M-tipArrow' + c.pos);

				arrow_w = arrow.outerWidth();
				arrow_h = arrow.outerHeight();
			}

			if (util.isObject(c.pos)){
				// 指定位置
				pos = c.pos;
			}else if (!anchor){
				// 全屏幕显示居中
				var h = Math.max(0,(BODY_BOUND.clientHeight - el.outerHeight(true))/2),
					w = Math.max(0,(BODY_BOUND.clientWidth - el.outerWidth(true))/2),
					sh = Math.max(DOC_ELEMENT.scrollTop, BODY_ELEMENT.scrollTop),
					sw = Math.max(DOC_ELEMENT.scrollLeft, BODY_ELEMENT.scrollLeft);

				pos = {
					'left': parseInt(sw + w, 10) + c.offsetX,
					'top': parseInt(sh + h, 10) + c.offsetY
				};
			}else {
				anchor = $(anchor);
				var content_width  = el.outerWidth();
				var content_height = el.outerHeight();
				var anchor_width  = anchor.outerWidth();
				var anchor_height = anchor.outerHeight();
				var anchor_offset = anchor.offset();

				pos = {'left': 0, 'top': 0};
				// 计算垂直坐标
				var base = anchor_offset.top + c.offsetY;
				switch (c.pos.charAt(0)){
					case 'T': pos.top = base; break;
					case 't': pos.top = base - content_height; break;
					case 'B': pos.top = base + anchor_height - content_height; break;
					case 'b': pos.top = base + anchor_height; break;
					case 'm': pos.top = base + Math.round((anchor_height - content_height)/2); break;
				}
				// 计算水平坐标
				base = anchor_offset.left + c.offsetX;
				switch (c.pos.charAt(1)){
					case 'L': pos.left = base; break;
					case 'l': pos.left = base - content_width; break;
					case 'R': pos.left = base + anchor_width - content_width; break;
					case 'r': pos.left = base + anchor_width; break;
					case 'm': pos.left = base + Math.round((anchor_width - content_width)/2); break;
				}

				// 处理箭头位置和位移
				if (arrow_w && arrow_h){
					var arrow_pos = false,
						arl = (anchor_offset.left - pos.left)+(anchor_width >> 1) + c.offsetX,
						art = (anchor_offset.top - pos.top)+(anchor_height >> 1) + c.offsetY;

					switch (c.pos.substr(0,2)){
						case 'tm': case 'tL': case 'tR':
							pos.top -= (arrow_h >> 1);
							arrow_pos = {left: arl - (arrow_w>>1), top: content_height - 1};
						break;
						case 'bm': case 'bL': case 'bR':
							pos.top += (arrow_h >> 1);
							arrow_pos = {left: arl - (arrow_w>>1), top: -arrow_h};
						break;
						case 'ml': case 'Tl': case 'Bl':
							pos.left -= (arrow_w >> 1);
							arrow_pos = {left: content_width - 1, top: art - (arrow_h>>1)};
						break;
						case 'mr': case 'Tr': case 'Br':
							pos.left += (arrow_w >> 1);
							arrow_pos = {left: -arrow_w, top: art - (arrow_h>>1)};
						break;
					}

					if (arrow_pos){
						arrow.css(arrow_pos).show();
					}else {
						arrow.hide();
					}
				}
				return pos;
			}

			if (arrow_w && arrow_h){
				// todo: 增加没有定位锚点的tip箭头位置
			}
			return pos;
		},
		isShow: function(){
			return this.$isShow;
		},
		isVisible: function(){
			return this.$visible;
		},
		getContainer: function(){
			return this.$doms.content;
		}
	});
	exports.base = Base;

	var Tooltip = Base.extend({
		init: function(config, parent){
			config = pubjs.conf(config, {
				'class': 'M-tooltip'
				,'pos': 'bm' // 定位模式
				,'width': 380
				,'height': ''
				,'autoShow': false
				,'autoHide': 'click_body click_anchor'
				,'arrowAlign': 'right' // left right middle
				,'hide': true
				,'target': pubjs.DEFAULT_POPUP_CONTAINER.find('#SCENES_POPUP')
			});

			// 初始化模块构造
			this.Super('init', arguments);
		}
		,afterBuild: function(){
			var self = this;
			self.Super('afterBuild', arguments);

			var c = self.getConfig();
			var el = self.getDOM();

			if(c.height){
				el.height(c.height);
			}

			var cls = c['class'];
			if(cls){
				el.addClass(
					util.isArray(cls) ? cls.join(' ') : cls
				);
			}

			if(c.arrowAlign){
				self.$doms.arrow.addClass(c.arrowAlign);
			}

			if(c.hide){
				self.hide();
			}
		}
		,realHide: function(){
			if (!this.$isShow){
				this.css('display', 'none');
				this.fire(
					"tooltipHide"
					,{
						'hide': true
					}
				);
			}
		}
		,show: function(){
			this.Super('show', arguments);
			var el = this.getDOM();
			// 默认设置input聚焦
			if(el.find('input[type="text"]').length>0){
				el.find('input[type="text"]').eq(0).focus();
			}
		}
	})
	exports.tooltip = Tooltip;
});