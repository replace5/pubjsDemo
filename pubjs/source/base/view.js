define(function(require,exports) {
	var $ = require('jquery');
	var pubjs = require('../core/pub.js');
	var util = require('../core/util.js');
	var argToArray = Array.prototype.slice;

	/**
	 * jQuery类库实例对象
	 */
	exports.jquery = $;

	function fixArgsDom(args, el){
		args = argToArray.call(args);
		if (util.isString(args[0])){
			args.unshift(el);
		}
		return args;
	}

	function _buildFromTemplate(module_config, callback, param){
		var self = this,
			doms = this.getDOM();

		doms.find("[pub-mod]").each(function(index){
			var el = $(this);
			var mod = el.attr('pub-mod');
			var name = el.attr('pub-name');
			var config = el.attr('pub-config');
			var mod_name = null;

			// 获取模块配置
			if (config){
				try {
					config = JSON.parse(config);
				}catch(e){
					config = null;
				}
			}
			// 有模块名称, 判断模块是否存在
			if (name){
				mod_name = name.replace(/\//g, '_');
				if (self.get(mod_name)){
					return;
				}
				// 读取模块配置
				if (!config && module_config){
					config = util.clone(util.prop(module_config, name));
				}
			}
			// 修正创建容器对象参数
			if (!config){
				config = {target: el};
			}else if (!config.target){
				config.target = el;
			}
			// 创建模块
			self.createDelay(mod_name, mod, config);
		});
		self.createDelay(true, callback || "afterBuildTemplate", param);
	}

	/**
	 * 容器视图类
	 */
	var Container = pubjs.Module.extend({
		init: function(config, parent){
			var self = this;
			self.$config = pubjs.conf(config, {
				// 容器元素 (可指定容器的DOM元素而不创建)
				'el': null,
				// 容器标签
				'tag': 'div',
				// 容器插入目标DOM对象
				'target': parent,
				// 容器文字内容
				'text': null,
				// 容器HTML内容 (HTML内容如果设置, 将覆盖文字内容)
				'html': null,
				// 对象CSS类
				'class': null,
				// 容器属性对象, 调用jQuery的attr方法直接设置
				'attr': null,
				// 容器Style属性对象, 调用jQuery的css方法直接设置
				'css': null
			});
			self.$el = null;

			// 创建回调函数
			self.cbAfterShow = self.cbAfterShow.bind(self);
			self.cbAfterHide = self.cbAfterHide.bind(self);

			self.$ready = 0;
			// 构建元素
			self.build();
		},
		getConfig: function(name){
			return this.$config.get(name);
		},
		setConfig: function(name, value){
			this.$config.set(name, value);
			return this;
		},
		/**
		 * 合并扩展配置对象
		 * @param  {String} uri  <可选> 节点URI
		 * @param  {Object} data 新合并对象值
		 * @param  ...
		 * @param  {Number} deep <可选> 合并深度
		 * @return {Module}      返回模块本身
		 */
		extendConfig: function(){
			var config = this.$config;
			config.extend.apply(config, arguments);
			return this;
		},
		build: function(noAfterBuild){
			var self = this;
			if (self.$ready){ return self; }
			self.$ready = 1;

			var c = this.getConfig();
			var el = c.el;
			if (!el){
				if (c.tag === 'body'){
					el = $('body:first');
				}else {
					el = $('<'+c.tag+'/>');
				}
			}
			// 设置初始属性
			if (c.attr){
				el.attr(c.attr);
			}
			if (c.css){
				el.css(c.css);
			}
			var cls = c['class'];
			if (cls){
				el.addClass(
					util.isArray(cls) ? cls.join(' ') : cls
				);
			}
			if (c.html){
				el.html(c.html);
			}else if (c.text){
				el.text(c.text);
			}
			// 保存元素
			self.$el = el;
			// 插入元素到目标容器
			if (!c.el && el && c.tag !== 'body' && c.target){
				self.appendTo(c.target);
			}

			// 调用后续构建函数
			if (!noAfterBuild && util.isFunc(self.afterBuild)){
				self.afterBuild();
			}

			// 使用mvvm，扫描绑定dom
			if (pubjs.MVVM ) {
				if ( c.view_model ) {
					this.$vm = pubjs.MVVM.define(this._.uri, function(vm){
						for (var i in c.view_model){
							if (c.view_model.hasOwnProperty(i)){
								vm[i] = c.view_model[i];
							}
						}
					});
					self.$el.attr('ms-controller', self._.uri);
					//pubjs.MVVM.scan(self.$el[0]);
				}

				$('body').attr('ms-controller', pubjs.MVVM.grobalVMDefineName ); //是否有更好的地方改body属性？
				//pubjs.MVVM.scan(self.$el[0], pubjs.GrobalVM);

				pubjs.MVVM.scan(); //上面分开扫描有点问题，先全部扫描
			}

			return self;
		},
		uiBind: function(){
			return this.Super('uiBind', fixArgsDom(arguments, this.$el));
		},
		uiUnbind: function(){
			return this.Super('uiUnbind', fixArgsDom(arguments, this.$el));
		},
		uiProxy: function(){
			return this.Super('uiProxy', fixArgsDom(arguments, this.$el));
		},
		uiUnproxy: function(){
			return this.Super('uiUnproxy', fixArgsDom(arguments, this.$el));
		},
		find: function(){
			var el = this.$el;
			if (el){
				return el.find.apply(el, arguments);
			}
			return null;
		},
		html: function(){
			var el = this.$el;
			if (el){
				el.html.apply(el, arguments);
			}
			return this;
		},
		css: function(){
			var el = this.$el;
			if (el){
				el.css.apply(el, arguments);
			}
			return this;
		},
		attr: function(){
			var el = this.$el;
			if (el){
				el.attr.apply(el, arguments);
			}
			return this;
		},
		addClass: function(){
			var el = this.$el;
			if (el){
				el.addClass.apply(el, arguments);
			}
			return this;
		},
		removeClass: function(){
			var el = this.$el;
			if (el){
				el.removeClass.apply(el, arguments);
			}
			return this;
		},
		toggleClass: function(){
			var el = this.$el;
			if (el){
				el.toggleClass.apply(el, arguments);
			}
			return this;
		},
		append: function(){
			var el = this.$el;
			if (el){
				el.append.apply(el, arguments);
			}
			return this;
		},
		/**
		 * 把当前容器插入到指定的容器中
		 * @param  {Object} target 容器实例或者jQuery对象实例
		 * @return {Object}        Container实例
		 */
		appendTo: function(target){
			if (target){
				if (util.isString(target)){
					this.$el.appendTo(target);
				}else {
					this.$el.appendTo(target.jquery ? target : target.getDOM());
				}
			}
			return this;
		},
		/**
		 * 获取容器的主要DOM对象
		 * @return {Element} 返回jQuery的对象
		 */
		getDOM: function(){
			return this.$el;
		},
		getContainer: function(){
			return this.$el;
		},
		/**
		 * 显示容器
		 * @param  {Mix}      config   jQuery show方法的动画配置值
		 * @return {Object}            Container实例
		 */
		show: function(config){
			this.$el.stop(true, true)
				.show(config, this.cbAfterShow);

			if (config === undefined){
				this.cbAfterShow();
			}
			return this;
		},
		cbAfterShow: function(){
			if (this.afterShow){
				this.afterShow();
			}
			this.cast('containerShow');
		},
		/**
		 * 隐藏容器
		 * @param  {Mix}      config   jQuery hide方法的动画配置值
		 * @return {Object}            Container实例
		 */
		hide: function(config){
			this.$el.stop(true, true)
				.hide(config, this.cbAfterHide);

			if (config === undefined){
				this.cbAfterHide();
			}
			return this;
		},
		cbAfterHide: function(){
			if (this.afterHide){
				this.afterHide();
			}
			this.cast('containerHide');
		},
		/**
		 * 删除容器
		 * @param  {Boolean} doom 是否彻底销毁
		 * @return {Object}       Container实例
		 */
		remove: function(doom){
			if (this.$el){
				this.$el.remove();
				if(doom){
					this.$el = null;
				}
			}
			return this;
		},
		/**
		 * 框架销毁函数的回调函数
		 * @return {Undefined} 无返回值
		 */
		afterDestroy:function(){
			this.remove(true);
		},
		/**
		 * 销毁函数
		 * @return {Undefined} 无返回值
		 */
		destroy:function(){
			util.each(this.$doms, this.cbRemoveDoms);
			var el = this.$el;
			this.Super("destroy");
			if(el){
				el.find("*").unbind();
				el.remove();
			}
			this.$doms = this.$el = null;
		},
		/**
		 * 删除doms元素循环回调函数
		 * @param  {Element} dom jQuery元素对象
		 * @return {None}
		 */
		cbRemoveDoms: function(dom){
			if (dom.jquery){
				dom.remove();
			}
		},
		/**
		 * 从模版创建
		 * @param  {Object} pubConfig 配置
		 */
		buildFromTemplate: _buildFromTemplate
	});
	exports.container = Container;

	// Widget代理公共函数
	function _uiBindProxy(method, args, Super){
		var self = this;
		args = argToArray.call(args);
		if (self.$el){
			if (util.isString(args[0])){
				args.unshift(self.$el.getDOM());
			}
			Super.call(self, method, args);
		}else {
			self.$uiCalls.push({
				fn: _uiBindProxy,
				args: [method, args, Super]
			});
		}
		return self;
	}
	function _uiFunction(method, args){
		var ui = this.$el;
		if (ui){
			if (ui[method]){
				ui[method].apply(ui, args);
			}
		}else {
			this.$uiCalls.push({
				fn: _uiFunction,
				args: [method, argToArray.call(args)]
			});
		}
		return this;
	}
	// 功能模块类
	var Widget = pubjs.Module.extend({
		init: function(config, parent){
			var self = this;
			self.$config = pubjs.conf(config, {
				'layout': {
					'module': Container
				}
			});
			self.$el = null;
			self.$uiCalls = [];
			self.$ready = false;

			self.build();
		},
		getConfig: function(name){
			return this.$config.get(name);
		},
		setConfig: function(name, value){
			this.$config.set(name, value);
			return this;
		},
		/**
		 * 合并扩展配置对象
		 * @param  {String} uri  <可选> 节点URI
		 * @param  {Object} data 新合并对象值
		 * @param  ...
		 * @param  {Number} deep <可选> 合并深度
		 * @return {Module}      返回模块本身
		 */
		extendConfig: function(){
			var config = this.$config;
			config.extend.apply(config, arguments);
			return this;
		},
		build: function(){
			var self = this;
			if (self.$ready){ return self; }
			var c = self.getConfig();
			self.$ready = 'building';

			// 构建视图界面
			var module = c.layout && c.layout.module;
			if (module && c.target && !c.layout.target){
				c.layout.target = c.target;
			}
			if (util.isString(module)){
				// 异步加载模块
				self.createAsync('WIDGET_UI', module, c.layout, self.setLayout);
			}else if (module){
				// 实例模块创建
				c.layout.module = null;
				module = self.create('WIDGET_UI', module, c.layout);
				self.setLayout(module);
			}else if(self.afterBuild){
				self.afterBuild();
			}
		},
		setLayout: function(layout){
			var self = this;
			var c = self.getConfig();
			self.$el = layout;
			self.$ready = 'ready';
			if (self.afterBuild){
				self.afterBuild(layout);
			}

			// 调用被延迟的UI调用函数
			var param, cs = self.$uiCalls;
			while (cs.length){
				param = cs.shift();
				param.fn.apply(self, param.args);
			}
			// 使用mvvm，扫描绑定dom
			if (pubjs.MVVM ) {
				if ( c.view_model ) {
					this.$vm = pubjs.MVVM.define(this._.uri, function(vm){
						for (var i in c.view_model){
							if (c.view_model.hasOwnProperty(i)){
								vm[i] = c.view_model[i];
							}
						}
					});
					self.$el.attr('ms-controller', self._.uri);
					//pubjs.MVVM.scan(self.$el[0]);
				}

				$('body').attr('ms-controller', pubjs.MVVM.grobalVMDefineName ); //是否有更好的地方改body属性？
				//pubjs.MVVM.scan(self.$el[0], pubjs.GrobalVM);

				pubjs.MVVM.scan(); //上面分开扫描有点问题，先全部扫描
			}
		},
		getLayout: function(){
			return this.$el;
		},
		uiBind: function(){
			return _uiBindProxy.call(this, 'uiBind', arguments, this.Super);
		},
		uiUnbind: function(){
			return _uiBindProxy.call(this, 'uiUnbind', arguments, this.Super);
		},
		uiProxy: function(){
			return _uiBindProxy.call(this, 'uiProxy', arguments, this.Super);
		},
		uiUnproxy: function(){
			return _uiBindProxy.call(this, 'uiUnproxy', arguments, this.Super);
		},
		find: function(){
			var el = this.$el.getDOM();
			return (el ? el.find.apply(el, arguments) : null);
		},
		getDOM: function(){
			var el = this.$el;
			return (el ? el.getDOM.apply(el, arguments) : null);
		},
		getContainer: function(){
			var el = this.$el;
			return (el ? el.getContainer.apply(el, arguments) : null);
		},
		html: function(){
			return _uiFunction.call(this, 'html', arguments);
		},
		css: function(){
			return _uiFunction.call(this, 'css', arguments);
		},
		attr: function(){
			return _uiFunction.call(this, 'attr', arguments);
		},
		addClass: function(){
			return _uiFunction.call(this, 'addClass', arguments);
		},
		removeClass: function(){
			return _uiFunction.call(this, 'removeClass', arguments);
		},
		toggleClass: function(){
			return _uiFunction.call(this, 'toggleClass', arguments);
		},
		append: function(){
			return _uiFunction.call(this, 'append', arguments);
		},
		appendTo: function(target){
			var el = target && target.$el;
			if (el && el.jquery){target = el;}
			return _uiFunction.call(this, 'appendTo', arguments);
		},
		show: function(){
			return _uiFunction.call(this, 'show', arguments);
		},
		hide: function(){
			return _uiFunction.call(this, 'hide', arguments);
		},
		/**
		 * 从模版创建
		 * @param  {Object} pubConfig 配置
		 */
		buildFromTemplate: _buildFromTemplate
	});
	exports.widget = Widget;


	// 矩阵布局
	var LayoutGrid = Container.extend({
		init: function(config, parent){
			config = pubjs.conf(config, {
				'default_name': '',
				'type': 'grid',
				'padding': null, // 单元个间距和默认行间距
				'row_padding': null, // 定义行间距
				// 布局定义参数, 字符串或数组, 为数组时创建对应多列
				// 竖线(|)间隔多个单元格, 单元格定义格式如下
				// name(#IdName)(.ClassName)(width)
				'rows': null,
				'texts': null
			});

			var self = this;
			var c = config.get();
			self.$row_padding = (c.row_padding === null ? c.padding : c.row_padding);
			self.$padding = c.padding;
			self.$rows = [];
			self.$cols = {};
			self.Super('init', arguments);
		},
		build: function(){
			var self = this;
			if (!self.$ready){
				self.Super('build', [true]);
				var c = self.getConfig();

				// 添加默认布局控制分类
				self.addClass('layout-' + c.type);

				// 构建行列布局
				var rows = c.rows;
				if (rows){
					if (util.isString(rows)){
						rows = [rows];
					}
					// 创建行
					for (var i=0; i<rows.length; i++){
						if (rows[i]){
							self.addRow(-1, rows[i]);
						}
					}
				}

				// 调用后续构建
				if (util.isFunc(self.afterBuild)){
					self.afterBuild();
				}
			}
			return self;
		},
		buildRow: function(){
			var self = this;
			var row = $('<div class="layout-row" />');
			if (self.$row_padding !== null){
				row.css('padding-top', self.$row_padding);
			}
			if (self.$padding !== null){
				row.css('margin-left', -self.$padding);
			}
			return row;
		},
		buildCol: function(config){
			var self = this;
			var cs = config.split(/[\(\)]+/);
			var name = cs.shift();
			if (name){
				var col = $('<div />');
				col.attr('data-name', name);
				if (self.$padding !== null){
					col.css('padding-left', self.$padding);
				}
				self.$cols[name] = col;

				// 检查是否有附加属性
				var attr;
				var cls = ['layout-col'];
				while (cs.length){
					attr = cs.shift();
					if (attr){
						switch (attr.charAt(0)){
							case '.': // 点开头表示是CSS类
								cls.push(attr.substr(1));
								break;
							case '#': // 井号开头表示是ID
								col.attr('id', attr.substr(1));
								break;
							case '*': // 特定的layout类型
								attr = attr.substr(1).split(' ');
								cls.push('layout-col-' + attr.join(' layout-col-'));
								break;
							case '%': // 指定文字对象
								attr = attr.substr(1);
								attr = self.getConfig('texts/' + attr) || LANG(attr);
								if (attr){
									col.text(attr);
								}
								break;
							default: // 其他表示是宽度, 以后会扩展(todo)
								col.width(attr);
								break;
						}
					}
				}
				col.attr('class', cls.join(' '));
				return col;
			}else {
				return null;
			}
		},
		/**
		 * 新建一行
		 * @param  {Number} index 新建行插入到的行索引, 0表示第一行, -1表示最后一行
		 * @param  {String} cells <可选> 新建行的单元格定义字符串, 自动生成对应的单元格
		 * @return {Module}       返回当前模块对象
		 */
		addRow: function(index, cells){
			var self = this;
			var rows = self.$rows;

			var row = self.buildRow();
			if (index == -1 || index >= rows.length){
				index = rows.length;
				self.append(row);
				rows.push(row);
			}else {
				row.insertBefore(rows[index]);
				rows.splice(index, 0, row);
			}

			for (var i=index; i<rows.length; i++){
				rows[i].attr('row-index', i);
			}

			if (cells){
				var cols = cells.split('|');
				while (cols.length){
					self.addCol(index, cols.shift());
				}
			}
			return self;
		},
		removeRow: function(index){
			index = +index;
			var rows = this.$rows;
			var row = rows[index];
			if (row){
				row.remove();
				rows.splice(index, 1);

				for (; index<rows.length; index++){
					rows[index].attr('row-index', index);
				}
			}
			return this;
		},
		/**
		 * 添加一个新的单元格到某行
		 * @param  {Number} index 行索引号, 0开始的数字
		 * @param  {String} cell  新建的单元格定义字符串
		 * @return {Module}       返回当前模块对象
		 */
		addCol: function(index, cell){
			var self = this;
			var col = self.buildCol(cell);
			if (col){
				// 检查要插入的行是否存在, 不存在就创建一行
				var rows = self.$rows;
				var row = rows[index];
				if (!row){
					row = self.buildRow();
					rows.push(row);
					self.append(row);
				}

				row.append(col);
			}
			return self;
		},
		removeCol: function(name){
			var col = this.$cols[name];
			if (col && col.attr('data-name') == name){
				var row = col.parent();
				col.remove();
				if (!row.children().size()){
					// 列已没有任何子元素, 删除列
					this.removeRow(row.attr('row-index'));
				}
			}
			return this;
		},
		/**
		 * 在某个单元格后插入新的单元格
		 * @param  {String} name 要定位的单元格名称
		 * @param  {String} cell 要插入的单元格定义字符串
		 * @return {Module}      返回当前模块对象
		 */
		insertAfter: function(name, cell){
			var self = this;
			var col = self.buildCol(cell);
			if (col){
				var target = name && self.$cols[name];
				if (target){
					// 目标存在, 插入到目标前的位置
					col.insertAfter(target);
				}else {
					// 目标不存在, 插入到最后一列的最后端
					var len = self.$rows.length - 1;
					if (len < 0){
						target = self.buildRow();
						self.$rows.push(target);
						self.append(target);
					}else {
						target = self.$rows[len];
					}
					target.append(col);
				}
			}
			return self;
		},
		/**
		 * 在某个单元格前插入新的单元格
		 * @param  {String} name 要定位的单元格名称
		 * @param  {String} cell 要插入的单元格定义字符串
		 * @return {Module}      返回当前模块对象
		 */
		insertBefore: function(name, cell){
			var self = this;
			var col = self.buildCol(cell);
			if (col){
				var target = name && self.$cols[name];
				if (target){
					// 目标存在, 插入到目标前的位置
					col.insertBefore(target);
				}else {
					// 目标不存在, 插入到第一列最前端
					target = self.$rows[0];
					if (!target){
						target = self.buildRow();
						self.$rows.push(target);
						self.append(target);
					}
					target.prepend(col);
				}
			}
			return self;
		},
		getContainer: function(name, noCreate){
			var self = this;
			if (!name){
				name = self.getConfig('default_name');
			}
			var container = self.$cols[name];
			if (!container && !noCreate){
				self.insertAfter(null, name);
				container = self.$cols[name];
			}

			return container || null;
		}
	});
	exports.layoutGrid = LayoutGrid;

	/**
	 * 布局视图
	 */
	var Layout = Container.extend({
		init: function(config, parent){
			config = pubjs.conf(config, {
				// 对象CSS类
				'class': 'G-viewLayout',
				// 布局类型: horizontal, vertical, grid
				'type': 'horizontal',
				// 初始化布局项目
				'items': null,
				// 项目默认CSS类
				'item_class': null
			});

			var me = this;
			me.$items = [];
			me.$itemClass = null;
			// 调用Container.init()方法
			me.Super('init', arguments);
		},
		/**
		 * 构建Layout主要容器和配置预设项目
		 * @return {Module} 返回模块实例本身(链式调用)
		 */
		build: function(){
			var c = this.getConfig();
			this.Super('build');

			// 设置默认项目CSS类
			var cls = c.item_class;
			if (!cls){
				switch (c.type){
					case 'horizontal':
						cls = 'G-viewLayoutCol';
					break;
					case 'vertical':
						cls = 'G-viewLayoutRow';
					break;
					case 'grid':
						cls = 'G-viewLayoutGrid';
					break;
				}
			}
			this.$itemClass = cls;

			var items = c.items;
			if (items){
				if (util.isArray(items)){
					for (var i=0; i<items.length; i++){
						this.add(items[i], false);
					}
					this.redraw();
				}else {
					this.add(items);
				}
			}
			return this;
		},
		/**
		 * 建立Layout的子项目对象
		 * @param  {Object} item 项目配置对象
		 * @return {Moudle}      返回模块实例本身(链式调用)
		 */
		buildItem: function(item){
			var el = item.el;
			if (!el || !el.jquery){
				el = $('<'+item.tag+'/>');
			}
			// 设置初始属性
			if (item.attr){
				el.attr(item.attr);
			}
			if (item.css){
				el.css(item.css);
			}
			var cls = item['class'];
			if (cls){
				el.addClass(
					util.isArray(cls) ? cls.join(' ') : cls
				);
			}
			if (item.html){
				el.html(item.html);
			}else if (item.text){
				el.text(item.text);
			}
			item.el = el.appendTo(this.$el);

			this.$items.push(item);
			return this;
		},
		/**
		 * 重新计算布局位置
		 * @return {Module} 返回模块实例本身(链式调用)
		 */
		redraw: function(){
			// todo: 针对不同的布局类型计算布局位置和大小
			return this;
		},
		/**
		 * 添加Layout的子项目对象
		 * @param  {Object}  item   项目配置对象, 或者项目id名称字符串
		 * @param  {Boolean} redraw <可选> 是否重新计算布局 (默认重算)
		 * @return {Moudle}         返回模块实例本身(链式调用)
		 */
		add: function(config, redraw){
			if (util.isString(config)){
				config = {'id': config};
			}
			config = util.extend({
				'el': null,
				'tag': 'div',
				'class': this.$itemClass
			}, config);
			this.buildItem(config);
			if (arguments.length === 1 || redraw){
				this.redraw();
			}
			return this;
		},
		/**
		 * 删除指定索引的Layout布局容器
		 * @param  {Number}  index  容器索引号码 (负数表示从后查找)
		 * @param  {Boolean} redraw <可选> 是否重新计算布局 (默认重算)
		 * @return {Module}         返回模块实例本身(链式调用)
		 */
		remove: function(index, redraw){
			if (index < 0){
				index += this.$items.length;
			}
			var item = this.$items[index];
			if (item){
				item.el.remove();
				this.$items.splice(index, 1);
			}
			return this;
		},
		/**
		 * 获取指定索引编号的布局容器
		 * @param  {Number}  index  容器索引号码 (负数表示从后查找)
		 * @param  {Boolean} detail <可选>是否返回完整的项目配置对象
		 * @return {Object}         返回容器jQuery或者项目配置对象, 或者NULL表示没有找到
		 */
		get: function(index, detail){
			if (index < 0){
				index += this.$items.length;
			}
			var item = this.$items[index];
			if (item){
				return (detail ? item : item.el);
			}
			return null;
		},
		/**
		 * 查找第一个满足某个属性值的布局容器
		 * @param  {Mix}     val    要查找的值
		 * @param  {String}  field  要匹配属性名称
		 * @param  {Boolean} detail <可选>是否返回完整的项目配置对象
		 * @return {Object}         返回容器jQuery或者项目配置对象, 或者NULL表示没有找到
		 */
		getBy: function(val, field, detail){
			var item = util.find(this.$items, val, field);
			if (item){
				return (detail ? item : item.el);
			}
			return null;
		},
		/**
		 * 按照id查找指定的布局容器
		 * @param  {String}  id     布局项目id值
		 * @param  {Boolean} detail <可选>是否返回完整的项目配置对象
		 * @return {Object}         返回容器jQuery或者项目配置对象, 或者NULL表示没有找到
		 */
		getByID: function(id, detail){
			return this.getBy(id, 'id', detail);
		}
	});
	exports.layout = Layout;
});