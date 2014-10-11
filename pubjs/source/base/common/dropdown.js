/**
 * 下拉框基本模块
 */
define(function(require, exports){
	var $ = require('jquery');
	var pubjs = require('../../core/pub');
	var util  = require('../../core/util');
	var view  = require('../view');

	// 基础单下拉菜单
	var DropdownBase = view.container.extend({
		init: function(config, parent){
			var self = this;
			self.$config = config = pubjs.conf(config, {
				'class': '',
				'target': parent,
				'scroll': true, // 是否有滚动条
				'search': true, // 是否有过滤框
				'search_atonce': false, // 立即搜索
				'search_callback': null, // 过滤回调函数
				'height': 30, // 显示框高度
				'width': 200, // 显示框框度
				'option_height': 200, // 弹出选项窗口高度
				'option_width': 0,  // 弹出选项窗口宽度
				'render': null, // 显示渲染回调函数
				'option_render': null, // 选项内容渲染函数
				'options': null,  // 选项对象<数组>
				'data': null, // 选中的选项
				'key': '_id', // 选项记录关键字字段名
				'name': 'Name', // 选项记录显示字段名
				'reqType': 'ajax',
				'url': null,  // 列表数据拉取地址, 留空不拉取
				'param': null, // 拉取数据时请求的参数
				'auto_load': true, // 初始化时自动拉取数据
				'all': null, // 默认全选项
				'fixed': null, // 固定选项参数<数组>
				'def': null,
				"drag":true		// 下拉框是否允许动态改变尺寸
			});

			var c = config.get();
			self.$options = c.options;
			self.$data = self.$origin = c.data;
			self.$index = null;
			self.$show_option = false;
			self.$dirty_option = false;
			self.mergeFixed();

			// 容器构建
			self.Super('init', arguments);

			// 清空配置中的值
			config.remove('/options').remove('/data');
		},
		afterBuild: function(){
			var self = this;
			var c = self.getConfig();
			var el = self.getDOM();
			var doms = self.$doms = {};
			var con = doms.resultCon = $('<div />').appendTo(el);
			self.addClass('M-commonDropdown uk-button-dropdown');
			doms.result = $('<div class="result"/>').height(c.height).css('line-height', c.height+'px').appendTo(con);
			doms.arrow = $('<div class="arrow"><i class="uk-icon-caret-down" /></div>').appendTo(con);
			el.width(c.width).height(c.height);

			self.uiBind(con, 'click', 'eventTrigger');
			self.uiBind('mouseup', 'eventTrackMe');

			if (c.url && c.auto_load){
				self.load();
			}else {
				self.updateSelected();
				self.showResult();
			}
		},
		// 重置选择
		reset: function(){
			var self = this;
			self.$data = null;
			self.$origin = null;
			self.hideOption();
			self.updateSelected();
			self.showResult();
			self.fire('optionReset');
			return self;
		},
		// 获取选中的数据ID
		getData: function(detail){
			var self = this;
			if (!detail){ return self.$data; }
			var idx, c = self.getConfig();
			if (detail === true){
				// 获取当前值
				idx = self.$index;
				if (idx === null){
					return null;
				}else if (idx === -1){
					return c.all;
				}else {
					return self.$options[idx];
				}
			}else {
				// 获取指定的记录
				if (detail === -1){
					if (c.all){ return c.all; }
				}else{
					return util.find(self.$options, detail, c.key);
				}
				return null;
			}
		},
		/**
		 * 获取当前的Options
		 * @return {Array} Option数组
		 */
		getOptions:function(){
			return this.$options;
		},
		// 设置显示数据
		setData: function(select, options){
			var self = this;
			if (util.isArray(select)){
				options = select;
				select = self.$origin;
			}

			if (options){
				this.$options = options;
				this.mergeFixed();
			}
			this.$origin = this.$data = select;
			self.updateSelected();
			self.showResult();
			if (self.$show_option){
				self.buildPanel();
				self.showSelect();
			}else {
				self.$dirty_option = true;
			}
			return self;
		},
		// 合并固定选项
		mergeFixed: function(){
			var self = this;
			var fixed = self.getConfig('fixed');
			var opts = self.$options;
			if (fixed){
				if (opts){
					opts.unshift.apply(opts, fixed);
				}else {
					self.$options = fixed;
				}
			}
		},
		setParam: function(param){
			var c = this.getConfig();
			this.setConfig('param', util.extend(c.param, param));
			return this;
		},
		// 加载显示数据
		load: function(){
			var c = this.getConfig();
			//todo: 加入加载状态提示
			switch(c.reqType){
				case 'ajax':
					pubjs.data.get(c.url, c.param, this);
				break;
				case 'websocket':
					pubjs.mc.send(c.url, c.param, this.onData.bind(this));
				break;
			}
		},
		reload: function(url, param){
			if(url){
				this.setConfig('url', url);
			}
			if(param){
				util.extend(this.getConfig('param'), param);
			}
			this.load();
		},
		// 拉取数据回调
		onData: function(err, data){
			//todo: 移除加载状态
			var self = this;
			if (err){
				pubjs.error(err.message);
				return false;
			}
			if(data && data.items){
				self.setData(self.$origin, data.items);

				// 数据加载完成
				self.fire(
					"dropdownDataLoaded"
					,{
						"data":self.$options
						,"now":self.$options[self.$index]
					}
				);
			}else{
				pubjs.error(LANG('无下拉框数据'));
			}
		},
		/**
		 * 显示选中的选项信息
		 */
		showResult: function(opt){
			var self = this;
			var c = self.getConfig();
			var dom = self.$doms.result;
			var option = opt || self.getData(true);
			if (option === null){
				if (c.def){
					dom.html(c.def);
				}else {
					dom.html('&nbsp;');
				}
			}else {
				if (c.render){
					var html = c.render(option, dom);
					if (html){ dom.html(html); }
				}else {
					dom.text(option[c.name]);
				}
			}
			return self;
		},
		// 监控鼠标是否点击到控件上, 防止选项被隐藏
		eventTrackMe: function(){
			this.$mouse_inside = true;
		},
		// 隐藏选项
		hideOption: function(){
			var self = this;
			if (self.$mouse_inside){
				self.$mouse_inside = false;
				return;
			}
			if (self.$doms.list){ self.$doms.list.hide(); }
			self.$show_option = false;
			$(document.body).unbind('mouseup.dropdown');
			self.fire("optionHide");
			return self;
		},
		// 显示选项
		showOption: function(){
			var self = this;
			self.$mouse_inside = false;
			self.$show_option = true;
			self.$doms.list.show();
			self.showSelect();
			self.uiBind(document.body, 'mouseup.dropdown', 'hideOption');
			return self;
		},
		// 显示对应的选中子菜单和状态
		showSelect: function(){
			var self = this;
			var doms = self.$doms.options;
			var index = self.$index;
			doms.find('.act').removeClass('act');
			if (index === -1){
				doms.children('[data-all]:first').addClass('act');
			}else if (index !== null) {
				doms.children('[data-id='+index+']:first').addClass('act');
			}
			return self;
		},
		// 显示选项界面触发
		eventTrigger: function(evt){
			var self = this;
			var doms = self.$doms;
			if (!doms.list){
				self.buildList();
			}
			if (self.$show_option){
				self.hideOption();
			}else {
				if (self.$dirty_option){
					doms.list.show();
					self.buildPanel();
				}
				self.showOption();
				if (doms.search_key){
					doms.search_key.focus();
				}
			}
		},
		// 选项过滤
		eventSearch: function(evt){
			var self = this;
			var input = self.$doms.search_key;
			var val = '';

			if (evt.data == 'cancel'){
				input.val('');
			}else {
				val = input.val();
			}

			self.toggleSeatchIcon(val === '')
			self.filterOption(
				self.$options,
				self.$doms.options.children('.option'),
				val,
				self.getConfig('search_callback')
			);
			self.updateScroll();
		},
		// 显示或者隐藏搜索按钮
		toggleSeatchIcon: function(state){
			var search = this.$doms.btnSearch;
			var cancel = this.$doms.btnCancel;
			if(state){
				search.show();
				cancel.hide();
			}else{
				search.hide();
				cancel.show();
			}
		},
		// 选项过滤循环函数
		filterOption: function(opts, elms, key, cb){
			if (key){
				var elm, text;
				key = key.toUpperCase();
				for (var i=0; i<elms.length; i++){
					elm = elms.eq(i);
					if (elm.attr('data-all') == '1'){continue;}
					if (cb){
						text = elm.attr('data-id');
						text = opts[text];
						if (text){
							elm.toggle(cb(key, text));
						}
					}else {
						text = elm.text().toUpperCase();
						elm.toggle(text.indexOf(key) !== -1);
					}
				}
			}else {
				elms.show();
			}
		},
		// 选中某个选项
		eventSelect: function(evt, elm){
			evt.preventDefault();
			evt.stopPropagation();
			var id, opt, dom = $(elm), self = this;
			if (dom.attr('data-all') == '1'){
				id = null;
				opt = self.getConfig('all');
				self.$index = -1;
			}else {
				id = +dom.attr('data-id');
				opt = self.$options[id];
				if (isNaN(id) || !opt || opt.nonData) {return;}
				self.$index = id;
				id = opt[self.getConfig('key')];
			}
			self.hideOption();
			if (id === self.$data) { return; }
			var msg = {
				id: id,
				last: self.$data,
				option: opt
			};
			self.$data = id;
			self.showResult(opt);
			self.fire('optionChange', msg);
		},
		// 生成选项列表
		buildList: function(){
			var self = this;
			var doms = self.$doms;
			var c = self.getConfig();
			var el = self.getDOM();

			doms.list = $('<div class="list"/>').appendTo(el);
			doms.list.css('min-width', c.option_width || c.width);
			doms.list.css('top', el.outerHeight());

			if (c.search){
				doms.search = $('<div class="search uk-form" />').appendTo(doms.list);
				doms.search_key = $('<input type="text" />').appendTo(doms.search);
				doms.btnSearch = $('<div class="btnSearch"/>').appendTo(doms.search);
				doms.btnCancel = $('<div class="btnCancel"/>').appendTo(doms.search);
				self.uiBind(doms.search_key, (c.search_atonce ? 'keyup' : 'change'), 'eventSearch');
				self.uiBind(doms.btnSearch, 'click', 'eventSearch');
				self.uiBind(doms.btnCancel,'click', 'cancel' , 'eventSearch');
				self.uiBind(doms.list, 'click', util.stopEvent);
			}

			if(c.drag){
				// 拖拉图标
				doms.drag = $('<div class="dragIcon"/>').appendTo(doms.list);
				pubjs.use('@plugins/drag', self.initDrag, self);
			}

			doms.options = $('<div class="options"/>').appendTo(doms.list);
			self.uiProxy(doms.options, '.option', 'click', 'eventSelect');

			if (c.scroll){
				doms.scroll = $('<div/>').appendTo(doms.list);
				doms.options.appendTo(doms.scroll);
				self.$dirty_option = false;
				self.createAsync('scroll', '@base/common/base.scroller', {
					target: doms.scroll,
					content: doms.options,
					dir: 'V'
				}, self.buildPanel);
			}else {
				self.buildPanel();
			}
			return self;
		},
		// 初始化拖拽功能
		initDrag: function(plugin){
			var self = this;
			plugin.drag(self.$doms.drag, self.eventDrag, self);
		},
		/**
		 * 控制块拖动处理函数
		 * @param  {Object} ev 拖动事件对象
		 * @return {Bool}    返回操作是否成功
		 */
		eventDrag: function(data, ev){
			var self = this;
			var doms = self.$doms;
			var list = doms.list;
			var search = doms.search_key;
			var opts = doms.options.parent();
			switch (data.type){
				case 'moveDrag':
					// 当前下拉框宽度
					var width = self.$width + data.dx;

					// 当前搜索框宽度
					var searchWidth = search && (self.$search + data.dx);

					// 当前下拉框高度
					var height = self.$height + data.dy;

					if(data.originWidth && (data.originWidth < width)){
						list.width(width);
						if(search){search.width(searchWidth);}
					}

					if(data.originHight && (data.originHight < height)){
						opts.height(height);

					}
				break;
				case 'startDrag':

					// 长宽
					self.$width =list.width();
					self.$search = search && search.width();
					self.$height =opts.css('minHeight','').height();

					// 原始长宽保存到object里面去
					if(!data.originWidth){
						data.originWidth = self.$width;
					}
					if(!data.originHight){
						data.originHight = self.$height;
					}

				break;
				case 'endDrag':
					self.$.scroll.update();
				break;
			}
			return true;
		},

		/**
		 * 过滤项目的对外接口函数。需要显示自定义数据的请在这边处理
		 * @return {Array} 符合需求的数据
		 */
		filter:function(){
			return this.$options;
		},
		/**
		 * 添加一个项目
		 * @param {Object} data 添加的数据
		 */
		add:function(data){
			var self = this;
			self.$options = self.$options || [];
			self.$options.unshift(data);
			self.$data = data[self.getConfig('key')];
			self.$index = 0;
			self.showResult(data);
			return self;
		},
		// 生成选项
		buildPanel: function(){
			var self = this;
			var c = self.getConfig();
			var doms = self.$doms;
			doms.options.empty();
			self.$dirty_option = false;

			// 默认显示的项目
			if (c.all){
				self.buildOption(c.all, null);
			}

			// 筛选数据
			self.$options = self.filter();

			// 循环生成
			util.each(self.$options, self.buildOptionLoop, self);

			// 搜索过滤框
			if (c.search){
				var w = doms.search_key.outerWidth(true) - doms.search_key.width();
				doms.search_key.hide();
				w = doms.search.width() - w;
				doms.search_key.show().width(w);
			}
			self.showSelect();
			self.updateScroll();
			return self;
		},
		buildOptionLoop: function(opt, id){
			this.buildOption(opt, id);
		},
		// 生成选项DOM对象
		buildOption: function(opt, id){
			var self = this;
			if (opt === '-'){
				$('<hr size="1" />').appendTo(self.$doms.options);
				return;
			}

			var c = self.getConfig();
			var dom = $('<a class="option" href="#"/>').appendTo(self.$doms.options);
			if (opt.nonData){
				dom.addClass('nonData');
			}
			if (id === null){
				dom.attr('data-all', 1);
			}else {
				dom.attr('data-id', id);
			}
			if (c.option_render){
				var html = c.option_render(id, opt, dom);
				if (html){ dom.html(html); }
			}else {
				dom.text(opt[c.name]);
			}
			return self;
		},
		// 更新滚动条状态
		updateScroll: function(){
			var self = this;
			if (!self.get('scroll')) { return; }
			var c = self.getConfig();
			var doms = self.$doms;
			if (c.option_height){
				var h = c.option_height;
				if (doms.search){
					h -= doms.search.outerHeight(true);
				}
				doms.options.css('marginTop', '');
				if (h > doms.options.outerHeight(true)){
					doms.scroll.css('height', 'auto');
				}else {
					doms.scroll.height(h);
				}
			}
			self.$.scroll.update();
			return self;
		},
		// 更新选中的项目状态
		// 根据选中的this.$data更新项目的选中状态
		updateSelected: function(){
			var self = this;
			var c = self.getConfig();
			var opts = self.$options;
			var index = null;
			if (self.$data !== null){
				index = util.index(opts, self.$data, c.key);
			}
			if (index === null){
				self.$data = null;
				if (!c.def){
					if (c.all){
						index = -1;
					}else{
						var op = util.first(opts);
						if (op){
							self.$data = op[c.key];
							index = 0;
						}
					}
				}
			}
			self.$index = index;
			return self;
		}
	});
	exports.base = DropdownBase;


	// 带子项目的下拉菜单
	var SubDropdownList = DropdownBase.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'key': '_id',
				'name': 'Name',
				'skey': 'subs',
				"always":true
			});

			var self = this;
			self.$subs_id = 1;
			self.$subs_level = 0;
			self.$subs_opts = {};
			self.$subs_sels = [];
			self.$subs_hide = {};

			self.Super('init', arguments);
		},
		// 获取选中的数据
		getData: function(detail){
			var self = this;
			if (!detail){ return self.$data; }

			var idx, c = self.getConfig();
			var opts = self.$options;
			var sels = [];
			var skey = c.skey;

			if (detail === true){
				// 获取当前选择数据
				idx = self.$index;
				if (idx === null){
					return null;
				}else if (idx === -1){
					return c.all;
				}else {
					idx = util.each(idx, function(id){
						if (id === null){
							if (!c || !c.all){ return false; }
							id = c.all;
						}else {
							c = id = opts && opts[id];
							if (!id){ return false; }
							opts = id[skey];
						}
						sels.push(id);
					});
					if (idx === null){ return sels; }
				}
			}else{
				// 选择指定的记录
				if (detail === -1){
					if (c.all){ return c.all; }
				}else{
					idx = util.each(detail, function(val){
						val = util.find(opts, val, c.key)
						if (!val){ return false; }
						sels.push(val);
					});
					if (idx === null){ return sels; }
				}
			}
			return null;
		},
		// 设置选项
		setData: function(select, options){
			var self = this;
			if (options){
				self.$options = options;
			}
			self.$data = select;
			self.$subs_sels = [];
			self.updateSelected();
			self.showResult();
			if (self.$show_option){
				self.buildPanel();
				self.showSelect();
			}else {
				self.$dirty_option = true;
			}
			return self;
		},
		// 更新选中的项目状态
		updateSelected: function(){
			var self = this,
				c = self.getConfig(),
				opts = self.$options,
				data = [],
				index = [],
				opt, idx;

			idx = util.each(self.$data, function(id){
				// 上一个选项是所有选项, 不允许有子项目
				if (idx === -1){ return false; }
				if (id === null){
					// 所有选项
					if (opt && opt.all){
						idx = -1;
						data.push(null);
					}else {
						return false;
					}
				}else {
					idx = util.index(opts, id, c.key);
					if (idx === null){
						return false;
					}
					opt = opts[idx];
					opts = opt[c.skey];
					data.push(opt[c.key]);
				}
				index.push(idx);
			});
			if (idx !== null){
				data = null;
				if (c.def){
					index = null;
				}else{
					if (c.all){
						index = -1;
					}else{
						opts = self.$options;
						idx = util.index(opts, undefined, c.skey);
						if (idx !== null){
							data = [opts[idx][c.key]];
							index = [idx];
						}
					}
				}
			}
			self.$data = data;
			self.$index = index;
			return self;
		},
		// 生成选中的选项信息
		showResult: function(){
			var self = this;
			var c = self.getConfig();
			var dom = self.$doms.result;
			var sels = self.getData(true);
			if(dom){
				if(sels && sels.length){
					if (c.render){
						var html = c.render(sels, dom);
						if (html){ dom.html(html); }
					}else {
						var opt = sels.pop();
						dom.text(opt[c.name]);
					}
				}else{
					if(c.def){
						dom.html(c.def);
					}else {
						dom.html('&nbsp;');
					}
				}
			}
			return self;
		},
		// 显示对应的选中子菜单和状态
		showSelect: function(){
			var self = this;
			var doms = self.$doms;
			var index = self.$index;

			// 去掉选择状态
			doms.options.find('a.act').removeClass('act');
			if (doms.subOption){
				doms.subOption.find('a.act').removeClass('act');
			}

			if (index === -1){
				doms.options.children('[data-all]:first').addClass('act');
			}else if (index){
				// 处理选择
				doms = doms.options;
				util.each(index, function(idx, lv){
					var a = doms.find('[data-id='+idx+']:first').addClass('act');
					var sid = +a.attr('data-subs');
					if (isNaN(sid)){ return false; }
					var sub = self.$subs_opts[sid];
					if (!sub){ return false; }
					doms = sub.list;
					self.showSubOption(sid);
				});
			}
			return self;
		},
		// 处理搜索
		eventSearch: function(evt, input){
			var self = this;
			var con = $(input).parent().parent();
			var sid = +con.attr('data-sid');
			var sels = self.$subs_sels;
			if (isNaN(sid)){
				// 主列表调用原搜索函数
				self.Super('eventSearch', arguments);
				// 隐藏所有子选项卡
				self.$doms.subOption.children().hide();
				sels.splice(0, sels.length);
			}else {
				var sub = self.$subs_opts[sid];
				self.filterOption(
					sub.options,
					sub.list.children('.option'),
					input.value,
					sub.search_callback
				);
				// 调用相对的滚动条更新
				sub.scroll_dirty = 1;
				self.updateSubScroll(sid);
				// 搜索时隐藏子菜单
				self.showSubOption(sid, true);
			}
		},
		// 生成选项
		buildPanel: function(){
			var self = this;
			var doms = self.$doms;
			// 清除子菜单项目
			if (doms.subOption){
				doms.subOption.empty();
				util.each(self.$subs_opts, function(sub){
					if (sub.scroll){
						sub.scroll.destroy();
					}
					return null;
				});
			}
			// 调用父类方法构建选项
			self.Super('buildPanel', arguments);
			doms.options.children().attr('data-level', 0);

			return self;
		},
		// 构建选项
		buildOption: function(opt, id){
			var self = this;
			self.Super('buildOption', arguments);
			var c = self.getConfig();
			if (opt[c.skey] && opt[c.skey].length){
				var doms = self.$doms;
				self.buildSubPanel(
					opt, id,
					doms.options.children(':last')
				);
			}
		},
		// 构建子菜单选项
		buildSubPanel: function(opt, id, parent_elm){
			var self = this;
			var sid = self.$subs_id++;
			var doms = self.$doms;

			if (!doms.subOption){
				doms.subOption = $('<div class="sub-list"/>').appendTo(doms.list);
				self.uiProxy(doms.subOption, '.search_key', 'change', 'eventSearch');
				self.uiProxy(doms.list, 'a.option', 'mouseenter mouseleave', 'eventOptionMouse');
				self.uiProxy(doms.list, 'a.option', 'click', 'eventSelect');
			}

			// 列表容器
			var c = self.getConfig();
			var panel = $('<div class="subs"/>').appendTo(doms.subOption);
			panel.width(opt.option_width || c.option_width || c.width);
			parent_elm.attr('data-subs', sid).addClass('has-sub');

			// 准备子列表选项配置
			c = self.$subs_opts[sid] = {
				'id': opt[c.key],
				'index': id,
				'panel': panel,
				'anchor': parent_elm,
				'level': self.$subs_level++,
				'options': opt[c.skey],
				'list': $('<div class="options" data-type="sub"/>').appendTo(panel),
				'arrow': $('<div class="sub_arrow"/>').appendTo(panel)
			};

			// 是否有搜索框
			if (opt.search){
				c.search_init = 1;
				c.search = $('<div class="search" />').prependTo(panel);
				c.search_key = $('<input type="text" class="search_key" />').appendTo(c.search);
			}
			// 是否需要滚动条
			if (opt.scroll){
				c.height = opt.scroll;
				c.scroll_dirty = 1;
				c.container = $('<div/>').appendTo(panel).append(c.list);
				c.scroll = self.createAsync(null, '@base/common/base.scroller', {
					target: c.container,
					content: c.list,
					dir: 'V'
				});
			}

			// 创建子选项
			panel.attr({
				'data-sid':sid,
				'data-level':c.level
			});

			var ori_option = doms.options;
			doms.options = c.list;
			util.each(c.options, self.buildOption, self);
			doms.options = ori_option;
			c.list.children().attr('data-level', self.$subs_level);
			self.$subs_level--;

			return self;
		},
		// 更新滚动条
		updateSubScroll: function(sid){
			var sub = this.$subs_opts[sid];
			if (sub.scroll && sub.scroll_dirty){
				sub.scroll_dirty = 0;
				if (sub.height){
					var h = sub.height;
					if (sub.search){
						h -= sub.search.outerHeight(true);
					}
					sub.list.css('marginTop', '');
					if (h > sub.list.outerHeight(true)){
						sub.container.css('height', 'auto');
					}else {
						sub.container.height(h);
					}
				}
				sub.scroll.update();
			}
			return this;
		},
		// 隐藏选项
		hideOption: function(){
			var self = this;
			self.Super('hideOption', arguments);
			if (!self.$show_option){
				self.$doms.subOption.children().hide();
				self.$subs_sels.splice(0, self.$subs_sels.length);
			}
			return self;
		},
		// 子菜单选中
		eventOptionMouse: function(evt, elm){
			var self = this;
			var a = $(elm);
			var sid = +a.attr('data-subs');
			if (isNaN(sid)){
				var doms = self.$doms;
				// 没有子菜单的选项(隐藏下一层菜单)
				sid = +a.attr('data-level');
				if (self.$subs_sels.length > sid){
					self.hideSubOption(self.$subs_sels[sid]);
				}else {
					doms = a.closest('.subs[data-sid]');
					if (doms.length){
						sid = +doms.attr('data-sid');
						if (sid === self.$subs_hide.sid){
							self.hideSubOption(false);
						}
					}
				}
				return;
			}

			// 子菜单选项处理

			switch (evt.type){
				case 'mouseenter':
					// 显示子栏目
					self.showSubOption(sid);
					// 更新滚动条状态
					self.updateSubScroll(sid);
				break;
				case 'mouseleave':
					self.hideSubOption(sid);
				break;
			}
		},
		// 选项选择
		eventSelect: function(evt, elm){
			var self = this;
			evt.preventDefault();
			evt.stopPropagation();
			var a = $(elm);
			if (a.attr('data-subs')){
				// 子选项, 显示选项, 不能选中
				evt.type = 'mouseenter';
				self.eventOptionMouse(evt, elm);
				return;
			}
			var lv = +a.attr('data-level');
			var subs = self.$subs_opts
			var sels = self.$subs_sels;
			var opts = self.$options;
			var data = [], index = [], opt = [];
			var id, c;

			for (id=0; id<lv; id++){
				if (sels.length <= id){ return; }
				c = subs[sels[id]];
				opt.push(opts[c.index]);
				index.push(c.index);
				data.push(c.id);
				opts = c.options;
			}
			if (a.attr('data-all') === '1'){
				id = null;
				opt.push(c.all);
				index.push(id);
				if (data.length === 0){
					data = id;
				}else {
					data.push(id);
				}
			}else {
				id = +a.attr('data-id');
				if (!opts[id] || opts[id].nonData){
					return;
				}
				opt.push(opts[id]);
				index.push(id);
				id = opts[id][self.getConfig('key')];
				data.push(id);
			}

			if(!self.getConfig('always')){
				if (self.$data === null){
					if (data === null){
						return;
					}
				}else if (self.$data.toString() === data.toString()){
					return;
				}
			}

			var msg = {
				id: data,
				last: self.$data,
				option: opt
			};
			self.$data = data;
			self.$index = index;

			self.showResult();
			self.fire('optionChange', msg);

			self.hideOption();
		},
		// 显示指定的子选项
		showSubOption: function(sid, force){
			var self = this;
			var opts = self.$subs_opts;
			var sub  = opts[sid];
			var sels = self.$subs_sels;

			// 取消延迟隐藏
			self.hideSubOption(false);

			// 当前维度菜单已显示, 不再处理
			if (!force && sels[sub.level] === sid){
				return self;
			}

			// 隐藏下级维度的菜单
			while (sels.length > sub.level){
				opts[sels.pop()].panel.hide();
			}

			// 获取上层菜单
			var last_sub = sels.length ? opts[sels[sels.length - 1]] : null;

			// 把当前ID存入数组中
			sels.push(sid);

			// 计算子菜单显示位置
			var anchor = sub.anchor;
			var pos = self.measureOptionPos(anchor[0]);
			var con = sub.panel.show();
			var anchor_pos = anchor.offset();
			// 弹出层于body中的垂直坐标
			var diff = anchor_pos.top;
			var con_height = con.outerHeight() / 2;
			pos.top -= con_height;
			if(pos.top < 0){
				// 自弹出层垂直坐标为负数时
				diff += pos.top;
			}else{
				diff = 0;
			}
			if(diff < 0){
				// 层的位置需要保持在界面中
				pos.top -= diff;
			}else{
				diff = 0;
			}

			// 箭头的高度位置
			sub.arrow.css('top', con_height - sub.arrow.outerHeight() / 2 + diff);

			// 判断X坐标
			// 优先根据上级子菜单的展开方向展开
			var dir = last_sub ? last_sub.show_dir : 'right';
			var left = anchor_pos.left;
			var arrow_width = sub.arrow.outerWidth();
			var anchor_width = anchor.parent().outerWidth();
			var con_width = con.outerWidth();

			if (dir == 'right'){
				if (left + anchor_width + arrow_width + con_width + 15 > $(document).width()){
					dir = 'left';
				}
			}else {
				if (left - con_width - arrow_width - 15 < 0){
					dir = 'right';
				}
			}

			if (dir == 'right'){
				sub.arrow.css('left', -arrow_width).removeClass('sub_right_arrow');
			}else {
				pos.left -= anchor_width + con_width + arrow_width + 4;
				sub.arrow.css('left', con_width-4).addClass('sub_right_arrow');
			}
			con.css(pos);
			sub.show_dir = dir;

			// 修正搜索框宽度
			if (sub.search_init){
				sub.search_init = 0;
				con = sub.search_key
				pos = con.outerWidth(true) - con.width();
				con.hide();
				pos = sub.search.width() - pos;
				con.show().width(pos);
			}

			return self;
		},
		// 隐藏子选项
		hideSubOption: function(mode){
			var self = this;
			var c = self.$subs_hide;
			if (mode === true){
				// 隐藏子选项
				var sub = self.$subs_opts[c.sid];
				if (!sub){ return; }
				var sels = self.$subs_sels;
				if (sels[sub.level] !== c.sid){ return; }
				while (sels.length > sub.level){
					self.$subs_opts[sels.pop()].panel.hide();
				}
			}else if (mode === false){
				// 取消隐藏
				if (c.tid){ clearTimeout(c.tid); }
			}else {
				// 延迟隐藏
				c.sid = mode;
				if (c.tid){ clearTimeout(c.tid); }
				c.tid = self.setTimeout('hideSubOption', 500, true);
				return;
			}
			c.tid = 0;
			c.sid = -1;
			return self;
		},
		// 计算菜单位置
		measureOptionPos: function(elm){
			var relate = this.$doms.list[0];
			var top = elm.offsetHeight / 2;
			var left = elm.parentElement.parentElement.offsetWidth;
			while (elm !== relate && elm !== document.body){
				top += elm.offsetTop;
				left += elm.offsetLeft;
				elm = elm.offsetParent;
			}
			return {'top':top, 'left':left};
		}
	});
	exports.subDropdown = SubDropdownList;



	// 漂浮弹出多维菜单
	var FloatDropdown = SubDropdownList.extend({
		init: function(config){
			config = pubjs.conf(config, {
				"target": pubjs.DEFAULT_POPUP_CONTAINER,
				"anchor":"body:first",
				'width': 'auto',
				'auto_show': false,
				"search":false,
				"scroll":false,
				"drag":false
			});

			var self = this;
			// 定位锚点元素
			self.$anchor = $(config.get('anchor'));

			self.Super('init', arguments);
		}
		,afterBuild: function(){
			var self = this;
			self.Super('afterBuild', arguments);
			self.addClass("M-commonFloatDropdown");
			self.$doms.resultCon.hide();

			// 隐藏容器
			self.getDOM().width(0).height(0).hide();
			if (self.getConfig('auto_show')){
				self.show();
			}
		}
		,setAnchor: function(anchor){
			if(anchor){
				this.$anchor = $(anchor);
			}
			return this;
		}
		,updatePosition: function(){
			var self = this;
			var el = self.getDOM();
			var doms = self.$doms;
			var posOP = $(el.prop('offsetParent')).offset();
			var width = (doms.list) ? doms.list.outerWidth() : 0;

			var anchor = self.$anchor;
			var anchor_pos = anchor.offset();
			var anchor_width = anchor.outerWidth();

			if (anchor_pos.left + anchor_width + width > $(document).width()){
				anchor_pos.left -= width - 5;
			}else {
				anchor_pos.left += anchor_width + 5;
			}

			anchor_pos.left -= posOP.left;
			anchor_pos.top -= posOP.top;
			el.css(anchor_pos);

			return self;
		}
		,show:function(){
			var self = this;
			self.getDOM().show();

			// 清除选择
			self.setData(null);

			// 强制Trigger显示选项
			self.$show_option = false;
			self.eventTrigger();

			// 计算显示位置
			self.updatePosition();

			return self;
		}
		,hide:function(){
			this.hideOption();
			return this;
		}
		,hideOption: function(){
			this.Super('hideOption', arguments);
			if (!this.$show_option){
				this.getDOM().hide();
			}
			return this;
		}
		,eventSelect:function(evt,elm){
			elm = $(elm);
			if(elm.hasClass('nonData') || elm.hasClass('has-sub')){
				evt.preventDefault();
				evt.stopPropagation();
			}else {
				this.Super('eventSelect', arguments);
			}

			// var lv = +$(elm).attr('data-level');
			// if(lv){
			// 	this.hide();
			// }
		}
		,showSelect: function(){}
	});
	exports.floatDropdown = FloatDropdown;
});