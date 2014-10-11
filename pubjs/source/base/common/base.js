/**
 * 下拉框基本模块
 */
define(function(require, exports){
	var $ = require('jquery');
	var pubjs = require('../../core/pub');
	var util  = require('../../core/util');
	var view  = require('../view');

	/**
	 * 滚动条控制模块
	 * @param {Object} config 模块配置对象
	 */
	var Scroller = pubjs.Module.extend({
		init: function(config, parent){
			var self = this;
			self.$config = config = pubjs.conf(config, {
				'class': 'M-commonScroller',
				'target': parent, // 要滚动的容器
				'content': null, // 要滚动的内容
				'viewport': null, // 滚动区域大小, 配合content来计算虚拟滚动条
				'type': 'linear', // 滚动方式, manual - 手动滚动方式, 不控制外部DOM
				'dir': 'H', // 滚动方向 H-横向, V-纵向
				'size': 3, // 滚动条大小
				'pad': true, // 插入滚动条间隔
				'side': false, // 是否反方向放置滚动条
				'margin': 2, // 滚动条两端偏移位置支持数组形式分别制定两端偏移量
				'offset': 2, // 滚动条侧面偏移位置
				'width': 0, // 指定滚动容器宽度
				'height': 0, // 指定滚动容器高度
				'auto': true, // 自动隐藏
				'watch': 0, // 监控大小变化, 设置正数表示监控间隔时间, 建议200
				'wrap': false, // 自动包含子元素
				'step': 100, // 滚轮滚动距离
				'wheel': true // 绑定鼠标滚轮事件
			});
			var c = config.get();
			if (c.wrap === true){
				c.wrap = 'div';
			}

			self.$pad = 0;
			var i = self.$info = {};

			var margin = c.margin;
			var isH = (c.dir === 'H');
			var bar = self.$bar = $('<div/>').addClass(c['class']);
			self.$ctr = $('<div/>').appendTo(bar);
			if (!util.isArray(margin)){
				c.margin = margin = [margin, margin];
			}
			margin[2] = margin[0] + (margin[1] || 0);
			bar.css(c.side?'left':'right', isH ? margin[0] : c.offset);
			bar.css(c.side?'top':'bottom', isH ? c.offset : margin[0]);

			if (c.target.getDOM){
				c.target = c.target.getDOM();
			}
			var tar = c.target.get(0);
			bar = bar.appendTo(tar).get(0);
			if (bar.offsetParent != tar){
				tar.style.position = 'relative';
			}

			if (c.type === 'manual'){
				// 虚拟滚动状态
				i.init = i.margin = i.pos = 0;
				i.type = isH ? 'horizontal' : 'vertical';
			}else {
				// DOM元素滚动
				if (c.wrap){
					if (c.content){
						c.content.wrap('<'+c.wrap+'/>');
						c.content = c.content.parent();
					}else {
						c.target.wrapInner('<'+c.wrap+'/>');
						c.content = c.target.children(':first');
					}
				}else if (!c.content) {
					c.content = c.target.children(':first');
				}

				// 初始化获取原margin
				var getCSS = util.getCssValue;
				if (isH){
					i.init = getCSS(c.content, 'marginLeft');
					i.margin = getCSS(c.content, 'marginRight') + i.init;
					i.noMin = !c.width && !getCSS(c.target, 'minWidth');
					i.type = 'horizontal';
					c.target.css('overflow-x', 'hidden');
				}else {
					i.init = getCSS(c.content, 'marginTop');
					i.margin = getCSS(c.content, 'marginBottom') + i.init;
					i.noMin = !c.height && !getCSS(c.target, 'minHeight');
					i.type = 'vertical';
					c.target.css('overflow-y', 'hidden');
				}
			}

			// 绑定事件
			self.bindEvent();

			// 监控尺寸变化
			if (c.watch){
				if (c.watch === true){
					c.watch = 200;
				}
				self.$watchSize = isH ? c.content.width() : c.content.height();
				self.$watchCallback = function(){
					var size = isH ? c.content.width() : c.content.height();
					if (size && size != self.$watchSize){
						self.$watchSize = size;
						self.update();
					}
				}
				self.$watchId = setInterval(self.$watchCallback, c.watch);
			}

			// 计算滚动条数据
			self.update();
		},
		beforeDestroy: function(){
			clearInterval(this.$watchId);
		},
		bindEvent: function(){
			var self = this;
			var c = self.$config.get();
			var el = c.target.get(0);
			var ctr = self.$ctr.get(0);
			if (el.attachEvent){
				self.IEcb = function(evt){
					return self.handleEvent(evt);
				}
				if (c.wheel){
					el.attachEvent('onmousewheel', self.IEcb);
				}
				ctr.attachEvent('onmousedown', self.IEcb);
			}else {
				if (c.wheel){
					el.addEventListener('DOMMouseScroll', self, false);
					el.addEventListener('mousewheel', self, false);
				}
				ctr.addEventListener('mousedown', self, false);
			}
		},
		handleEvent: function(evt){
			var self = this;
			switch (evt.type){
				case 'onmousemove':
				case 'mousemove':
					self.eventMouseMove(evt);
				break;

				case 'onmousewheel':
				case 'DOMMouseScroll':
				case 'mousewheel':
					if (self.$info.max === 0){return;}
					if (self.$config.get('wheel') === 'shift' && !evt.shiftKey){
						return;
					}
					self.eventWheel(evt);
				break;

				case 'onmousedown':
				case 'mousedown':
					self.eventMouseDown(evt);
				break;

				case 'onmouseup':
				case 'mouseup':
					self.eventMouseUp(evt);
				break;
			}
			evt.cancelBubble = true;
			evt.returnValue = false;
			if (evt.preventDefault) {evt.preventDefault();}
			if (evt.stopPropagation) {evt.stopPropagation();}
		},
		/**
		 * 输入控制scorller位置
		 * @param  {Number} offset 滚动条偏移量
		 * @return {None}
		 */
		scrollBy:function(offset){
			var self = this;
			self.scrollTo(self.$info.pos - offset);
			return self;
		},
		/**
		 * 滚动到指定位置
		 * @param  {Number} pos 滚动位置值
		 * @return {None}
		 */
		scrollTo: function(pos){
			var self = this;
			var txtPos, txtMargin, i = self.$info, c = self.$config.get();
			if (c.dir == 'H'){
				txtPos='left'; txtMargin='marginLeft';
			}else {
				txtPos='top'; txtMargin='marginTop';
			}
			pos = Math.min(0, Math.max(i.max, pos));
			if (pos == i.pos) {return;} // 位置没有变化, 不触发事件

			i.pos = pos;
			i.bPos = Math.floor(i.bMax * pos / i.max);

			self.$ctr.css(txtPos, i.bPos);
			if (c.type !== 'manual'){
				c.content.css(txtMargin, pos + i.init);
			}

			self.fire('scroll', i);
			return self;
		},
		/**
		 * 鼠标滚轮回调处理事件
		 */
		eventWheel: function(evt){
			var self = this;
			var dir = ('wheelDelta' in evt ? (evt.wheelDelta<0) : (evt.detail>0));
			var txtPos, txtMargin, i = self.$info, c = self.$config.get();
			if (c.dir == 'H'){
				txtPos='left'; txtMargin='marginLeft';
			}else {
				txtPos='top'; txtMargin='marginTop';
			}
			var pos = i.pos + (dir ? -c.step : c.step);
			pos = Math.min(0, Math.max(i.max, pos));
			if (pos == i.pos) {return;} // 位置没有变化, 不触发事件

			i.pos = pos;
			i.bPos = Math.floor(i.bMax * pos / i.max);

			self.$ctr.css(txtPos, i.bPos);
			if (c.type !== 'manual'){
				c.content.css(txtMargin, pos + i.init);
			}

			self.fire('scroll', i);
		},
		/**
		 * 鼠标按下拖动事件
		 * @param  {Object} evt 系统事件变量
		 * @return {None}     无返回
		 */
		eventMouseDown: function(evt){
			var self = this;
			if (!self.$mouse){
				var d = document;
				if (d.attachEvent){
					d.attachEvent('onmousemove', self.IEcb);
					d.attachEvent('onmouseup', self.IEcb);
				}else {
					d.addEventListener('mousemove', self, false);
					d.addEventListener('mouseup', self, false);
				}
			}
			self.$mouse = {
				screenX: evt.screenX,
				screenY: evt.screenY,
				pos: self.$info.bPos
			};
			self.$bar.addClass('act');
		},
		/**
		 * 鼠标移动事件
		 * @param  {Object} evt 系统事件变量
		 * @return {None}     无返回
		 */
		eventMouseMove: function(evt){
			var self = this;
			var i = self.$info;
			var m = self.$mouse;
			var c = self.$config.get();
			var txtPage, txtPos, txtMargin;

			if (c.dir == 'H'){
				txtPage='screenX'; txtPos='left'; txtMargin='marginLeft';
			}else {
				txtPage='screenY'; txtPos='top'; txtMargin='marginTop';
			}
			i.bPos = Math.max(0, Math.min(i.bMax, m.pos + evt[txtPage] - m[txtPage]));
			self.$ctr.css(txtPos, i.bPos);
			var pos = Math.floor(i.max * i.bPos / i.bMax);
			if (pos == i.pos){ return; }
			i.pos = pos;
			if (c.type !== 'manual'){
				c.content.css(txtMargin, pos + i.init);
			}
			self.fire('scroll', i);
		},
		/**
		 * 鼠标按键放开事件
		 * @param  {Object} evt 系统事件变量
		 * @return {None}     无返回
		 */
		eventMouseUp: function(evt){
			var self = this;
			var d = document;
			if (d.detachEvent){
				d.detachEvent('onmouseup', self.IEcb);
				d.detachEvent('onmousemove', self.IEcb);
			}else {
				d.removeEventListener('mouseup', self, false);
				d.removeEventListener('mousemove', self, false);
			}
			self.eventMouseMove(evt);
			self.$bar.removeClass('act');
			self.$mouse = null;
		},
		/**
		 * 设置手动滚动区域数据
		 * @param  {Number} content  内容区数值
		 * @param  {Number} viewport 可视区数值
		 * @return {Module}          返回模块实例
		 */
		setSize: function(content, viewport){
			var self = this;
			var c = self.$config.get();
			if (c.type === 'manual' && (c.content != content || c.viewport != viewport)){
				c.content = content;
				c.viewport = viewport;
				self.update();
				self.fire('scroll', self.$info, self.afterScrollEvent, self);
			}
			return self;
		},
		afterScrollEvent: function(ev){
			// 需要重新计算展现尺寸
			if (ev.returnValue === true){
				this.update();
			}
		},
		/**
		 * 计算系统数据
		 * @param {Number} content <可选> 虚拟滚动时给定滚动内容大小
		 * @return {None} 无返回
		 */
		update: function(){
			var self = this;
			var c = self.$config.get();
			var i = self.$info;
			var hasScroll = (i.max !== 0);
			var txtMargin, txtPos, txtPadding, txtOuter, txtProp, txtProp2, txtCfg, txtCfg2;
			if (c.dir == 'H'){
				txtMargin='marginLeft'; txtPos='left'; txtPadding=c.side?'paddingTop':'paddingBottom';
				txtOuter='outerWidth'; txtProp='width'; txtProp2='height'; txtCfg='x'; txtCfg2='y';
			}else {
				txtMargin='marginTop'; txtPos='top'; txtPadding=c.side?'paddingLeft':'paddingRight';
				txtOuter='outerHeight'; txtProp='height'; txtProp2='width'; txtCfg='y'; txtCfg2='x';
			}

			var now, conSize, winSize, barSize, ctrSize;
			if (c.type === 'manual'){
				now = i.pos;
				conSize = c.content;
				winSize = c.viewport;
				barSize = (c[txtProp] || c.target[txtProp]()) - c.margin[2];
			}else {
				now = util.getCssValue(c.content, txtMargin) - i.init; // 当前内容滚动位置
				c.content.css(txtMargin, i.init); // 回复默认位置, 避免取宽度错误
				conSize = c.content[txtOuter](false) + i.margin; // 当前内容区域大小
				winSize = (c[txtProp] || c.target[txtProp]()); // 可视窗口大小
				if (i.noMin){
					if (winSize < conSize){
						c.target.css('min-'+txtProp, winSize);
					}else {
						c.target.css('min-'+txtProp, '');
						winSize = conSize;
					}
				}
				barSize = winSize - c.margin[2]; // 滚动条容器大小
			}
			if (winSize && conSize){
				ctrSize = Math.max(15, Math.floor(barSize * winSize / conSize)); // 滚动条控制块大小
			}else {
				ctrSize = barSize;
				winSize = Math.max(winSize, conSize);
			}

			i.win = winSize;	// 视口大小
			i.con = conSize;	// 内容大小
			i.max = Math.min(0, winSize - conSize);	// 内容移动限制
			i.pos = Math.max(now, i.max); // 内容当前位置
			i.bMax = barSize - ctrSize; // 拖块最大位置
			i.bPos = i.max ? Math.floor(i.bMax * i.pos / i.max) : 0; // 拖块当前位置
			i.show = (i.max !== 0 || !c.auto); // 滚动条是否显示

			self.$bar[txtProp2](c.size)[txtProp](barSize).toggle(i.show);
			self.$ctr[txtProp2](c.size)[txtProp](ctrSize).css(txtPos, i.bPos);
			if (c.type !== 'manual'){
				c.content.css(txtMargin, i.pos + i.init);
			}

			if (c.pad){
				var pad = util.getCssValue(c.target, txtPadding);
				if (i.show){
					var cpad = c.size + c.offset * 2;
					pad += (cpad - self.$pad);
					self.$pad = cpad;
				}else {
					pad -= self.$pad;
					self.$pad = 0;
				}
				c.target.css(txtPadding, pad);
			}
			var flag = (i.max !== 0);
			if (flag !== hasScroll){
				self.fire('scrollReset',flag);
			}
			return self;
		},
		// 获取最大滚动像素值
		getScrollMax: function(){
			return -this.$info.max;
		},
		// 获取当前滚动位置
		getScrollPos: function(){
			return -this.$info.pos;
		}
	});
	exports.scroller = Scroller;


	/**
	 * 分页控制模块
	 * @param {Objcet} config 模块初始化配置
	 * @param {Module} parent 父模块实例
	 */
	var Pager = view.widget.extend({
		init: function(config, parent){
			config = pubjs.conf(config, {
				'target': parent,
				'layout': {
					'module': view.layoutGrid,
					'default_name': 'list',
					'rows': [
						'sizes(.M-commonPagerBox)',
						'info(.M-commonPagerInfo)',
						'first',
						'list(.M-commonPagerList)',
						'last',
						'step',
						'jump(.M-commonPagerGotoBox)'
					].join('|')
				},
				'subClass': {
					'prev': 'uk-button',
					'next': 'uk-button',
					'first':'uk-button',
					'last': 'uk-button',
					'page': 'uk-button',
					'active': 'M-commonPagerActive',
					'disable': 'M-commonPagerDisable',
					'goto': 'M-commonPagerGoto'
				},
				'subText': {
					'prev': _T('<'),
					'next': _T('>'),
					'first': _T('首页'),
					'last': _T('末页'),
					'info': _T('总共 %1 条记录, 共 %2 页, 当前第 %3 页'),
					"prePage":_T('每页显示'),
					"a":_T('条'),
					"jump":_T("跳转")
				},
				// 分页大小
				'size': 20,
				// 初始页码
				'page': 1,
				// 分页总数 <一般自动计算>
				'count': 0,
				// 记录总数
				'total': 0,
				// 最多显示分页数
				'bounds':8,
				// 是否显示上一页和下一页
				'stepButton': true,
				// 是否显示第一页和最后一页
				'firstLast': true,
				// 是否显示页数信息
				'pageInfo': true,
				// 每页显示的数据数量
				"sizeTypes":[10,20,50,100],
				// 是否显示切换每页显示数据数量的功能
				"showSizeTypes":1,
				// 是否显示页码跳转输入框
				"showJumper":1
			});

			var self = this;
			self.$pageBtns = [];
			self.$initPageSize = config.get('/size');
			self.Super('init', arguments);
		},
		afterBuild: function(layout){
			var self = this;
			self.addClass('M-commonPager uk-form');
			self.$doms = {};
			self.updateUI();

			// 绑定事件
			self.uiProxy('button[data-type]', 'click', 'eventClick');
		},
		updateUI: function(){
			var self = this;
			var cfg = self.getConfig();
			var doms = self.$doms;
			var cls = cfg.subClass;
			var i;

			// 计算分页参数
			self.countPage(true);

			// 生成分页按钮
			var con = self.getContainer('list');
			var btns = self.$pageBtns;
			for (i=self.start + btns.length; i<=self.end; i++){
				btns.push($('<button data-type="page"/>').addClass(cls.page).appendTo(con));
			}

			// 建立步进按钮
			if (cfg.stepButton && self.count > cfg.bounds){
				if (!doms.step){
					con = doms.step = self.getContainer('step');
					doms.prev = $('<button data-type="prev"/>').addClass(cls.prev).appendTo(con);
					doms.next = $('<button data-type="next"/>').addClass(cls.next).appendTo(con);
				}
			}else if (doms.step){
				doms.step.hide();
			}

			// 建立首页和末页按钮
			if (cfg.firstLast && self.count > cfg.bounds){
				if (!doms.first){
					doms.firstCon = self.getContainer('first');
					doms.first = $('<button data-type="first"/>').addClass(cls.first).appendTo(doms.firstCon);
					doms.lastCon = self.getContainer('last');
					doms.last = $('<button data-type="last"/>').addClass(cls.last).appendTo(doms.lastCon);
				}
			}else if (doms.first){
				doms.firstCon.hide();
				doms.lastCon.hide();
			}

			// 建立页面信息
			if (cfg.pageInfo){
				if (!doms.info){
					doms.info = self.getContainer('info');
				}
			}else if (doms.info){
				doms.info.hide();
			}

			// 每页显示的数量
			if(cfg.showSizeTypes){
				con = doms.sizeTypeBox = self.getContainer('sizes').text(cfg.subText.prePage);
				util.each(cfg.sizeTypes, function(size){
					if (size){
						$('<button data-type="size" class="uk-button" />')
							.toggleClass(cls.active, size == self.size)
							.attr('data-size', size)
							.text(size).appendTo(con);
					}
				});
				doms.sizeTypes = con.find('button[data-type="size"]');
			}else if (doms.sizeTypeBox){
				doms.sizeTypeBox.hide();
			}

			// 页码跳转输入框
			if(cfg.showJumper){
				if (!doms.jumperBox){
					con = doms.jumperBox = self.getContainer('jump');
					doms.jumper_page = $('<input type="text" />').addClass(cls['goto']).appendTo(con);
					doms.jumper = $('<button data-type="jump" />')
						.addClass(cls.page + ' uk-button uk-button-def')
						.text(cfg.subText.jump)
						.appendTo(con);
					self.uiBind(doms.jumper_page, 'keypress', 'eventPageEnter');
				}
			}else if (doms.jumperBox){
				doms.jumperBox.hide();
			}

			// 更新状态
			self.update(true);

			// 设置按钮语言文字
			self.setText();

			return self;
		},
		eventPageEnter: function(evt){
			if (evt.keyCode == 13){
				this.$doms.jumper.click();
			}
		},
		eventClick: function(evt, elm){
			elm = $(elm);
			var self = this;
			var doms = self.$doms;
			var val;

			switch (elm.attr('data-type')){
				case 'page':
					val = +elm.attr('data-page') || 0;
					break;
				case 'prev':
					val = Math.max(1, self.page-1);
					break;
				case 'next':
					val = Math.min(self.count, self.page+1);
					break;
				case 'first':
					val = 1;
					break;
				case 'last':
					val = self.count;
					break;
				case 'jump':
					val = +doms.jumper_page.val() || 0;
					val = Math.max(0, Math.min(self.count, val));
					doms.jumper_page.val('');
					break;
				case 'size':
					self.setSize(+elm.text() || 0);
					return;
			}

			if (val && val != self.page){
				self.setConfig('page', val);
				self.page = val;
				self.update();
				self.fire('changePage', {'page': val, 'size': self.size});
			}
		},
		setSize: function(size){
			var self = this;
			if (size && size != self.size){
				self.setConfig('size', size);
				self.updateUI();
				self.fire('changePage', {'page': self.page, 'size': self.size});
			}
			return self;
		},
		/**
		 * 重新设定分页
		 * @param  {Object} config 新的分页配置
		 * @return {Undefined}        无返回值
		 */
		setup: function(config){
			util.each(config, function(val){
				if (!val && val !== 0){
					return null;
				}
			});
			this.extendConfig(config);
			return this.updateUI();
		},
		/**
		 * 获取分页当前的请求参数
		 * @return {Undefined} 无返回值
		 */
		getParam: function(){
			return {
				page: this.page,
				limit: this.size
			};
		},
		// 获取分页参数
		getData: function(){
			var self = this;
			return {
				init_size: self.$initPageSize,
				size: self.size,
				total: self.total,
				count: self.count,
				page: self.page
			};
		},
		/**
		 * 计算分页相关变量
		 * @param  {Bool}      init 是否做初始化处理
		 * @return {Undefined}      无返回值
		 */
		countPage: function(init){
			var self = this;
			var cfg = self.getConfig();

			if (init){
				// 计算分页参数
				self.size  = Math.max(1, cfg.size);
				self.total = cfg.total;
				self.count = cfg.count = Math.ceil(cfg.total / self.size);
				self.page  = Math.max(1, Math.min(cfg.page, self.count));

				// 检查是否存在在尺寸类型中
				if(util.index(cfg.sizeTypes, cfg.size) === null){
					// 没有则追加并重新排序
					cfg.sizeTypes.push(cfg.size);
					cfg.sizeTypes.sort();
				}
			}
			var bound  = cfg.bounds - 1;
			self.start = Math.max(1, self.page - Math.floor(bound / 2));
			self.end   = self.start + bound;
			if (self.end > self.count){
				self.end = self.count;
				self.start = Math.max(1, self.end - bound);
			}
			return self;
		},
		update: function(skip_count){
			var self = this;
			if (!skip_count){
				self.countPage();
			}
			var cfg = self.getConfig('subClass');
			var doms = self.$doms;
			var btn, page;
			// 处理分页状态和显示
			for (var i=0; i<self.$pageBtns.length; i++){
				btn = self.$pageBtns[i];
				page = i + self.start;
				if (page > self.end){
					btn.hide();
				}else {
					btn.attr('data-page', page).text(page)
						.css('display','inline-block')
						.toggleClass(cfg.active, page==self.page);
				}
			}

			// 更新分页状态
			if (doms.prev) {doms.prev.toggleClass(cfg.disable, self.page <= 1);}
			if (doms.first) {doms.first.toggleClass(cfg.disable, self.page <= 1);}
			if (doms.next) {doms.next.toggleClass(cfg.disable, self.page >= self.count);}
			if (doms.last) {doms.last.toggleClass(cfg.disable, self.page >= self.count);}
			self.updateInfo();
			return self;
		},
		setText: function(){
			var self = this;
			var text = self.getConfig('subText');
			var doms = self.$doms;
			if (doms.prev) {doms.prev.text(LANG(text.prev));}
			if (doms.next) {doms.next.text(LANG(text.next));}
			if (doms.first) {doms.first.text(LANG(text.first));}
			if (doms.last) {doms.last.text(LANG(text.last));}
			self.updateInfo();
		},
		updateInfo: function(){
			var self = this;
			var doms = self.$doms;
			if (doms.info){
				doms.info.text(LANG(
					self.getConfig('subText/info'),
					self.total, self.count,
					self.page, self.size
				));
			}
			return self;
		},
		onSwitchLanguage: function(evt){
			this.setText();
		}
	});
	exports.pager = Pager;


	/**
	 * 搜索列表框
	 * @param {Object} config 自定义配置信息
	 * @param {Module} parent 父模块实例
	 */
	var Search = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'class':'M-commonSearch uk-form',
				'inputClass': 'M-commonSearchInput',
				'searchTip': LANG('请输入搜索内容'),
				'searchText': '',
				'buttonClass': 'uk-button uk-button-primary',
				'buttonText': LANG('搜索'),
				'undoClass': 'uk-button M-commonSearchUndo',
				'undoText': LANG('取消')
			});

			this.$data = '';
			this.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			var cfg = self.getConfig();
			var doms = self.$doms = {};

			// 创建输入框
			var elm = doms.input = $('<input type="text" />').attr({
				'class': cfg.inputClass,
				'placeholder': cfg.searchTip,
				'value': cfg.searchText
			});
			self.append(elm);
			self.uiBind(elm, 'keypress', 'eventKeyPress');

			// 创建搜索按钮
			elm = doms.button = $('<input type="button" />').attr({
				'class': cfg.buttonClass
				,'value': cfg.buttonText
			});
			self.append(elm);
			self.uiBind(elm, 'click', 'eventButtonClick');

			// 创建取消按钮
			elm = doms.undo = $('<input type="button" />').attr({
				'class': cfg.undoClass,
				'value': cfg.undoText
			});
			self.append(elm);
			self.uiBind(elm, 'click', 'eventUndoClick');
		},
		/**
		 * 输入框监控回车的输入自动搜索
		 * @param  {Object} evt jquery
		 * @return {None}       无返回
		 */
		eventKeyPress: function(evt){
			if (evt.keyCode == 13){
				this.$doms.button.click();
			}
		},
		/**
		 * 搜索按钮点击回调函数
		 * @param  {Object} evt jquery
		 * @return {Bool}       返回FALSE, 禁止DOM事件冒泡
		 */
		eventButtonClick: function(evt){
			var self = this;
			var doms = self.$doms;
			var text = doms.input.val();
			if (text != self.$data){
				self.$data = text;
				self.fire('search', text);
			}
			doms.undo.toggle(text.length > 0);
		},
		/**
		 * 取消按钮点击回调函数
		 * @param  {Object} evt jquery
		 * @return {Bool}       返回FALSE, 禁止DOM事件冒泡
		 */
		eventUndoClick: function(evt){
			this.reset();
		},
		/**
		 * 复位查询参数
		 * @return {None} 无返回
		 */
		reset: function(){
			var self = this;
			var doms = self.$doms;
			doms.input.val('');
			doms.undo.hide();
			if (self.$data){
				self.$data = '';
				self.fire('search', '');
			}
		}
	});
	exports.search = Search;


	/**
	 * Excel报表导出功能调用
	 * @param {Objcet} config 模块初始化配置
	 * @param {Module} parent 父模块实例
	 */
	var ExcelExport = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'name': LANG('下载Excel表格'),
				'data': null,
				"reqMethod":"get",
				'subs': null // 二级导出选项
			});
			this.$customParam = '';
			this.$customReady = false;
			this.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			var c = self.getConfig();
			self.addClass('M-commonExcel');

			var btn = $('<button class="uk-button" />').text(c.name);
			self.append(btn);
			self.uiBind(btn, 'click', 'eventButtonClick');

			// 自定义导出
			if (c.subs){
				btn = $('<button class="uk-button"><i class="uk-icon-caret-down" /></button>');
				self.append(btn);
				self.uiBind(btn, 'click', 'eventCustomClick');
			}
		},
		eventCustomClick: function(evt, elm){
			var self = this;
			if (!self.$customReady){
				self.$customReady = true;
				var cfg = self.getConfig('subs');
				var uri, conf;
				if (util.isString(cfg)){
					uri = cfg;
					conf = {'anchor': elm};
				}else {
					uri = cfg.uri;
					conf = cfg.config;
					conf.anchor = elm;
				}

				self.createAsync('customDlg', uri, conf);
			}else {
				var mod = self.get('customDlg');
				if (mod){
					mod.show();
				}
			}
			return false;
		},
		onCustomExport: function(ev){
			// 自定义导出事件
			var self = this;
			self.$customParam = ev.param;
			self.fire('excelExport',self.getConfig('data'),'afterFire');
			ev.from.hide();
			return false;
		},
		eventButtonClick: function(evt){
			var self = this;
			self.$customParam = null;
			self.fire('excelExport',self.getConfig('data'),'afterFire');
		},
		afterFire: function(evt){
			var data = evt.returnValue;

			if (evt.count > 0 && data){
				var self = this;
				var url = data.url;
				var param = data.param;
				// 有带数字的condition的请求都当成post
				var reqMethod = param.condition1 ? 'post' : self.getConfig('reqMethod');

				// 合并自定义导出参数
				var custom = self.$customParam;
				if (custom){
					if (custom.condition && param.condition){
						custom.condition += ',' + param.condition
					}
					param = util.extend(param, custom);
				}
				// 导出模板参数
				param.tmpl = 'export';

				if(reqMethod === "get"){
					// TODO: 这里比较坑，试试寻找更好的方法
					// 因为自定义导出与普通导出使用的地址不同，所以要区别对待
					if (custom) {
						window.location.href = pubjs.data.resolve('/feed/trend', param);
					} else {
						// 普通get方式导出
						window.location.href = pubjs.data.resolve(url, param);
					}

				}else{
					// psot的形式
					var cExp = /^condition\d+$/;
					var postParam = {};

					util.each(param, function(val, key){
						if (cExp.test(key)){
							postParam[key] = val;
							return null;
						}
					});

					// 合并get部分的参数
					url = pubjs.data.resolve(url, param);

					// 构建表单用以提交post部分的内容
					this.buildForm({
						"action":url,
						"items":postParam,
						"method":"post",
						"target":"_blank"
					});
				}
			}
		},
		/**
		 * 构造提交用的表单
		 * @param  {Object}     config 表单设置
		 * @return {Undefined}         无返回值
		 */
		buildForm:function(config){
			var items = config.items;
			var form = '<form action="'+config.action+'" method="'+config.method+'" ';
			if(config.target){
				form += 'target="'+config.target+'"';
			}
			form += '>';
			for(var n in items){
				form += '<input name="'+n+'" type="hidden" value="'+ util.html(items[n])+'" />';
			}
			form += '</form>';
			form = $(form);
			form.hide();
			$("body:first").append(form);
			form.submit();

			// 回收
			form.remove();
			form = null;
		}
	});
	exports.excelExport = ExcelExport;



	/***
	配置项目格式说明
	<item_name>: {
		"text": "tab标签名称",
		"action": "grid/os",	<可选> 点击该tab, 自动调用对应的路由控制器方法
		"render": function(),	<可选> 第一次点击是调用改渲染函数
		"module": {				<可选> 自动加载制定的模块并创建实例
			uri: "grid.os"
			config: {...}
		},
		"html":'要显示的HTML'	<可选> 直接设置指定的HTML内容到容器中
	}
	***/
	// 选项卡
	var Tab = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				// 展现形式 tab - 标签, button - 按钮组
				'type': 'tab',
				'reqMethod': 'get',
				'list': {},
				'active': null
			});
			this.$first = null;
			this.$active = null;

			this.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			var c = self.getConfig();
			var type = c.type;

			self.addClass('M-tab');
			if (type === 'button'){
				self.head = $('<div class="uk-button-group"/>');
				self.body = $('<div class="M-tabButtonBody"/>');
			}else {
				self.head = $('<ul class="uk-tab" />');
				self.body = $('<div class="M-tabBody" />');
			}
			self.append(self.head, self.body);

			// 生成tab项目
			var tabs = self.$tabs = {};
			var tab, li, div, first = null;
			for (var name in c.list){
				// 构造tab
				tab = c.list[name];
				if (type === 'button'){
					li = $('<button class="uk-button" />').text(tab.text);
				}else{
					li = $('<li/>').append($('<a/>').text(tab.text));
				}
				// 项目放入头容器中
				li.attr('data-tab', name).appendTo(self.head);
				// 生成内容容器, 并放入到body容器中
				div = $('<div/>').attr('class', tab['class']).appendTo(self.body);
				// 如果有设置html内容, 则设置html内容到内容容器中
				if (tab.html){
					div.html(tab.html);
				}

				tabs[name] = {
					name: name,
					head: li,
					body: div,
					run: false
				};
				if (!first){
					self.$first = first = name;
				}
			}
			// 绑定点击事件
			self.uiProxy(self.head, 'li,button', 'click', 'eventClick');

			// 激活初始分页
			if (c.active && util.has(tabs, c.active)){
				first = c.active;
			}

			// 初始化激活标签
			if (first){
				self.switchTab(first);
			}
		},
		/**
		 * 切换至指定的tab
		 * @param  {String} name tab名
		 * @return {Object}      指定的tab对象。未找到时返回null。
		 */
		switchTab: function(name){
			var self = this;
			if (name == self.$active || !util.has(self.$tabs, name)){
				return self;
			}
			self.$active = name;

			var cls = 'uk-active';
			var item = self.$tabs[name];
			self.head.children().removeClass(cls);
			item.head.addClass(cls);
			self.body.children().removeClass(cls);
			item.body.addClass(cls);

			if (!item.run){
				item.run = true;

				// 未创建过则进入构建流程
				var uri, c = self.getConfig('list/'+name);

				// render,action,module不可共存
				// 权重render > action > module
				var render = c.render;
				if (render){
					if(util.isFunc(render)){
						render.call(c.context || self, item, c, self);
					}else if(util.isString(render) && c.context && util.isFunc(c.context[render])){
						c.context[render](item, c, self);
					}
				}else if(c.action){
					if (pubjs.controller){
						uri = c.action.split('/');
						item.body.addClass('loading');
						pubjs.controller.run(uri[0], uri[1], {
							'module':self,
							'item':item,
							'config':c
						});
					}else {
						pubjs.error('no controller plugin loaded!');
					}
				}else if(c.module){
					// 合并param值 多维钻取使用到
					var cfg = {'target': item.body, 'reqMethod': self.getConfig('reqMethod')};
					if(this.$param){
						cfg.param = this.$param;
					}
					item.body.addClass('loading');
					var module = c.module;
					if (util.isString(module)){
						self.createAsync(name, module, cfg, function(){
							item.body.removeClass('loading');
						});
					}else if (module.uri){
						cfg = util.extend(module.config, cfg);
						self.createAsync(name, module.uri, cfg, function(){
							item.body.removeClass('loading');
						});
					}else {
						pubjs.error('no module uri!');
					}
				}
			}

			self.fire('tabChange', item);
			return self;
		},
		eventClick: function(evt, elm){
			var tab = $(elm).attr('data-tab');
			this.switchTab(tab);
		},
		getActive:function(dom){
			return dom ? this.$tabs[this.$active] : this.$active;
		},
		/**
		 * 获取容器
		 * @param  {String} name 标识tab的名称
		 * @return {Object}      JQ对象
		 */
		getContainer: function(name){
			var tabs = this.$tabs;
			if (!name || !tabs[name]){
				name = this.$first;
			}
			return tabs[name].body;
		},
		setParam: function(param){
			this.$param = param;
			var mod;
			var arr = this.getConfig('list');
			for(var i in arr){
				mod = this.get(i);
				if(mod){
					mod.setParam(param).load();
				}
			}
			return this;
		},
		load: function(){
			// setParam中已有load
			return this;
		}
	});
	exports.tab = Tab;

	// 选项卡 -用于子表格的情况
	var GridTab = Tab.extend({
		init: function(config){
			config = pubjs.conf(config);
			var originCfg = config.val();

			if(originCfg){
				var cList = originCfg.list;
				delete originCfg.list;
				delete originCfg.target;
				for(var n in cList){
					config.extend('list/'+n+'/module/config', originCfg);
					// cList[n].module.config = util.extend(cList[n].module.config, oc);
				}
			}


			this.Super('init', arguments);
		},
		// 子表格参数更新
		onUpdateSubGrid: function(ev){
			var c = this.getConfig();
			var param = ev.param;
			util.each(c.list, function(item){
				item.module.config.sub_param = param;
			});
			this.updateActiveGrid();
		},
		/**
		 * 更新模块中的表格参数
		 * @param  {String}    param 新的sub_param
		 * @param  {Bool}      go    是否马上更新当前的表格
		 * @return {Undefined}       无返回值
		 */
		updateGridSubParam:function(param,go){
			for(var n in this.$){
				this.$[n].config.sub_param = param;
			}
			if(go){
				this.updateActiveGrid();
			}
		},
		/**
		 * 更新当前激活的tab中的表格
		 * @return {Undeifned} 无返回值
		 */
		updateActiveGrid:function(param){
			this.$[
				this.active
			].reload(null,param);
		}
	});
	exports.gridTab = GridTab;

	// 加载蒙板层
	var LoadingMask = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'auto_show': true,
				'margin': 0,
				'z_index': 0,
				'opacity': null
			});
			this.$margin = 0;
			this.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			var c = self.getConfig();
			self.addClass('M-commonLoading');

			var margin = c.margin;
			if (margin){
				if (util.isArray(margin)){
					switch(margin.length){
						case 0:
							margin = 0;
							break;
						case 1:
							margin[1] = margin[0];
							/* falls through */
						case 2:
							margin[2] = margin[0];
							/* falls through */
						case 3:
							margin[3] = margin[1];
							break;
					}
				}else {
					margin = [margin,margin,margin,margin];
				}
				self.$margin = margin;
			}
			if (c.z_index){
				self.zIndex(c.z_index);
			}
			if (c.auto_show){
				self.show();
			}
		},
		show: function(){
			var self = this;
			var d = document;
			var c = self.getConfig();
			var el = self.getDOM().show();
			var con = el.parent().get(0);
			// 计算容器大小
			var w = con.clientWidth, h = con.clientHeight;
			if (con === d.body){
				el.css('position','fixed');
				var b = (d.compatMode === "CSS1Compat"?d.documentElement:d.body);
				h = b.clientHeight;
			}
			// 计算定位位置
			var x=0, y=0;
			if (el[0].offsetParent !== con){
				x = con.offsetLeft;
				y = con.offsetTop;
			}
			// 计算定位修正
			var m = c.margin;
			if (m){
				y += m[0];
				x += m[3];
				w -= (m[1] - m[3]);
				h -= (m[0] - m[2]);
			}
			el.css({
				left: x,
				top: y,
				width: w,
				height: h
			});

			if (c.opacity !== null){
				el.css('opacity', c.opacity);
				el.css('filter', 'alpha(opacity='+Math.round(c.opacity*100)+')');
			}

			return self;
		},
		hide: function(){
			this.getDOM().hide();
			return this;
		},
		zIndex: function(index){
			this.getDOM().css('zIndex', index);
			return this;
		}
	});
	exports.loadingMask = LoadingMask;
});