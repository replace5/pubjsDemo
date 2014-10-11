define(function(require, exports){
	var $ = require('jquery');
	var pubjs = require('../core/pub');
	var util = require('../core/util');
	var tip = require('./tip');
	var view = require('./view');
	var labels = require('grid/labels');
	var base = require('./common/base');
	var format = labels.format;
	labels = labels.labels;


	var GLOBAL_AMOUNT_TIP = null;


	/**
	 * 自定义栏目设置窗口
	 * @param {Object} config 模块实例配置对象
	 * @todo 记录暂时使用localStorage，要兼容ie6的话将使用userData。
	 *       模块已写完，位于devcode。未测试，需要使用时再做。
	 */
	var CustomColumn = tip.base.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'name': '',
				'class': 'M-tableCustomColumn',
				'list':{},
				'selected':[],
				'autoShow': false,
				'autoHide': false,
				'pos': 'bL',
				'offsetY': 1,
				'hasArrow':false
			});

			this.$selected = config.get('/selected');
			this.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			self.Super('afterBuild', arguments);

			var c = self.getConfig();
			var doms = self.$doms;

			// 构建结构
			var skips = {'default': 1, 'custom': 1};
			var table = $('<table/>').appendTo(doms.content);
			var list = doms.list = $('<tr/>').appendTo(table);
			util.each(c.list, function(item){
				if (skips[item.name]){
					return;
				}

				// 分组容器
				var td = $('<td/>').appendTo(list);
				// 分组标题
				var lb = labels.get(item.text);
				$('<strong />').text(lb.text).appendTo(td);

				// 分组项目
				var name, i;
				for (i=0; i<item.cols.length; i++){
					name = item.cols[i];
					lb = labels.get(name);
					lb = $('<label />').text(lb.text).appendTo(td);
					$('<input type="checkbox" />').val(name)
						.prop('checked', (self.$selected.indexOf(name) != -1))
						.prependTo(lb);
				}
			});

			// 添加操作按钮
			var foot = $('<div class="M-tableCustomColumnFooter" />').appendTo(doms.content);
			foot.append([
				'<div class="fr">',
					'<button class="uk-button" data-action="cancel">取消</button>',
					'<button class="uk-button uk-button-primary" data-action="ok">确定</button>',
				'</div>',
				'<div class="checkboxCon">',
					'<button class="uk-button" data-action="all">全选</button>',
					'<button class="uk-button" data-action="invert">反选</button>',
				'</div>'
			].join(''));

			doms.all = foot.find('[data-action="all"]');
			doms.invert = foot.find('[data-action="invert"]');

			// 绑定操作事件
			self.uiProxy(foot, 'button', 'click', 'eventButton');

			self.uiBind(document, 'mouseup', 'eventAutoHide');
			self.uiBind('mouseup', 'eventSkipHide');
		},
		//
		eventButton: function(evt, elm){
			var self = this;
			var list = self.$doms.list;
			var sels, unsels;
			elm = $(elm);
			switch(elm.attr('data-action')){
				case 'ok':
					var checks = list.find('input:checked').toArray();
					if (checks.length){
						sels = self.$selected;
						sels.splice(0, sels.length);
						util.each(checks, function(check){
							sels.push(check.value);
						});
						self.fire('columnChange', {
							'name': self.getConfig('name'),
							'selected': sels
						});
					}
				/* falls through */
				case 'cancel':
					self.hide();
					break;
				case 'all':
					unsels = list.find('input:not(:checked)');
					list.find(':checkbox').prop('checked', Boolean(unsels.length));
					break;
				case 'invert':
					sels = list.find('input:checked');
					unsels = list.find('input:not(:checked)');
					sels.prop('checked', false);
					unsels.prop('checked', true);
					self.$doms.all.prop('checked', (sels.length === 0 && unsels.length > 0));
					break;
			}
		},
		// 显示界面时, 重置选择框状态
		doShow: function(){
			var self = this;

			// 恢复当前选中状态
			var list = self.$doms.list.find('input:checkbox').toArray();
			var sels = self.$selected;
			util.each(list, function(input){
				input.checked = (sels.indexOf(input.value) != -1);
			});

			return self.Super('doShow', arguments);
		},
		eventSkipHide: function(evt){
			this.$skipClick = evt.timeStamp;
		},
		eventAutoHide: function(evt, elm){
			var self = this;
			switch (evt.type){
				case 'mouseup':
					if (this.$skipClick != evt.timeStamp){
						self.hide();
					}
					break;
			}
		}
	});


	/**
	 * 栏目分类切换
	 */
	var Tab = view.container.extend({
		init: function(config, parent){
			config = pubjs.conf(config, {
				'class':'M-tableTab',
				'target':parent,
				'tag':'ul',
				'cols':null, // 列修改或过滤, null-排除, [...]-合并, [true,...]-忽略默认, [false,...]-合并到末尾
				'list':[],
				'active': false,
				'activeClass': 'M-tableTabActive',
				'itemClass': 'M-tableTabItem',
				'table': null,
				'gridCols': null,
				// 是否自动补齐分类
				"autoComplete": 'default_tab_cols'
			});

			var c = config.get();
			var list = c.list;

			// 自动合并默认字段设置
			if (c.autoComplete){
				var LIST = pubjs.config(c.autoComplete);
				var n, m, item, cols;
				if (list.length === 0){
					// 啥都没设定话
					cols = c.cols;
					for (n in LIST){
						m = cols ? cols[n] : 0;
						if (m === null){ continue; }
						item = util.extend({name:n}, LIST[n]);
						if (m){
							item.cols = _mergeCols(m, LIST[n].cols);
						}
						list.push(item);
					}
				}else {
					// 只设了一部分
					for (n=0; n<list.length; n++){
						item = list[n];
						if (util.isString(item)){
							// 字符串, 查找默认的列配置属性
							if (LIST[item]){
								list[n] = util.extend({name: item}, LIST[item]);
							}
						}else if (item && LIST[item.name]){
							// 合并对应项目的cols和对应默认配置
							cols = _mergeCols(item.cols, LIST[item.name].cols);
							delete item.cols;
							util.extend(item, LIST[item.name]);
							item.cols = cols;
						}else {
							// 删掉默认配置不存在的项目?
							list.splice(n--, 1);
						}
					}
				}
			}

			// 自动合并Grid字段到默认分组
			if (c.gridCols && list[0]){
				list[0].cols.unshift.apply(list[0].cols, c.gridCols);
				util.unique(list[0].cols, false, true);
			}

			// 判断激活分组
			var act = c.active;
			c.active = (list && list[0] && list[0].name || null);
			if (act){
				util.each(list, function(group){
					if (group.name == act){
						c.active = group.name;
						return false;
					}
				});
			}

			this.$wins = {};
			this.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			var cfg = self.getConfig();
			var doms = self.$doms = {};
			var item, li, btn;

			for (var i=0; i< cfg.list.length; i++){
				item = cfg.list[i];
				li = $('<li/>').text(LANG(item.text))
					.attr('data-index', i)
					.attr('class', cfg.itemClass)
					.toggleClass(cfg.activeClass, item.name == cfg.active);

				self.append(li);

				// 自定义
				if (item.custom){
					// 如果外部没传入指定值则尝试获取已设定的自定义选项
					if(item.cols.length === 0){
						item.cols = self.getCustom(item.name);
					}

					btn = $('<i class="uk-icon-caret-down"/>').appendTo(li);
					self.uiBind(btn, 'click', 'eventClickCustom');
				}
				doms['tab_item_' + i] = li;
			}
			self.uiProxy('li[data-index]', 'click', 'eventClickTab');
		},
		/**
		 * 发送修改消息
		 * @param  {String}    name 类型名称
		 * @return {Undefined}      无返回值
		 */
		fireEvent:function(name){
			var self = this;
			var cfg = self.getConfig();
			var list = cfg.list;
			var item;
			for (var i=0; i<list.length; i++){
				item = list[i];
				if (item.name == name){
					if(item.name === "custom" && !item.cols.length){
						// 自定义类型，且用户尚未选显示的字段时
						self.find('li[data-index='+i+'] i').click();
					}else{
						self.fire('changeTab', item);
						if (cfg.table){
							cfg.table.showColumn(item.cols);
						}
						return true;
					}
					break;
				}
			}
			return false;
		},
		eventClickTab: function(evt, elm){
			elm = $(elm);
			var self = this;
			var cfg = self.getConfig();
			var item = cfg.list[elm.attr('data-index')];

			if (!item || item.name == cfg.active){return false;}

			util.each(self.$wins, function(win, id){
				win.hide();
			})

			// 查找配置
			if (self.fireEvent(item.name)){
				// 移除原来选中的标签的激活状态
				self.getDOM().children().removeClass(cfg.activeClass);

				elm.addClass(cfg.activeClass);
				cfg.active = item.name;
			}
			return false;
		},
		eventClickCustom: function(evt, elm){
			var self = this;
			var idx = $(elm).parent().attr('data-index');
			var wins = self.$wins;
			var win = wins[idx];
			if (!win){
				var list = self.getConfig('list');
				var item = list[idx];
				// 创建多选窗口
				if (!item){ return; }

				win = wins[idx] = self.create(CustomColumn, {
					'name': item.name,
					'selected': item.cols,
					'anchor': self.getDOM(),
					'list': list
				});
			}

			util.each(wins, function(tip, id){
				if (id != idx){
					tip.hide();
				}
			})

			if (win.isShow()){
				win.hide();
			}else {
				win.show();
			}
			return false;
		},
		/**
		 * 自定义设置改变时的响应函数
		 * @param  {Object}  ev 消息对象
		 * @return {Boolean}    阻止事件冒泡
		 */
		onColumnChange: function(ev){
			var name = ev.param.name;
			var sels = ev.param.selected;
			if (sels.length <= 0){ return false; }

			var self = this;
			var cfg = self.getConfig();
			var list = cfg.list;
			for (var i=0; i<list.length; i++){
				if (list[i].name != name) {continue;}
				list[i].cols = sels;
				// 存起
				self.setCustom(name, sels);
				if (cfg.active === name) {cfg.active = null;}
				self.$doms['tab_item_' + i].click();
				break;
			}
			return false;
		},
		// 返回当前激活的分组里的列数组
		getColumns: function(ev){
			var c = this.getConfig();
			if (c.list.length <= 0){
				return [];
			}
			for (var i=0; i<c.list.length; i++){
				if (c.list[i].name == c.active){
					return c.list[i].cols;
				}
			}
			c.active = c.list[0].name;
			return c.list[0].cols;
		},
		/**
		 * 获取已设定的自定义选项
		 * @return {String} 存储的值
		 */
		getCustom:function(name){
			var id = 'customTab' + this._.uri + '.' + name;
			var list = pubjs.storage(id);
			if(list){
				return list.split(',');
			}else {
				return [];
			}
		},
		/**
		 * 存储自定义选项
		 * @param {Array}      data 选项数组
		 * @return {Undefined}      无返回值
		 */
		setCustom:function(name, data){
			var id = 'customTab' + this._.uri + '.' + name;
			pubjs.storage(id, data.join(','));
		},
		// 获取字段列表配置
		getList: function(){
			return this.getConfig('list');
		}
	});
	exports.tab = Tab;

	/**
	 * 总计模块
	 * @param {Object} config 模块配置
	 */
	var Amount = view.container.extend({
		init: function(config, parent){
			config = pubjs.conf(config, {
				'class': 'M-tableAmount',
				'target': parent,
				'cols': [], // 字段设置
				'data': null,
				"showAct":false,
				'hasItemClick': false,
				"actCls":"itemAct"
			});

			var self = this;
			self.$cols = [];
			self.$data = null;
			self.delayResize = self.delayResize.bind(self);
			self.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			var c = self.getConfig();
			var list = self.$list = $('<ul/>');
			self.append(list);

			var cols = self.$cols;
			// 处理列配置
			util.each(c.cols, function(col){
				if (util.isString(col)){
					col = {'name':col};
				}else if (!col.name){
					return;
				}
				col = util.extend({
					'name': null,
					'desc': null,
					'field': null,
					'format': null,
					'render': null,
					'context': null
				}, labels.get(col.name), col);

				switch (col.type){
					case 'id':
					case 'index':
					case 'dim':
					case 'fixed':
					case 'control':
					case 'select':
					case 'op': return;
				}

				// 处理回调函数
				_prepare_col_callback(self, col, 'format');
				_prepare_col_callback(self, col, 'render');

				cols.push(col);
			});

			// 创建单元格
			var doms = self.$doms = {};
			for (var i=0; i<cols.length; i++){
				doms[i] = self.buildBox(i, cols[i], c.hasItemClick);
			}
			doms.lists = list.children();

			// 设置空数据, 初始化尺寸
			self.setData(c.data);

			// 创建滚动条
			self.create('scroll', base.scroller, {wheel: 'shift'});

			// 绑定事件
			self.uiProxy(list, 'em[data-desc]', 'mouseenter mouseleave', 'eventTips');
			if (c.hasItemClick){
				list.addClass("allowClick");
				self.uiProxy(list, 'li[data-index]', 'click', 'eventItemClick');
			}
		},
		buildBox: function(index, col, hasClick){
			var box = $('<li/>').attr('data-index', index);
			$('<span/>').text(col.text).appendTo(box);
			$('<b/>').appendTo(box);
			if (col.desc) {
				$('<em/>').attr('data-desc', col.desc).appendTo(box);
			}
			if(hasClick){
				box.append('<p/>');
			}
			return box.appendTo(this.$list);
		},
		/**
		 * 设定当前激活的项目
		 * @param  {Mix}    key     项目索引或指标名
		 * @param  {Bool}   silence 是否发送消息
		 * @return {Object}         模块实例
		 */
		setActive:function(key,silence){
			var self = this;
			var c = self.getConfig();
			var doms = self.$doms;
			var cols = self.$cols;
			var tag,col,val = null;

			if(isNaN(+key)){
				// 指标名称
				val = util.index(cols, key, 'name');
			}else if (cols[key]){
				val = key;
			}
			if (val === null){
				return self;
			}

			tag = doms[val];
			col = cols[val];

			if (c.showAct){
				doms.lists.removeClass(c.actCls);
				tag.addClass(c.actCls);
			}

			if (!silence){
				val = self.$data;
				val = val && val[col.field || col.name] || 0;
				self.fire("amountItemClick",{
					"name":col.name,
					"value": val,
					"label": col
				});
			}
			return self;
		},
		eventItemClick: function(evt, elm){
			var self = this;
			var idx = +$(elm).attr('data-index');
			self.setActive(idx);
		},
		eventTips: function(evt, elm){
			var self = this;
			var tag  = $(elm);
			var desc = tag.attr('data-desc');
			if (!desc){ return; }

			if (evt.type == 'mouseleave'){
				if (GLOBAL_AMOUNT_TIP && !GLOBAL_AMOUNT_TIP.isVisible()){
					GLOBAL_AMOUNT_TIP.hide();
				}
				return;
			}

			if (!GLOBAL_AMOUNT_TIP){
				GLOBAL_AMOUNT_TIP = self.create('tip', tip.base, {
					'autoHide': 'leave',
					'width': 200,
					'offsetX': -1,
					'offsetY': -2,
					'delayShow': 500,
					'delayHide': 1000
				});
			}
			// 更新定位锚点对象, 设置提示信息, 显示提示
			GLOBAL_AMOUNT_TIP.update({'anchor': tag}).setData(desc).show();
		},
		/**
		 * 设置或更新数据
		 * @param {Object} data <可选> 新的数据记录对象
		 */
		setData: function(data){
			var self = this;
			var doms = self.$doms.lists;

			self.$data = (data || {});
			util.each(self.$cols, function(col, index){
				var cell = doms.eq(index).children('b');
				var val = data && data[col.field || col.name] || 0;
				if (col.format){
					val = col.format.call(col.format_ctx || window, val);
				}
				if (col.render){
					val = col.render.call(
						col.render_ctx || window,
						0, val, data, col, cell, self
					);
				}
				if (val === null || val === undefined){
					val = '-';
				}else if (val === ''){
					val = '&nbsp;';
				}
				cell.empty().append(val);
			});
			self.resize();

			return self;
		},
		/**
		 * 设置要显示那些列
		 * @param  {Array} columns 要显示的列名称数组
		 * @return {None}         无返回
		 */
		showColumn: function(columns){
			var self = this;
			var lists = self.$doms.lists;
			if (!columns){
				// 全显示
				lists.css('display', '');
			}else {
				var cols = self.$cols;
				for (var i=0; i<lists.length; i++){
					lists[i].style.display = (util.index(columns, cols[i].name) === null ? 'none':'');
				}
				_do_sort_element(_gen_sort(cols, columns), lists, 'data-index');
			}
			self.resize();
		},
		/**
		 * 计算格子大小
		 * @return {None} 无返回
		 */
		resize: function(){
			var self = this;
			var el = self.getDOM();
			var width = el.width();
			if (width <= 0){
				self.delayResize(true);
				return;
			}
			var boxs = self.$list.children('li:visible');
			if (boxs.length <= 0){
				pubjs.log('no visible item');
			}
			self.delayResize(false);

			var box = boxs.removeClass('first').css('width', '').eq(0);
			var diff = box.outerWidth() - box.width();
			var i, w, box_ws = [];
			for (i=0; i<boxs.length; i++){
				w = boxs.eq(i).width();
				width -= (w + diff);
				box_ws.push(w);
			}
			box.addClass('first')
			if (width > 0){
				w = Math.floor(width / boxs.length);
				for (i=1; i<boxs.length; i++){
					boxs.eq(i).width(box_ws[i] + w);
				}
				box.width(box_ws[0] + w + (width % w));
				self.$list.css('width', '');
			}else {
				self.$list.width(el.width() - width);
			}
			if (self.get('scroll')){
				self.$.scroll.update();
			}
		},
		delayResize: function(set){
			var self = this;
			if (set){
				if (!self.$delay_resize_tid){
					self.$delay_resize_tid = setInterval(self.delayResize, 500);
				}
			}else if (set === false){
				if (self.$delay_resize_tid){
					clearInterval(self.$delay_resize_tid);
					self.$delay_resize_tid = 0;
				}
			}else {
				self.resize();
			}
		}
	});
	exports.amount = Amount;

	/**
	 * 二级表格选择控件
	 * @param  {[type]} config [description]
	 * @return {[type]}        [description]
	 */
	var subGridPrefix = 'M-subGrid-';
	var subGridConClass = 'M-tableListSubCtr';
	var subGridConSelector = '.'+subGridConClass;

	var SubGridCtr = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'target': pubjs.getPlatformDom('popup'),
				'subs': [],
				'table': null,
				'showCallback': null
			});

			var subs = config.get('subs');
			if (subs.length){
				var self = this;
				self.$active = null;
				self.$target = null;
				self.$default_class = null;
				self.$hide_tid = 0;

				self.Super('init', arguments);
			}
		},
		afterBuild: function(){
			var self = this;
			self.addClass('M-tableSubGridCtr');
			self.hide();

			var cfg = self.getConfig();
			var doms = self.$doms = {};
			var sub,lab,btn;
			for (var i=0; i<cfg.subs.length; i++){
				sub = cfg.subs[i];
				if (util.isString(sub)){
					lab = labels.get('grid_' + sub);
					if (!lab){
						pubjs.error('SubGrid Config Not Found - ' + sub);
						continue;
					}
					sub = util.extend({'type':sub}, lab);
				}else if (sub.type){
					lab = labels.get('grid_' + sub.type);
					if (lab){
						sub = util.extend({}, lab, sub);
					}
				}else {
					pubjs.error('SubGrid Config Not Found - ', sub);
					continue;
				}
				cfg.subs[i] = sub;
				btn = doms[sub.type] = sub.iconBtn = $('<a href="#"/>');
				btn.attr({
					'class': sub['class'] || (subGridPrefix + sub.type),
					'title': sub.text || '',
					'data-mode': sub.mode || '',
					'data-index': i
				});
				if (!self.$default_class){
					self.$default_class = btn.attr('class');
				}
				self.append(btn);
			}

			self.uiProxy('a', 'click', 'eventClickButton');
			self.uiBind('mouseleave mouseenter', 'eventHide');
		},
		/**
		 * 扩展功能按钮点击响应函数
		 * @param  {Object}  evt 鼠标事件
		 * @return {Boolean}     阻止冒泡
		 */
		eventClickButton: function(evt, elm){
			var self = this;
			var dom = $(elm);
			var id = dom.attr('data-index');
			var cfg = self.getConfig('subs/'+id);
			if (!cfg){ return false; }

			switch(dom.attr('data-mode')){
				case "sub":
					if (dom.hasClass('act')){
						// 取消显示
						self.hideSubGrid();
					}else {
						// 打开或切换显示
						self.showSubGrid(cfg);
					}
					break;
				case "func":
					/*
					{
						action:function(){
							//code
						}
						,"type":"detail"
						,"mode":"func"
						,context:self
					}
					 */
					if(util.isFunc(cfg.action)){
						cfg.action.call(
							cfg.context || self
							,self.getRowData()
						);
					}
					break;
				default:
					// 功能按钮, 调用对应功能
					self.subFunction(cfg);
					break;
			}

			return false;
		},
		eventHide: function(evt){
			var self = this;
			if (evt === true){
				self.$hide_tid = 0;
				self.hide();
			}else if (evt.type === 'mouseleave'){
				if (!self.$hide_tid){
					self.$hide_tid = self.setTimeout('eventHide', 300, true);
				}
			}else {
				clearTimeout(self.$hide_tid);
				self.$hide_tid = 0;
			}
		},
		/**
		 * 显示选择控件
		 * @param  {Element} dom 目标图表DOM Element
		 * @return {None}
		 */
		show: function(dom){
			var self = this;
			var cfg = self.getConfig();
			var doms = self.$doms;
			dom = self.$target = $(dom).children('div[data-sub]:first');
			if (self.$active){
				doms[self.$active].removeClass('act');
			}
			self.appendTo(dom);
			if (dom.hasClass('act')){
				var sub = dom.attr('data-sub');
				if (doms[sub]){
					doms[sub].addClass('act');
					self.$active = sub;
				}
			}
			var cb = self.getConfig('showCallback');
			if (cb){
				var data = self.getRowData();
				if (data){
					if (util.isFunc(cb)){
						cb(cfg.subs, data, self);
					}else if (util.isArray(cb)){
						cb[1].call(cb[0], cfg.subs, data, self);
					}
				}
			}
			self.Super('show');
		},
		/**
		 * 关闭subGrid显示列
		 * @return {None}
		 */
		hideSubGrid: function(){
			var self = this;
			self.$target.attr('class', self.$default_class);
			var sub = self.$target.closest('tr');
			var index = +sub.attr('data-index');
			var table = self.getConfig('table');

			sub = table && table.hideSubRow && table.hideSubRow(index);
			if (sub){
				self.fire('hideSubGrid', {
					'type':sub.attr('data-sub'),
					'index':index
				});
			}
			if (self.$active){
				self.$doms[self.$active].removeClass('act');
			}
		},
		/**
		 * 打开指定类型的subGrid
		 * @param  {Object} cfg subGrid类型配置信息
		 * @return {None}
		 */
		showSubGrid: function(cfg){
			var self = this;
			var name = cfg.type;
			var row = self.$target.closest('tr');
			var index = +row.attr('data-index');
			if (isNaN(index)){
				pubjs.error('二级表格获取数据列索引失败');
				return false;
			}
			var c = self.getConfig();
			var label = labels.get('grid_' + cfg.type);
			var data = c.table.rowData(index);
			var old_name = self.$target.attr('data-sub');
			self.$target.removeClass(subGridPrefix + old_name);
			self.$target.addClass('act '+ subGridPrefix + name).attr('data-sub', name);

			var sub = c.table.showSubRow(index, label.collapse);
			if (!sub) { return false; }

			if (c.key){
				sub.row.attr({
					'data-id': data[c.key],
					'data-sub': name,
					'data-idx': index
				});
			}

			self.fire('showSubGrid', {
				'type':name, 'config':cfg, 'label':label,
				'target':sub.div, 'index':index, 'data':data
			});

			// 修改图标状态
			var doms = self.$doms;
			if (self.$active){
				doms[self.$active].removeClass('act');
			}
			doms[name].addClass('act');
			self.$active = name;
		},
		/**
		 * 设置指定类型的subGrid的显示
		 */
		setSubGrid: function(data){
			var c = this.getConfig();
			util.each(c.subs,function(el){
				if(util.find(data, el.type) != null){
					el.iconBtn.show();
				}else{
					el.iconBtn.hide();
				}
			});
		},
		/**
		 * 扩展功能非sub类型默认处理函数
		 * @param  {Object}    cfg 配置
		 * @return {Undefined}     无返回值
		 */
		subFunction: function(cfg){
			var self = this;
			var name = cfg.type;
			var label = labels.get('grid_' + cfg.type);

			self.fire(
				'subFunction'
				,{
					'type':name
					,'config':cfg
					,'label':label
					// 获取对应行的索引
					,'index':self.getRowIndex()
					// 获取对应行的数据
					,'data':self.getRowData()
				}
			);
			self.hide();
		},
		getRowIndex: function(){
			var index = +this.$target.closest('tr').attr('data-index');
			if (isNaN(index)){
				pubjs.error('二级表格获取数据列索引失败');
				return false;
			}
			return index;
		},
		/**
		 * 获取对应行的数据
		 * @return {Object} 行数据
		 */
		getRowData:function(){
			var self = this;
			var index = self.getRowIndex();
			var table = self.getConfig('table');
			return (table && index !== false) ? table.rowData(index) : null;
		}
	});


	/**
	 * 列表主体表格
	 */
	var List = view.container.extend({
		init: function(config, parent){
			/**
			render > list > html
			"functional":{
				,render:function(){//code}
				,"html":'<a><em></em>text</a>'
				,"list":[
					{
						"text":"abc"
						,"icon":"resume"
						,"class":"G-icon"
						,"func":"enable"
						,"attr":{
							"href":"http://"
							,"data-func":"enable"
						}
					}
				]
			}
			**/
			config = pubjs.conf(config, {
				'class': 'M-tableList',
				'target': parent,
				'cols': [],
				'subs': null,
				'subClass': 'M-tableListSubGrid',
				'subFilter': null,
				'rowClick': false,
				'rowSelect':false,
				'opClick': false,
				'data': null,
				'index': 0,
				'sort': null,
				'key': null,		// 记录索引字段名
				'order': 'desc',
				'default_sort': true,
				'scroll_type': 'horizontal', // 滚动类型, horizontal-普通水平, row-垂直行滚动, col-水平列滚动
				'scroll_size': 20,	// 滚动显示的行列数
				'dragset':true,		// 列表左右拖拽控制
				'emptyText': LANG('没有数据'),
				'loadingText': LANG('数据加载中, 请稍后..'),
				"functional":null,
				"disable_func":false,
				'hasMenu': false, // 是否有操作菜单
				// {1}:text,{2}:main icon class,{3}:icon class,{4}:functional type,{5}:other attr.
				"functionalElTpl":'<a title={1} {4} {5}><em class="{2} {3}"></em>{1}</a>',
				'highlightClassName': "M-tableListRowHighlight",
				"highlightRowClass":"M-tableListHighlightRow"
			});

			var self = this;
			var c = config.get();

			// 规范排序顺序变量
			if (c.order != 'desc'){ c.order = 'asc'; }

			//触发行选择函数
			if(c.rowSelect && !c.rowClick){
				c.rowClick = self.eventSelectRow;
			}

			// 处理操作功能配置
			var func = c.functional;
			if(func){
				if (isNaN(func.where)){
					func.where = (!c.cols.length || c.cols[0].type !== "id") ? 0 : 1;
				}
				func.width = isNaN(func.width) ? 30 : func.width;
				func.text = func.text || LANG("操作");
				func.type = "control";
				func.name = "functional";
				c.cols.splice(func.where, 0, func);
			}

			self.$set_data_hide = true;

			// 表格数据
			self.$data = null;

			// 选中状态
			self.$selectedRowId = {};
			self.$hasSelect = false;

			// 高亮行的id
			self.$highlightIds = [];

			// 子表格容器列表
			self.$subs_div = [];

			// 功能函数禁用状态
			self.$disableFunc = c.disable_func;

			// 当前横向滚动方向坐标
			self.$scrollPos = 0;

			// 回调父类方法
			self.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			// 处理列配置信息
			var cfg = self.getConfig();
			self.cols = [];
			for (var i=0; i<cfg.cols.length; i++){
				self.cols.push(self.formatCol(cfg.cols[i]));
			}

			// 构造表格对象
			self.table = $('<table/>');
			self.append(self.table);

			// subGrid控制模块
			var subs = cfg.subs;
			if (subs){
				self.subCtr = self.create('subCtrl', SubGridCtr, {
					'table': self,
					'subs': subs,
					'key': cfg.key,
					'showCallback': cfg.subFilter
				});
				subs = [];
				util.each(cfg.subs, function(sub){
					subs.push(util.isString(sub) ? sub : sub.type);
				});
				cfg.subs = subs;
				// 子表格事件绑定
				self.uiProxy(
					self.table, ".M-tableListSub,"+subGridConSelector,
					'mouseenter mouseleave', 'eventSubGrid'
				);
			}

			// 构建表格
			self.rows = [];
			self.buildHead();
			self.buildBody();

			// 创建滚动控制模块
			var scroll = {
				wheel: 'shift',
				type:'manual',
				step:3,
				offset:0,
				margin:[2, self.head.outerHeight() + 2]
			};
			switch (cfg.scroll_type){
				case 'row':
					scroll.dir = 'V';
					scroll.pad = false;
					scroll.wheel = true;
				/* falls through */
				case 'col':
					cfg.dragset = null;
					break;
				default:
					scroll = {wheel:'shift'};
					break;
			}
			self.create('scroll', base.scroller, scroll);


			// 初始化拖拽滚动功能
			if (cfg.dragset && pubjs.drag){
				pubjs.drag(self.body, self.eventScrollerHandler, self);
			}

			// 功能弹出层中的功能
			if(cfg.functional){
				self.uiProxy(self.body,".M-tableListFunctional a[data-func]","click","eventFunctionalHandler");
				self.uiProxy(self.body,".M-tableListFunctional","mouseenter mouseleave","eventToggleFunctional");
			}

			// 选择功能事件监听
			if (self.$hasSelect){
				self.uiProxy(self.body, 'input[data-type="select_item"]', 'change', 'eventSelectChange');
			}

			// 行点击事件监听
			if (cfg.rowClick){
				self.uiProxy(self.table, '.M-tableListClickable', 'click', 'eventClickRow');
			}

			// 操作菜单事件监听
			if (cfg.hasMenu){
				self.uiProxy(self.table, 'td[data-ctype="menu"]', 'click', 'eventClickMenu');
			}

			// 设置预设数据
			self.setData(cfg.data);
		},
		// 获取字段列表配置
		getCols: function(){
			var data = [], cols = this.cols;

			for(var i in cols){
				if(cols[i].type == 'col'){
					data.push(cols[i]);
				}
			}
			return data;
		},
		// 格式化列配置为标准的配置对象
		formatCol: function(col){
			var self = this;
			var name, cfg = self.getConfig();

			if (typeof(col) == 'string'){
				col = {'name': col};
			}
			// 处理选择类型列
			if (col.type === 'select'){
				self.$hasSelect = true;
				col.select_id = name = util.guid();
				if (col.all && !col.head_html){
					col.head_html = '<input type="checkbox" data-select="'+name+'" data-type="select_all"'+(col.readonly?'disabled':'')+'/>';
				}
				if (!col.html){
					col.html = '<input type="checkbox" data-select="'+name+'" data-type="select_item" '+(col.readonly?'disabled':'')+'/>';
				}
				if (!col.width){
					col.width = 30;
				}
				// 创建选中状态存储
				self.$selectedRowId[name] = [];
			}

			// 操作菜单
			if(col.type === 'menu'){
				if (!col.html){
					col.html = '<div class="M-tableListMenu"/>';
				}
			}

			// 扩展默认列属性
			col = util.extend(
				{
					type: 'col',	// 列类型: col, id, index, dim, fixed, select
					name: null,
					field: null,
					text: null,
					desc: null,
					halign: null,
					hcls: null,
					align: null,
					cls: null,
					width: 0,
					format: null,
					render: null,
					hide: false,
					force_sort: false,
					sort: cfg.default_sort,
					order: 'asc'
				},
				labels.get(col.name, 'type_'+col.type),
				col
			);
			_prepare_col_callback(self, col, 'format');
			_prepare_col_callback(self, col, 'render');

			// 检查列是否需要排序
			if (col.force_sort){
				col.sort = col.force_sort;
			}
			if (col.sort === true){
				col.sort = (col.field || col.name);
			}

			// 处理列对齐方式
			if (!col.align){
				switch(col.type){
					case 'id':
					case 'op':
					case 'select':
					case 'menu':
						col.align = 'center';
					break;
					case 'index':
					case 'dim':
					case 'fixed':
						col.align = 'left';
					break;
				}
			}

			return col;
		},
		onScrollReset:function(evt){
			var c = this.getConfig();
			if (c.dragset !== null){
				c.dragset = evt.param;
			}
			return false;
		},
		/**
		 * 生成列表的头部
		 * @return {None} 无返回
		 */
		buildHead: function(){
			var self = this;
			var head = self.head = $('<thead/>');
			var cols = self.cols;
			var col, cell, row = $('<tr/>');

			for (var i=0; i<cols.length; i++){
				col = cols[i];
				cell = $('<th/>').attr('data-col', i).appendTo(row);
				self.buildHeadCell(cell, col);
			}
			head.append(row).appendTo(self.table);
			// 监听事件
			self.uiProxy(head, '.M-tableListHeadSort', 'click', 'eventClickSort');
			self.uiProxy(head, '.M-tableListHeadSort', 'mouseenter mouseleave mousedown mouseup', 'eventSort');
		},
		buildHeadCell: function(cell, col){
			var self = this;
			var text, c = self.getConfig();
			if (col.head_html){
				cell.html(col.head_html);
			}else {
				text = col.text || '&nbsp;';
				cell.append($('<span/>').text(text));
			}

			if (col.halign){
				cell.attr('align', col.halign);
			}
			if (col.hcls){
				cell.attr('class', col.hcls);
			}
			if (col.width){
				cell.width(col.width);
			}
			if (col.force_sort || (('col dim fixed'.indexOf(col.type) !== -1) && col.sort)){
				cell.addClass('M-tableListHeadSort');
				cell.append('<em/>');
				if (col.sort === c.sort){
					cell.addClass(c.order);
				}
			}else if (col.type === 'op' && c.opClick){
				self.uiBind(cell, 'click.tableHeadOp', 'eventClickOpHeader');
			}else if (col.type === 'select' && col.all){
				self.uiBind(cell.find('input[data-type="select_all"]'), 'click', 'eventClickSelectHeader');
			}
		},
		/**
		 * 表头鼠标排序事件响应
		 * @param  {Object} evt jQuery事件对象
		 * @return {None}     无返回
		 */
		eventSort: function(evt, elm){
			switch (evt.type){
				case 'mouseenter': $(elm).addClass('M-tableListHeadHover'); break;
				case 'mousedown': $(elm).addClass('M-tableListHeadDown'); break;
				case 'mouseup': $(elm).removeClass('M-tableListHeadDown'); break;
				case 'mouseleave': $(elm).removeClass('M-tableListHeadHover M-tableListHeadDown'); break;
			}
			evt.stopPropagation();
			evt.preventDefault();
		},
		/**
		 * 表头排序点击事件
		 * @param  {Object} evt jQuery事件对象
		 * @return {None}     无返回
		 */
		eventClickSort: function(evt, elm){
			var self = this;
			var td = $(elm);
			var col = td.attr('data-col');
			var c = self.getConfig();
			td.parent().children('.M-tableListHeadSort').removeClass('asc desc');
			col = self.cols[col];
			if (c.sort == col.sort){
				c.order = (c.order == 'desc' ? 'asc' : 'desc');
			}else {
				c.sort = col.sort;
			}
			col.order = c.order;
			td.addClass(c.order);
			self.fire('changeSort', col);
			evt.stopPropagation();
		},
		/**
		 * 表格拖放事件处理
		 * @param  {object} ev dragEvent
		 * @param  {event} e  jqueryEvent
		 * @return {boolean}    return boolean是否继续事件
		 */
		eventScrollerHandler: function(ev,e){
			var self = this;
			switch(ev.type) {
				case "moveDrag":
					self.$.scroll.scrollBy(-ev.cdx);
					break;
				case 'endDrag':
					self.body.removeClass('draghand');
					if (Math.abs(ev.dx) > 5){
						self.$skipClickRow = util.time_diff();
					}
					break;
				case "startDrag":
					if (self.$.scroll.getScrollMax()<=0){ return false; }
					var bd = self.body[0];
					var td = e.target, tr = td.parentElement, pe = tr.parentElement;
					while (pe && pe != bd){
						if (pe === document.body){ return false; }
						td = tr;
						tr = pe;
						pe = pe.parentElement;
					}
					if ($(td).attr('data-ctype')){ return false; }
					if ($(tr).attr('data-type') !== 'row'){ return false; }

					// 允许拖动
					self.body.addClass('draghand');
					return true;
			}
		},
		setSort: function(field, order){
			var self = this;
			var c = self.getConfig();
			var head = self.head;
			head.find('.M-tableListHeadSort').removeClass('asc desc');
			c.sort = field;
			c.order = order;

			util.each(self.cols, function(col, idx){
				if (col.sort == field){
					head.find('th[data-col="'+idx+'"]:first').addClass(order);
				}
			});
			return self;
		},
		/**
		 * 获取当前排序字段
		 * @return {String} 返回排序字符串
		 */
		getSort: function(){
			var cfg = this.getConfig();
			if (!cfg.sort || cfg.sort === true){
				return undefined;
			}
			// 这里应该只返回sort的值就可以了
			if (util.isString(cfg.sort)){
				return cfg.sort + (cfg.order == 'asc' ? '|1' : '|-1');
			}else {
				var sort = '';
				util.each(cfg.sort, function(order, name){
					sort += ',' + name + (order == 'asc' ? '|1' : '|-1');
				});
				if (sort !== ''){
					return sort.substr(1);
				}else {
					return undefined;
				}
			}
		},
		/**
		 * 生成表格记录行
		 * @return {None} 无返回
		 */
		buildBody: function(){
			var self = this;
			self.body = $('<tbody/>').appendTo(self.table);
			if (self.getConfig('opClick')){
				self.uiProxy(self.body, 'td[data-ctype="op"]', 'click', 'eventClickOp');
			}
		},
		/**
		 * 生成表格行
		 * @param  {Number} index 数据行索引号
		 * @param  {Object} data  数据行数据
		 * @return {jQuery}       返回行的jQuery对象
		 */
		buildRow: function(index, data){
			var self = this;
			var cols = self.cols;
			var col, cell;
			var row = $('<tr data-type="row"/>').attr('data-index', index);
			if (index % 2){
				row.attr('class', 'alt');
			}
			var env = {
				'id': index,
				'dat': data,
				'sub': true,
				"func": true
			};

			// 生成单元格
			for (var i=0; i<cols.length; i++){
				col = cols[i];
				cell = $('<td/>').appendTo(row);
				if (col.type != 'col'){
					cell.attr('data-ctype', col.type);
				}

				self.buildCell(cell, col, env,row);
			}

			// 绑定行点击事件
			if (self.getConfig('rowClick')){
				row.addClass('M-tableListClickable');
			}
			self.rows[index] = row;
			return row.appendTo(self.body);
		},
		/**
		 * 生成表格单元格信息
		 * @param  {jQuery} cell 单元格jQuery对象
		 * @param  {Object} col  列配置对象
		 * @return {None}      无返回
		 */
		buildCell: function(cell, col, env, row){
			var self = this;
			var cfg = self.getConfig();
			var text = null;
			if (col.type == 'id'){
				text = cfg.index + env.id + 1;
			}else if (col.html){
				text = col.html;
			}else {
				if (col.field && util.has(env.dat, col.field)){
					text = env.dat[col.field];
				}else if (util.has(env.dat, col.name)){
					text = env.dat[col.name];
				}
				if (col.format){
					// 格式化函数, 只传单元格的值进入
					text = col.format.call(col.format_ctx || window, text, col, self);
				}
				if (col.render){
					// 渲染函数, 传入当前数据索引, 当前经过格式化的值, 还有行数据
					// 可以返回jQuery对象
					text = col.render.call(
						col.render_ctx || window,
						env.id, text, env.dat, col, cell, self,row
					);
				}
				if (text === null || text === undefined){
					text = '-';
				}
			}
			if (text === ''){
				text = '&nbsp;';
			}
			if (col.align){
				cell.addClass(col.align);
			}
			if (col.cls){
				cell.addClass(col.cls);
			}
			if (col.hide || col.forceHide){
				cell.hide();
			}

			var hasSub = env.sub && cfg.subs && col.type == 'index';

			var hasFun = env.func && cfg.functional && col.type == 'control';
			var mode = (hasSub ? 1 : 0);

			if(hasFun){
				cell.empty();
				if(!self.$disableFunc){
					var fun = $('<div class="M-tableListFunctional"/>');
					cell.append(
						$('<div class="M-tableListFunctionalAnchor" />').append(
							fun.append(self.buildFunction(cfg.functional,env,fun,col,row))
						)
					);
				}
				env.func = false;
			}

			if (mode){
				// 功能模块单元格, 增加功能模块结构
				var content;
				var frame = cell.children('.M-tableListSub');
				if (frame.length){
					content = frame.children('.M-tableListContent');
				}else {
					frame = $('<div class="M-tableListSub"></div>').appendTo(cell);
					content = $('<div class="M-tableListContent"/>').appendTo(frame);
				}

				// 插入功能模块控制
				/*if (hasFun){
					var fun = frame.children('.M-tableListFunctional');
					if (self.$disableFunc){
						fun.remove();
						mode--;
					}else {
						if (fun.length){
							fun.empty();
						}else {
							fun = $('<div class="M-tableListFunctional"/>').appendTo(frame);
						}
						var dom = self.buildFunction(cfg.functional, env, fun, col);
						if (dom){
							fun.append(dom);
						}else {
							fun.remove();
							mode--;
						}
					}
					env.func = false;
				}*/

				// 插入子表格控制列
				if (hasSub){
					var sub = frame.children(subGridConSelector);
					if (sub.length){
						sub = sub.children('div:first');
					}else {
						sub = $('<div class="'+subGridConClass+'"/>').appendTo(frame);
						sub = $('<div/>').appendTo(sub);
					}
					env.sub = cfg.subs[0];
					sub.attr('class', subGridPrefix + env.sub).attr('data-sub', env.sub);
					env.sub = false;
				}

				// 设置多行高度修正
				if (mode > 1){
					frame.addClass('M-tableListSubRow2');
				}else {
					frame.removeClass('M-tableListSubRow2');
				}
				// 设置显示内容
				if (mode > 0 && text !== cell){
					content.empty().append(text);
				}
			}
			if (mode === 0 && text !== cell && !hasFun){
				// 普通单元格, 清空内容重新设置
				cell.empty().append(text);
			}

			// 选择栏状态更新
			if (col.type === 'select'){
				text = env.dat[cfg.key];
				var sels = self.$selectedRowId[col.select_id];
				if (util.index(sels, text) !== null){
					cell.find('input:first').prop('checked', true);
				}
			}
		},
		buildFunction: function(cfg, env, cell, col,row){
			var dom = '';

			if (util.isFunc(cfg.render)){
				dom = cfg.render.call(
					cfg.context || window,
					env.id, null, env.dat, col, cell, this, row
				);
			}else if (cfg.html){
				dom = cfg.html;
			}else if (util.isArray(cfg.list) && cfg.list.length){
				util.each(cfg.list, function(i){
					var list = [];
					if (i.func){
						list.push('data-func="'+i.func+'"');
					}
					if (i.attr){
						for (var n in i.attr){
							list.push(n+'="'+util.html(i.attr[n])+'"');
						}
					}
					dom += util.formatIndex(
						cfg.functionalElTpl,
						i.text,
						i['class'] || 'G-icon',
						i.icon || '',
						list.join(' ')
					);
				});
				cfg.html = dom;
			}

			return (dom || false);
		},
		/**
		 * 显示无数据提示
		 * @return {None} 无返回
		 */
		showEmptyRow: function(){
			var self = this;
			var row = self.emptyRow;
			if (!row){
				var len = self.cols.length;
				row = self.emptyRow = $('<tr class="M-tableListEmpty"><td colspan="'+len+'"></td></tr>');
				row.appendTo(self.body);
				row.children().text(self.getConfig('emptyText'));
			}
			self.body.children('tr').hide();
			self.hideLoading();
			row.css('display', '');
			return self;
		},
		/**
		 * 隐藏空数据提示
		 * @return {None} 无返回
		 */
		hideEmptyRow: function(){
			var self = this;
			if (self.emptyRow){
				self.emptyRow.hide();
			}
			return self;
		},
		/**
		 * 显示数据加载中
		 * @return {None} 无返回
		 */
		showLoading: function(opacity){
			var self = this;
			if (!opacity){
				var mask = self.loadingRow;
				var el = self.getDOM();
				var width = el.width();
				if(!width){
					self.$showloadingDelay = true;// 需要等容器显示出来后再showLoading
					return false;
				}
				if (!mask){
					mask = self.loadingRow = $('<div class="M-tableListLoading"/>').appendTo(el);
				}
				mask.width(width).height(el.height()).show();
				if (self.emptyRow){
					self.emptyRow.children().text(self.getConfig('loadingText'))
				}
			}
			return self;
		},
		/**
		 * 隐藏数据加载提示
		 * @return {None} 无返回
		 */
		hideLoading: function(){
			var self = this;
			self.$showloadingDelay = false;
			if (self.loadingRow){
				self.loadingRow.hide();
			}
			if (self.emptyRow){
				self.emptyRow.children().text(self.getConfig('emptyText'))
			}
			return self;
		},
		/**
		 * 显示自动刷新提示
		 * @return {None}
		 */
		showRefresh: function(mode){
			var self = this;
			if (mode === 'hide'){
				self.removeClass('disabled');
			}else {
				self.addClass('disabled');
				self.setTimeout('showRefresh', 300, 'hide');
			}
			return self;
		},
		/**
		 * 行点击jQuery回调函数
		 * @param  {Object} evt jQuery事件对象
		 * @return {None}     无返回
		 */
		eventClickRow: function(evt, elm){
			// 检查是否有拖拽情况发生
			var self = this;
			var time = self.$skipClickRow;
			self.$skipClickRow = 0;
			if (time && util.time_diff(time) < 500){
				return false;
			}
			// 如果是特殊类型的单元格, 则不允许点击
			var col_type = _closetAttr(evt.target, 'data-ctype', elm);
			switch (col_type){
				case 'op':
				case 'id':
				case 'select':
				case 'noclick':
					return;
			}

			var row = $(elm);
			var index = +row.attr('data-index');
			var data = self.rowData(index);

			if (!data){ return; }

			var func = self.getConfig('rowClick');
			if (util.isFunc(func)){
				func(data, index, self);
			}else {
				self.fire('listRowClick', {
					'index': index, 'data': data,
					'col_type':col_type, 'row':elm, 'event':evt
				});
			}
		},
		/**
		 * 操作方法点击处理
		 * @param  {Object} evt jQuery事件对象
		 * @param  {Object} elm DOM对象
		 * @return {None}     无返回 / 返回false阻止事件冒泡
		 */
		eventClickOp: function(evt, elm){
			evt.stopPropagation();
			var type = _closetAttr(evt.target, 'data-op', elm);
			if (!type){
				return;
			}

			var self = this;
			var index = +$(elm).parent().attr('data-index');
			var data = self.rowData(index);

			if (!data){ return false; }
			var target = $(evt.target);

			var func = self.getConfig('opClick');
			if (util.isFunc(func)){
				func(type, data, index, self, target);
			}else {
				self.fire('listOpClick', {
					'index':index, 'data':data,
					'op':type, 'el':target
				});
			}
			return false;
		},
		/**
		 * 操作列表头点击处理
		 * @param  {Object} evt jQuery事件对象
		 * @param  {Object} elm DOM对象
		 * @return {None}     无返回 / 返回false阻止事件冒泡
		 */
		eventClickOpHeader: function(evt, elm){
			evt.stopPropagation();
			var type = _closetAttr(evt.target, 'data-op', elm);
			if (!type){ return; }
			var target = $(evt.target);

			var self = this;
			var func = self.getConfig('opClick');
			if (util.isFunc(func)){
				func(type, null, null, self, target);
			}else {
				self.fire('listOpClick', {'op':type, 'el':target});
			}
		},
		/**
		 * 行选择功能选择变更回调函数
		 * @param  {Object} evt jQuery事件对象
		 * @param  {Object} elm DOM对象
		 * @return {None}     无返回 / 返回false阻止事件冒泡
		 */
		eventSelectChange: function(evt, elm){
			evt.stopPropagation();
			var self = this;
			var index = _closetAttr(elm, 'data-index', self.body[0]);
			if (index === null || isNaN(+index)){ return; }

			var keyName = self.getConfig('key');
			var cid = +$(elm).attr('data-select');
			var col = util.find(self.cols, cid, 'select_id');
			var data = self.rowData(index);
			var key = data[keyName];
			var sels = self.$selectedRowId[col.select_id] || [];
			var changed = false;

			if (elm.checked){
				// 选择
				if (util.index(sels, key) === null){
					sels.push(key);
					changed = true;
				}
			}else {
				// 取消
				changed = util.remove(sels, key);
			}
			self.$selectedRowId[col.select_id] = sels;
			self.updateSelectRowByCol(col);
			if(changed){
				data = [];
				util.each(sels, function(id){
					var row = util.find(self.$data, id, keyName);
					if (row){ data.push(row); }
				}, self);

				self.fire('changeSelect', {
					"column":col
					,"selected":sels.slice()
					,"data":data
				});
				data = null;
			}
		},
		/**
		 * 选择表格行元素时，改变checkbox的状态
		 * @param  {object} data  行数据
		 * @param  {number} index 索引号
		 * @return {None]}        无返回
		 */
		eventSelectRow : function(data,index,list){
			if(list.rows[index]){
				list.rows[index].find("input[data-select]:first").click();
			}
		},
		/**
		 * 点击全选框事件回调函数
		 * @param  {Object} evt jQuery事件对象
		 * @param  {Object} elm DOM对象
		 * @return {None}     无返回 / 返回false阻止事件冒泡
		 */
		eventClickSelectHeader: function(evt, elm){
			evt.stopPropagation();
			var self = this;
			var c = self.getConfig();
			var cid = +$(elm).attr('data-select');
			var col = util.find(self.cols, cid, 'select_id');
			var sels = self.$selectedRowId[col.select_id];
			var chk = elm.checked;
			var len = sels.length;
			self.body.find('input[data-select='+cid+']').prop('checked', chk);

			util.each(self.$data, function(item){
				var key = item[c.key];
				if (chk){
					sels.push(key);
					self.setSelectedRowHighlight(key,c.highlightRowClass);
				}else {
					util.remove(sels, key);
					self.unsetSelectedRowHighlight(key,c.highlightRowClass);
				}
			});

			if (chk){
				util.unique(sels);
			}
			if (sels.length != len){
				// 数据有修改, 发送事件
				var data = [];
				util.each(sels, function(id){
					var row = util.find(self.$data, id, c.key);
					if (row){ data.push(row); }
				}, self);
				self.fire('changeSelect', {'column': col, 'selected': sels, 'data': data});
			}
		},
		/**
		 * 更新列表的选择状态
		 * @param  {String} name <可选> 指定设置那个列的ID, 不指定则修改全部
		 * @return {None}
		 */
		updateSelectRow: function(name){
			var self = this;
			var data = self.$data;
			// 当前没有数据
			if (!data || !data.length){
				self.table.find('input[data-select]').prop('checked', false);
				return self;
			}
			// 更新状态
			if (name === undefined){
				util.each(self.cols, function(col){
					if (col.type !== 'select'){ return; }
					self.updateSelectRowByCol(col);
				}, self);
			}else {
				var col = util.find(self.cols, name, 'name');
				if (col && col.type === 'select'){
					self.updateSelectRowByCol(col);
				}
			}
			return self;
		},
		updateSelectRowByCol: function(col){
			var self = this;
			var c = self.getConfig();
			var key = c.key
				,sid = col.select_id
				,sels = self.$selectedRowId[sid];

			if(!sels || !sels.length){
				self.body.find("."+c.highlightRowClass).removeClass(c.highlightRowClass)
				self.$highlightIds = [];
				self.table.find('input[data-select='+sid+']').prop('checked',false);
				return self;
			}

			var ips = self.body.find('input[data-select='+sid+']')
			var idx = 0, all = true, data = false;

			util.each(self.$data, function(row){
				var chk = (util.index(sels, row[key]) !== null);
				ips.eq(idx++).prop('checked', chk);
				self[
					chk ? "setSelectedRowHighlight" : "unsetSelectedRowHighlight"
				](row[key],c.highlightRowClass);
				all = all && chk;
				data = true;
			});
			self.head.find('input[data-select='+sid+']').prop('checked', all && data);
			return self;
		},
		/**
		 * 设置选中的行ID信息
		 * @param  {Array}  ids  选中的行ID记录数组
		 * @param  {String} name <可选> 指定设置那个列的ID, 不指定则修改全部
		 * @return {Bool}        返回是否修改
		 */
		setSelectRowIds: function(ids, name){
			var self = this;
			var sels = self.$selectedRowId;
			var cols = self.cols;
			var updated = false;
			if (name === undefined){
				util.each(sels, function(row, sid){
					var col = util.find(cols, +sid, 'select_id');
					if (col && col.type === 'select'){
						sels[sid] = ids;
						self.updateSelectRowByCol(col);
						updated = true;
					}else {
						return null;
					}
				});
			}else {
				var col = util.find(cols, name, 'name');
				if (col && col.type === 'select'){
					sels[col.select_id] = ids;
					self.updateSelectRowByCol(col);
					updated = true;
				}
			}
			return updated;
		},
		addSelectRowId: function(id, name){
			var self = this;
			var SelIds = self.$selectedRowId;
			var cols = self.cols;

			if (name === undefined){
				var updated = false;
				util.each(SelIds, function(sels, sid){
					var col = util.find(cols, +sid, 'select_id');
					if (col && col.type === 'select'){
						if (util.index(sels, id) !== null){ return; }
						sels.push(id);
						self.updateSelectRowByCol(col);
						updated = true;
					}else {
						return null;
					}
				}, self);
				return updated;
			}else {
				var col = util.find(cols, name, 'name');
				if (!col || col.type !== 'select'){ return false; }
				var sels = SelIds[col.select_id];
				if (util.index(sels, id) !== null){ return false; }
				sels.push(id);
				self.updateSelectRowByCol(col);
				return true;
			}
		},
		removeSelectRowId: function(id, name){
			var self = this;
			var SelIds = self.$selectedRowId;
			var cols = self.cols;

			if (name === undefined){
				var updated = false;
				util.each(SelIds, function(sels, sid){
					var col = util.find(cols, +sid, 'select_id');
					if (col && col.type === 'select'){
						if (!util.remove(sels, id)){ return; }
						self.updateSelectRowByCol(col);
						updated = true;
					}else {
						return null;
					}
				}, self);
				return updated;
			}else {
				var col = util.find(cols, name, 'name');
				if (!col || col.type !== 'select'){ return false; }
				var sels = SelIds[col.select_id];
				if (!util.remove(sels, id)){ return false; }
				self.updateSelectRowByCol(col);
			}
		},
		/**
		 * 获取选中的行ID数组
		 * @param  {String} name <可选> 返回指定的名称选中列
		 * @return {Mix}      返回指定名称的ID数组, 或者名称对象数组
		 */
		getSelectRowIds: function(name){
			var self = this;
			var sels;
			if (name === undefined){
				sels = util.first(self.$selectedRowId);
			}else {
				var col = util.find(self.cols, name, 'name');
				if (col && col.type === 'select'){
					sels = self.$selectedRowId[col.select_id];
				}
			}
			return sels ? sels.slice() : [];
		},
		/**
		 * 控制功能响应处理函数
		 * @param  {Object} evt jQuery事件对象
		 * @param  {Object} el  鼠标事件源DOM对象
		 * @return {Bool}       阻止默认事件
		 */
		eventFunctionalHandler:function(evt,elm){
			var self = this;
			var el = $(elm);
			var index = +el.closest("tr").attr("data-index");
			if (isNaN(index)){ return false; }

			self.fire(
				"listFnClick"
				,{
					"func":el.attr("data-func")
					,"index":index
					,"el":el
					,"data":self.rowData(index)
				}
			);
			return false;
		},
		/**
		 * 切换显示控制功能
		 */
		eventToggleFunctional:function(evt,el){
			var self = this;
			if (self.$disableFunc){ return; }
			el = $(el);
			var a = el.find("a:first");
			el.width(
				evt.type === "mouseleave" && a.outerWidth() || a.outerWidth()*el.find("a").length+(el.find(".spacing")&&el.find(".spacing").width()||0)
			);
			el.closest(".M-tableListFunctionalAnchor")[
					evt.type === "mouseleave" && "removeClass" || "addClass"
				]("functionalHover");
			el = null;
			return false;
		},
		switchFunctional: function(state){
			var self = this;
			state = !state;
			if (!self.getConfig('functional') || state === self.$disableFunc){
				return self;
			}
			self.$disableFunc = state;
			self.updateColumnType('index');
			return self;
		},
		/**
		 * 二级表格按钮触发
		 * @param  {Object} evt jQuery事件对象
		 * @return {None}     无返回
		 */
		eventSubGrid: function(evt, elm){
			var self = this;
			if(self.subCtr){
				if(evt.type === "mouseenter"){
					elm = $(elm);
					if (!elm.hasClass(subGridConClass)){
						elm = elm.find(subGridConSelector);
					}
					self.subCtr.show(elm);
				}else if(evt.type === "mouseleave"){
					self.subCtr.hide();
				}
			}
			return false;
		},
		/**
		 * 二级表格滚动式固定位置处理
		 * @param  {Object} evt jQuery事件对象
		 * @return {None}     无返回
		 */
		onScroll: function(ev){
			var self = this;
			var c = self.getConfig();
			var p = ev.param;
			var rows = self.rows;
			var i, end;
			var start = self.$scrollPos = Math.abs(p.pos);
			switch (c.scroll_type){
				case 'row':
					end = Math.min(p.con, start + c.scroll_size);
					for (i=0; i<rows.length; i++){
						rows[i].toggle(i>=start && i<end);
					}
				return false;
				case 'col':
					// todo: 滚动数量处理
					// console.log(ev);
				return false;
			}
			var divs = self.$subs_div;
			if (divs.length > 0){
				start = (-self.table.css('marginLeft').slice(0,-2) || 0) + 'px';
				for (i=divs.length; i>0;){
					divs[--i].style.marginLeft = start;
				}
			}
			return false;
		},
		updateScroll: function(){
			var self = this;
			var c = self.getConfig();
			switch (c.scroll_type){
				case 'row':
					var pos = self.$scrollPos || 0;
					var dat = self.$data;
					var len = dat && dat.length || 0;
					var end = Math.min(len, pos + c.scroll_size);
					var rows = self.rows;
					for (var i=0; i<rows.length; i++){
						rows[i].toggle(i>=pos && i<end);
					}
					self.$.scroll.setSize(len, c.scroll_size);
					break;
				case 'col':
					//todo: 行列滚动计算滚动数量更新
					break;
				default:
					self.$.scroll.update();
					break;
			}
			return self;
		},
		onContainerShow: function(){
			var self = this;
			self.$.scroll.update();
			if(self.$showloadingDelay){
				self.showLoading();
			}
		},
		/**
		 * 获取指定索引号的行数据
		 * @param  {Number} index 行数据索引编号
		 * @return {Object}       返回行数据对象
		 */
		rowData: function(index){
			var dat = this.$data;
			if (!dat || index < 0 || index >= dat.length){
				return null;
			}
			return dat[index];
		},
		/**
		 * 重设表格数据
		 * @param {Array} data 数据
		 * @param {Number} index <可选> 数据开始索引, 默认为1
		 * @param {Bool} no_hide <可选> 是否隐藏子表格
		 */
		setData: function(data, index, no_hide){
			var self = this;
			var c = self.getConfig();
			self.$data = data;
			self.$set_data_hide = !no_hide;
			c.index = index || 0;

			if (!data || data.length <= 0){
				self.showEmptyRow();
			}else {
				self.hideLoading();
				self.hideEmptyRow();
				self.body.children('tr[data-type="sub"]').attr('data-hide', 1);
				for (var i=0; i<data.length; i++){
					self.updateRow(i, data[i]);
				}
				// 隐藏不需要的行
				while (self.rows[i]){
					self.rows[i++].hide();
				}
				self.body.children('tr[data-hide]').hide();
			}
			self.updateScroll();
			self.updateSelectRow();
			self.$set_data_hide = true;
			return self;
		},
		/**
		 * 设置某行记录数据
		 * @param {Number} index 行索引号
		 * @param {Object} row   行数据对象 / {String} 行属性名称
		 * @param {Mix}    value <可选> 行属性值
		 * @return {Mix} 返回false修改失败, 或者列表记录列表对象表示成功
		 */
		setRow: function(index, row, value){
			var self = this;
			var data = self.$data;
			if (data.length <= index) {
				return false;
			}
			if (util.isObject(row)){
				data[index] = row;
			}else {
				data[index][row] = value;
			}
			self.updateRow(index, data[index]);
			return data;
		},
		/**
		 * 已某项属性值来查找数据行并更新行
		 * @param {Object} row   行数据对象
		 * @param {String} field 要对比的属性名称
		 */
		setRowByField: function(row, field){
			var self = this;
			var key = row[field];
			var index = self.findIndex(key, field);
			if (index === null){ return false; }
			self.$data[index] = row;
			return self.updateRow(index, row);
		},
		/**
		 * 重设指定行的数据显示
		 * @param {Number} index 数据行索引号
		 * @param {Object} data  行数据对象
		 * @return {jQuery} 返回jQuery行对象
		 */
		updateRow: function(index, data){
			var self = this;
			var row;
			if (index >= self.rows.length){
				// 没有找到记录, 新建一行
				row = self.buildRow(index, data);
			}else {
				row = self.rows[index];
				row.css('display', '');

				var cols = self.cols;
				var tds = row.children();

				var env = {
					'id': index,
					'dat': data,
					'sub': true,
					"func": true
				};

				// 生成单元格
				for (var i=0; i<cols.length; i++){
					self.buildCell(tds.eq(i), cols[i], env,row);
				}
			}

			// 同步子表格的位置
			var c = self.getConfig();
			var id = (c.key && data[c.key]);
			var subrow, old_sub, row_id = id;
			while (self.subCtr && id !== undefined){
				subrow = row.next();
				if (subrow.attr('data-type') !== 'sub' || subrow.attr('data-id') != id){
					subrow = self.body.children('tr[data-type="sub"][data-id="'+id+'"]');
					if (subrow.length <= 0){ break; }

					old_sub = row.next();
					id = +subrow.attr('data-idx');
					if (old_sub.attr('data-type') === 'sub'){
						old_sub.insertBefore(subrow).attr('data-idx', id);
					}
					subrow.attr('data-idx', index).removeAttr('data-hide').insertAfter(row);
					self.fire('switchSubGrid', {'from': id, 'to': index});
				}

				// 更新同步图标状态
				subrow.removeAttr('data-hide');
				if (subrow.css('display') !== 'none'){
					id = row.find(subGridConSelector+'>div:first');
					c = subrow.attr('data-sub');
					id.attr('data-sub', c).attr('class', 'act ' + subGridPrefix + c);
				}
				break;
			}

			// 判断是否要添加高亮效果
			self._addRowHighlight(row, row_id);

			// for debug
			row.attr('debug-id', row_id);
			return row;
		},
		getData: function(){
			return this.$data;
		},
		/**
		 * 删除记录行
		 * @param  {[type]} index [description]
		 * @return {[type]}       [description]
		 */
		removeRow: function(index){
			var self = this;
			var rs = self.rows;
			if (index >= rs.length){
				return false;
			}
			// 移除数据
			var c = self.getConfig();
			var data = self.$data;
			data.splice(index, 1);

			// 把行记录移动到最后
			var tr = rs.splice(index, 1)[0];
			var sub = tr.next();
			rs.push(tr);
			tr.appendTo(self.body).hide();
			if (sub.attr('data-type') == 'sub'){
				sub.appendTo(self.body).hide();
			}

			// 修正data-index 和 间隔类
			var i, col;
			var cols = '', id = c.index + index;
			for (i=0; i<self.cols.length; i++){
				col = self.cols[i];
				if (col.type != 'id') {continue;}
				cols += ',:eq(' + i + ')';
			}
			cols = (cols === '' ? null : cols.substr(1));
			for (i=index; i<rs.length; i++){
				rs[i].attr('data-index', i).toggleClass('alt', i % 2);
				if (cols){
					rs[i].children(cols).text(++id);
				}
			}
			self.updateSelectRow();
			if(data.length===0){
				self.showEmptyRow();
			}
			return data;
		},
		/**
		 * 删除指定属性值的行
		 * @param  {Mix}    value 要查找的属性值
		 * @param  {String} field <可选> 要查找的属性名称
		 * @return {Boolean}      返回删除是否成功
		 */
		removeRowByValue: function(value, field){
			var self = this;
			var index = self.findIndex(value, field);
			if (index === null){ return false; }
			return self.removeRow(index);
		},
		/**
		 * 增加一行数据
		 * @param {Object} row 行数据对象
		 */
		addRow: function(row){
			var self = this;
			self.hideEmptyRow();
			if (self.$data){
				self.$data.push(row);
			}else {
				self.$data = [row];
			}
			var id = self.$data.length - 1;
			self.updateRow(id, row);
			self.updateSelectRow();
			return id;
		},
		/**
		 * 查找指定行的Index值
		 * @param  {Mix}    value 要查找的属性值
		 * @param  {String} field <可选> 要查找的属性名称
		 * @return {Number}       返回找到的行索引号 或 NULL表示没有找到
		 */
		findIndex: function(value, field){
			if (!field){ field = '_id'; }
			return util.each(this.$data, function(row){
				if (row[field] == value){ return false; }
			});
		},
		/**
		 * 显示、隐藏指定列
		 * @param  {String} name 列的名字
		 * @param  {Boolean} show 显示还是隐藏
		 */
		toggleColumn: function(name, show){
			var self = this;
			// 获取指定列的索引号
			var index = util.index(self.cols,name,"name");
			if (index === null){ return self; }

			var isShow = show ? "":"none";
			self.cols[index].forceHide = !show;

			// 更新标题列
			self.head.find('>tr>th').eq(index)[0].style.display = isShow;

			// 更新每一行
			index = ':eq('+index+')';
			var rows = self.body.children('tr[data-type=row]');
			var td;
			for (var j=0; j<rows.length; j++){
				td = rows.eq(j).children(index)[0];
				td.style.display = isShow;
			}
			return self;
		},
		/**
		 * 设置要显示那些列
		 * @param  {Array} columns 要显示的列名称数组
		 * @return {None}         无返回
		 */
		showColumn: function(columns){
			var self = this;
			if (!columns){
				// 全显示
				self.head.find('>tr>th').css('display', '');
				self.body.find('>tr>td').css('display', '');
				self.updateScroll();
				return self;
			}

			var sets = [];
			var cols = self.cols;
			var col;
			for (var i=0; i<cols.length; i++){
				col = cols[i];
				if (col.forceHide){
					sets[i] = 'none';
					continue;
				}
				switch (col.type){
					case 'id':
					case 'index':
					case 'fixed':
					case "control":
					case 'select':
					case 'op':
						sets[i] = '';
					break;
					default:
						col.hide = (columns.indexOf(col.name) == -1);
						sets[i] = col.hide ? 'none' : '';
					break;
				}
			}

			// 计算需要交换顺序的操作
			var sorts = _gen_sort(cols, columns);

			// 更新表头
			var tds = self.head.find('>tr>th');
			for (i=0; i<tds.length; i++){
				tds[i].style.display = sets[i];
			}
			// 排列Element
			_do_sort_element(sorts, tds, 'data-col');

			// 更新列表记录
			var rows = self.body.children('tr[data-type=row]');
			var row;
			for (var j=0; j<rows.length; j++){
				row = rows.eq(j);
				tds = row.children();
				for (i=0; i<tds.length; i++){
					tds[i].style.display = sets[i];
				}
				// 排列Element
				_do_sort_element(sorts, tds);
			}
			self.updateScroll();
			return self;
		},
		/**
		 * 更新指定列数配置
		 * @param  {Number} index 列配置索引号
		 * @param  {Object} col   列配置对象
		 * @return {Boolean}      操作结果
		 */
		updateColumn: function(index, col){
			var self = this;
			var cols = self.cols;
			if (!cols[index]){
				pubjs.error('Miss Column Config');
				return false;
			}
			cols[index] = self.formatCol(col);

			// 处理选择事件
			var lastSelect = self.$hasSelect;
			self.$hasSelect = false;
			for (var i=0; i<cols.length; i++){
				if (cols[i].type === 'select'){
					self.$hasSelect = true;
					break;
				}
			}
			if (lastSelect != self.hasSelect){
				if (lastSelect){
					self.body.unbind('change', self.eventSelectChange);
				}else {
					self.uiProxy(self.body, 'input[data-select]', 'change', 'eventSelectChange');
				}
			}

			// 修改Head的单元
			var cell = self.head.find('th[data-col='+index+']');
			if (cell.length){
				cell.unbind('click.tableHeadOp').empty();
				self.buildHeadCell(cell, cols[index]);
			}

			// 更新列表单元
			self.updateColumnByIndex(index);
			return true;
		},
		/**
		 * 跟新指定索引的列数据
		 * @param  {String} type 类型字符串
		 * @return {None}      无返回
		 */
		updateColumnByIndex: function(index){
			var self = this;
			var data = self.$data;
			var rows = self.rows;
			var col = self.cols[index];
			var td;

			if (!col){ return false; }

			for (var i=0; i<rows.length && i<data.length; i++){
				td = rows[i].children().eq(index);
				self.buildCell(td, col, {
					'id': i,
					'dat': data[i],
					'sub': true
				});
			}
			self.updateScroll();
		},
		/**
		 * 更新指定名称的列
		 * @param  {String} name 要更新的列名称
		 * @return {Module}      返回当前模块实例
		 */
		updateColumnByName: function(name){
			var self = this;
			var index = util.index(self.cols, name, 'name');
			if (index !== null){
				self.updateColumnByIndex(index);
			}
			return self;
		},
		/**
		 * 跟新指定类型的列数据
		 * @param  {String} type 类型字符串
		 * @return {None}      无返回
		 */
		updateColumnType: function(type){
			var self = this;
			var data = self.$data;
			var cols = self.cols;
			var env, col, tds;

			for (var i=0; i<self.rows.length && i<data.length; i++){
				tds = self.rows[i].children();
				env = {
					'id': i,
					'dat': data[i],
					'sub': true,
					'func': true
				};

				// 生成单元格
				for (var c=0; c<cols.length; c++){
					col = cols[c];
					if (col.type != type){
						continue;
					}
					self.buildCell(tds.eq(c), col, env);
				}
			}
			self.updateScroll();
			return self;
		},
		/**
		 * 切换行选中效果
		 * @param {Number} id    选中的数据id
		 * @param {String} selectedClass   选中的class名称
		 */
		setRowHighlight: function(id, selectedClass) {
			var self = this;
			if (id) {
				self.setSelectedRowHighlight(id, selectedClass);
				if (util.index(self.$highlightIds, id) === null) {
					self.$highlightIds.push(id);
				}
			}
			return self;
		},
		/**
		 * 设置有选择框的选中行选中效果
		 * @param {Number} id    选中的数据id
		 * @param {String} selectedClass   选中的class名称
		 */
		setSelectedRowHighlight: function(id, selectedClass) {
			var self = this;
			if (id) {
				var index = self.findIndex(id);
				var	row = self.rows[index];
				if (row) {
					row.addClass(selectedClass || self.getConfig('highlightClassName'));
				}
			}
			return self;
		},
		/**
		 * 取消行选中效果
		 * @param {Number} id    选中的数据id
		 * @param {String} selectedClass   选中的class名称
		 */
		unsetRowHighlight: function(id, selectedClass) {
			var self = this;
			if (id) {
				self.unsetSelectedRowHighlight(id, selectedClass);
				util.remove(self.$highlightIds, id);
			}
			return self;
		},
		/**
		 * 取消有选择框的选中行选中效果
		 * @param {Number} id    选中的数据id
		 * @param {String} selectedClass   选中的class名称
		 */
		unsetSelectedRowHighlight: function(id, selectedClass) {
			var self = this;
			if (id) {
				var index = self.findIndex(id);
				var	row = self.rows[index];
				if (row) {
					row.removeClass(selectedClass || self.getConfig('highlightClassName'));
				}
			}
			return self;
		},
		/**
		 * 去除行选中效果
		 * @return {Undefined}    无
		 */
		resetRowHighlight: function() {
			var self = this;
			var cn = self.getConfig('highlightClassName');
			self.body.find('.'+cn).removeClass(cn);
			self.$highlightIds = [];
			return self;
		},
		/**
		 * 判断是否要添加高亮效果
		 * @param {Object} row 行对象
		 * @param {Number} id  数据id
		 */
		_addRowHighlight: function(row, id) {
			if (!row) {
				return false;
			}
			var self = this;
			var cls = self.getConfig('highlightClassName');
			if (self.$highlightIds.length && util.index(self.$highlightIds, id) !== null) {
				row.addClass(cls);
			} else {
				row.removeClass(cls);
			}
		},
		/**
		 * 收起子表格事件回调函数
		 */
		eventClickCollapse: function(evt, elm){
			var row = $(elm).closest('tr').hide();
			row.prev().find(subGridConSelector+' > div.act').removeClass('act');
			return false;
		},
		showSubRow: function(index, collapse){
			var self = this;
			var row = self.rows[index];
			if (!row){ return false; }

			var div, sub = row.next();
			if (sub.attr('data-type') !== 'sub'){
				var cols = row.children().length;
				sub = $('<tr class="'+self.getConfig('subClass')+'" data-type="sub"/>').insertAfter(row);
				sub.append('<td colspan="'+cols+'"><div class="con"><div class="subgrid clearMargin" /></div><div class="bg" /></td>');
				div = sub.find('div.subgrid:first');
				div.before('<em class="arrow" /><em class="collapse">'+LANG("收起")+'</em>');
				row = div.parent();
				self.$subs_div.push(row[0]);
				// 绑定收起事件
				self.uiBind(row.find('.collapse'), 'click', 'eventClickCollapse');
			}else {
				sub.css('display', '');
				div = sub.find('div.subgrid:first');
				row = div.parent();
			}
			var pos = -self.table.css('marginLeft').slice(0,-2) || 0;
			row.toggleClass('show_collapse', !!collapse).css('marginLeft', pos);
			div.width(self.getDOM().width() - 20);

			return {row: sub, div: div};
		},
		hideSubRow: function(index){
			var row = this.rows[index];
			if (row){
				var sub = row.next();
				if (sub.attr('data-type') === 'sub'){
					sub.hide();
					return sub;
				}
			}
			return false;
		},
		toggleSubRow: function(index){
			var row = this.rows[index];
			if (row){
				var sub = row.next();
				if (sub.attr('data-type') === 'sub'){
					if (sub.css('display') === 'none'){
						sub.css('display', '');
						return true; // 显示
					}else {
						sub.hide();
						return false;
					}
				}
			}
			return null;
		},
		/**
		 * 获取指定索引或指定数值的行对象
		 * @param  {Mix}    val   行索引或值
		 * @param  {String} field 数据键
		 * @return {Object}       行对象或null
		 */
		getRow:function(val,field){
			var self = this;
			if(field){
				val = self.findIndex(val,field);
			}
			return self.rows[val] || null;
		},
		// 操作菜单点击事件
		eventClickMenu: function(ev, dom){
			this.fire('clickMenu', dom);
			return false;
		}
	});
	exports.list = List;



	/**
	 * 获取某路径上的某个属性值
	 * @param  {DOM} elm  开始获取的DOM对象
	 * @param  {String} name 要获取的属性名称
	 * @param  {DOM} end  <可选> 直到结束的DOM对象
	 * @return {String}      返回获取到的属性字符串值或者NULL
	 */
	function _closetAttr(elm, name, end){
		if (!end) {end = document.body;}
		var val;
		while (elm != end){
			val = elm.getAttribute(name);
			if (val !== null){
				return val;
			}
			elm = elm.parentElement;
		}
		return null;
	}

	/**
	 * 检测列配置
	 * @param  {Array} re  自定义列
	 * @param  {Array} def 默认列定义
	 * @return {Array}     合并完的列
	 * @private
	 */
	function _mergeCols(re,def){
		var first = re.shift();
		switch (first){
			case null: // 排除
				var ret = [];
				util.each(def, function(col){
					if (util.index(re, col) === null){
						ret.push(col);
					}
				});
				return ret;
			case true: // 替换
				return re;
			case false: // 末尾合并
				re.unshift.apply(re, def);
				return util.unique(re,false,true);
			default: // 默认前端合并
				if (first){
					re.unshift(first);
				}
				re = re.concat(def);
				return util.unique(re);
		}
	}

	/**
	 * 格式化列回调函数值(把字符串转换为对应的回调函数变量)
	 * @param  {Module} ctx  回调对象实例
	 * @param  {Object} col  列配置对象
	 * @param  {String} name 回调参数属性名称
	 * @return {Boolean}     返回处理状态
	 */
	function _prepare_col_callback(ctx, col, name){
		var cb = col[name];
		var scope = col.context;
		if (cb && util.isString(cb)){
			while (1){
				// 指定作用域查找
				if (scope && scope[cb]){ break; }
				// 查找父层
				scope = ctx;
				while (scope !== pubjs.core){
					scope = scope.parent();
					if (scope[cb]){ break; }
				}
				if (scope !== pubjs.core){ break; }
				// 寻找自己本身
				scope = ctx;
				if (scope[cb]){ break; }
				// 寻找labels
				scope = format;
				if (scope[cb]){ break; }
				scope = labels;
				if (scope[cb]){ break; }
				// 没有找到
				col[name] = null;
				return false;
			}
			// 保存作用域和结果
			col[name] = scope[cb];
		}else if (!util.isFunc(cb)){
			return false;
		}
		col[name+'_ctx'] = scope;
		return true;
	}

	/**
	 * 计算需要交换顺序的列操作顺序
	 * @param  {Array} cols    列配置列表
	 * @param  {Array} columns 显示顺序配置列表
	 * @return {Array}         返回交换操作列表
	 */
	function _gen_sort(cols, columns){
		var order = [], ops = [];
		var i,s,e,m;
		for (i=0; i<columns.length; i++){
			order.push(util.index(cols, columns[i], 'name'));
		}
		for (s=0; s<i; s++){
			if (order[s] === null){ continue; }
			m = s;
			for (e=s+1; e<i; e++){
				if (order[e] === null){ continue; }
				if (order[e] < order[m]){ m = e; }
			}
			if (m !== s){
				// 交互位置
				ops.push([order[m], order[s]]);
				e = order[s];
				order[s] = order[m];
				order[m] = e;
			}
		}

		for (i=0; i<ops.length; i++){
			s = ops[i];
			m = cols.splice(s[1], 1);
			e = cols.splice(s[0], 1, m[0]);
			cols.splice(s[1], 0, e[0]);
		}
		return ops;
	}

	/**
	 * 修改元素的顺序
	 * @param  {Array}  ops   排序操作记录列表
	 * @param  {Array}  elems 待排序元素列表
	 * @param  {String} attrs 需同步元素属性(用逗号分隔多个属性)
	 * @return {None}
	 */
	function _do_sort_element(ops, elems, attrs){
		var i, s, e1, e2, pe, ns, av;
		if (attrs){ attrs = attrs.split(','); }
		for (i=0; i<ops.length; i++){
			s = ops[i];
			e1 = elems[s[0]];
			e2 = elems[s[1]];
			if (!e1 || !e2){ continue; }
			elems[s[0]] = e2;
			elems[s[1]] = e1;

			// 交换位置
			pe = e2.parentNode;
			ns = (pe.lastChild === e2) ? null : e2.nextSibling;
			e1.parentNode.insertBefore(e2, e1);
			if (ns){
				pe.insertBefore(e1, ns);
			}else {
				pe.appendChild(e1);
			}

			// 交换属性
			if (attrs){
				for (s=attrs.length; s>0;){
					ns = attrs[--s];
					pe = e1.getAttribute(ns);
					av = e2.getAttribute(ns);
					if (pe === null){
						e2.removeAttribute(ns);
					}else {
						e2.setAttribute(ns, pe);
					}
					if (av === null){
						e1.removeAttribute(ns);
					}else {
						e1.setAttribute(ns, av);
					}
				}
			}
		}
	}

});