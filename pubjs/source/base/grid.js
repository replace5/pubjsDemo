define(function(require, exports){
	var $ = require("jquery");
	var pubjs = require('../core/pub');
	var util  = require('../core/util');
	var view  = require('./view');
	var table = require('./table');

	// 基础Grid模块
	var BaseNoDate = view.widget.extend({
		init: function(config, parent){
			config = pubjs.conf(config, {
				'class': '',
				'target': parent,
				'cols': [],				// 列定义
				'exclude_cols':null,	// 要排除的列
				'subs': null,			// 二级表格定义
				'sort': 'pageviews',	// 排序字段
				'order': 'desc',		// 排序顺序
				'rowClick': null,		// 表格行点击事件
				'opClick': null,		// 行操作点击事件 不同的方法绑定data-op属性
				'operation': null,		// 自定义行操作, 可以为col配置对象或者数组

				"functional": null,		// 操作功能按钮
				"static_date": null,	// 静态查询日期参数

				"reqType": "ajax",		// 	默认通信方式使用ajax，可选websocket
				"reqMethod":"get",		// 数据获取方式
				'amount_data': null,	// 静态总计数据
				'data': null,			// 静态数据
				'url': null,			// 远程数据地址
				'param': null,			// 远程数据请求参数
				'auto_load': true,		// 自动加载数据
				'is_sub_grid': false,	// 判断是否二级菜单
				'sub_param': null,		// 二级表格当前过滤参数
				'sub_key': null,		// 参数名称
				'sub_field': null,		// 索引字段名称
				'sub_exname': null,		// 子表格导出文件名前续
				'sub_filter': null,		// 子表格图标过滤函数
				"rowName":"Name",		// 行名称字段名

				'hasRefresh': false,	// 刷新控件
				'refresh_time': 10,		// 刷新间隔
				'refresh_auto': 0,		// 自动刷新中

				'hasSearch': true,		// 是否有搜索模块
				'hasSubGrid': true,		// 是否显示子表格
				'hasExport': true,		// 是否有导出模块
				'hasPager': true,		// 是否有分页模块
				'hasAmount': true,		// 是否有总计模块
				'hasTab': true,			// 是否显示栏目切换栏
				"hasSelect":false,		// 是否显示多选列
				"hasMenu":true,			// 是否允许创建操作菜单
				'default_sort': true,	// 默认栏目排序

				'excelExport': null,	// 导出模块参数
				'amount': null,			// 总计模块配置信息
				'pager': null,			// 分页模块配置信息
				'list': null,			// 表格详细配置信息
				'tab': null,			// 栏目切换配置信息
				'highlight_time': 180,	// 保存成功后记录的高亮时间

				'eventDataLoad': false,

				"batch":false,
				// 模块加载区域设定。
				// 这个设定根据buildLayout函数生成的结果来设定。
				// 如果有自定义的结构，这里可能需要根据生成的结果做调整
				'layout': {
					'module': view.layoutGrid,
					'default_name': 'list',
					'type': 'grid-fit',
					'rows': [
						'search(.pb10)',
						'tab(auto)|export(*right)(.pl10)(auto)|refresh(*right)(auto)',
						'amount',
						'list',
						'pager(.tr)(.pt10)'
					]
				}
			});

			var self = this;
			var c = config.get();

			if (c.sub_filter && util.isString(c.sub_filter)){
				var cb = c.sub_filter;
				c.sub_filter = util.isFunc(self[cb]) ? [self, self[cb]] : null;
			}
			if(c.subs && c.subs.length){
				var excludes = pubjs.config("userModules/subgrid/exclude/" + pubjs.getUser().type);
				if (excludes && excludes.length){
					for(var i = excludes.length;i>0;){
						util.remove(c.subs, excludes[--i]);
					}
				}
			}

			self.$sys_param = util.extend({}, c.static_date, {
				'site_id': c.noSiteId ? undefined: pubjs.config("site_id"),
				'format': 1
			});

			// 高亮时间
			c.highlight_time = c.highlight_time * 1000;
			// 自动刷新Timeout ID
			self.$refresh_timeid = 0;
			// 行名称字段名
			self.$gridRowName = c.rowName;
			// 子表格实例缓存
			self.$subGrids = {};
			// 列表数据对象
			self.$data = null;
			// 模块容器DOM
			self.$checkDOM = null;
			// 数据拉取请求ID
			self.$reqID = 0;

			self.Super('init', arguments);
		},
		afterBuild: function(layout){
			var self = this;
			var cfg = self.getConfig();
			var cols = cfg.cols;
			self.addClass('M-gridBase');
			self.$checkDOM = self.getDOM();

			// 修正表格类型和子表格ID字段
			if(cfg.param && cfg.param.type){
				self.$gridType = cfg.param.type;
			}
			if(self.$gridType && !cfg.sub_field){
				cfg.sub_field = self.$gridType+'_id';
			}

			// 建立搜索过滤
			if (cfg.hasSearch){
				self.createDelay(
					'search', '@base/common/base.search',
					{'target': self.getContainer('search')}
				);
			}else {
				layout.removeCol('search');
			}

			// Excel导出控件
			if (cfg.hasExport){
				self.createDelay(
					'excel', '@base/common/base.excelExport',
					util.extend(cfg.excelExport, {'target': self.getContainer('export')})
				);
			}else {
				layout.removeCol('export');
			}

			// 栏目切换控件
			var tab, list;
			if (cfg.hasTab){
				// 获取初始字段列表
				list = [];
				util.each(cols, function(item){
					if (util.isString(item)){
						list.push(item);
					}else if (item.name){
						list.push(item.name);
					}
				});
				var initLength = list.length;

				// 创建切换栏目选项卡
				tab = self.create('tab', table.tab, util.extend(cfg.tab, {
					'gridCols': list,
					'target': self.getContainer("tab")
				}));

				// 有栏目分类切换的话,尝试自动补齐未配置的字段
				// 生成支持的所有字段
				util.each(tab.getList(), function(item){
					if (item.custom){ return; }
					list.push.apply(list, item.cols);
				});

				// 字段去重
				util.unique(list);

				// 合并字段到Grid配置中
				if (cols){
					cols.push.apply(cols, list.slice(initLength));
				}else {
					cfg.cols = cols = list;
				}
			}else {
				layout.removeCol('tab');
			}

			// 排除指定字段, 子表格排除创建时间与状态
			list = cfg.exclude_cols;
			if (cfg.is_sub_grid){
				if (list){
					list.push("Status");
				}else {
					list = ["Status"];
				}
			}
			if(list){
				util.each(cols, function(item){
					var name = util.isString(item) ? item : (item.name || null);
					if (name !== null && util.index(list, name) !== null){
						return null;
					}
				});
			}

			// 总计控件
			if (cfg.hasAmount){
				list = util.extend(cfg.amount, {
					'cols': cols,
					'data': cfg.amount_data || null,
					'target': self.getContainer('amount')
				});
				list = self.create('amount', table.amount, list);
				if (tab){
					list.showColumn(tab.getColumns());
				}
			}else {
				layout.removeCol('amount');
			}

			// 自动根据hasSelect参数插入选择列
			if(cfg.hasSelect){
				cols.unshift({"type":"select","name":"sel","all":true});
			}

			// 把附加的自定义操作写入列定义中
			if (cfg.operation){
				if (util.isArray(cfg.operation)){
					cols.push.apply(cols, cfg.operation);
				}else {
					cfg.operation.type = 'op';
					cols.push(cfg.operation);
				}
				if (!cfg.opClick) {
					cfg.opClick = true;
				}
			}

			// 操作功能配置
			if(util.isObject(cfg.functional)){
				cfg.functional.type = "func";
			}else if(cfg.functional){
				pubjs.error("操作功能配置类型错误 >> ",cfg.functional);
				cfg.functional = null;
			}

			// 建立基本Table结构
			list = self.create('list', table.list, util.extend({
				'target': self.getContainer('list'),
				'cols': cols,
				'subs': cfg.hasSubGrid ? cfg.subs : null,
				'rowClick': cfg.rowClick,
				'opClick': cfg.opClick,
				'subFilter': cfg.sub_filter,
				'data': cfg.data,
				'default_sort': cfg.default_sort,
				'sort': cfg.sort,
				'order': cfg.order,
				'key': cfg.sub_field,
				'functional':cfg.functional,
				'hasAddSub':cfg.hasAddSub,
				'hasMenu': cfg.hasMenu
			}, cfg.list));

			// 如果创建的tab模块, 获取当前显示的列信息, 更新列显示
			if (tab){
				list.showColumn(tab.getColumns());
			}

			// 自动刷新模块
			if (cfg.hasRefresh){
				// 读取记录的配置
				cfg.refresh_id = 'grid_refresh' + self._.uri;
				if (cfg.refresh_auto){
					cfg.refresh_auto = (pubjs.storage(cfg.refresh_id) !== '0');
				}
				var div = $('<div class="M-gridRefresh" />').appendTo(self.getContainer('refresh'));
				div.html([
					'<button data-type="0" class="uk-button" />',
					'<button class="uk-button refNormal"><em /></button>'
				].join(''));
				var ref = self.$refresh = {
					dom: div,
					check: div.find('button:eq(0)').text(LANG("自动刷新")),
					button: div.find('button:eq(1)')
				};
				self.refreshCallBack = self.refreshCallBack.bind(self);
				if (cfg.refresh_auto){
					ref.check.addClass('uk-button-primary').attr('data-type', 1);
				}
				self.uiBind(ref.check, 'click', 'eventRefreshMode');
				self.uiBind(ref.button, 'click', 'eventRefreshManual');
			}

			// 分页定义
			if (cfg.hasPager){
				self.createDelay(
					'pager', '@base/common/base.pager',
					util.extend(cfg.pager, {'target': self.getContainer('pager')})
				);
			}else {
				layout.removeCol('pager');
			}

			// 创建异步创建的模块, 完成后继续设置参数和加载数据
			self.createDelay(true, function(){
				var cs = self.$;
				var param = self.$sys_param;
				// 更新排序记录
				param.order = list.getSort();
				// 更新分页设置
				if (cs.pager){
					param.page = cs.pager.page;
					param.limit = cs.pager.size;
				}
				// 加载数据
				if (!cfg.data && cfg.auto_load && (cfg.url || cfg.is_sub_grid)){
					self.load();
				}
			});
		},
		eventRefreshMode: function(evt, elm){
			this.setConfig('refresh_auto', +$(elm).attr("data-type"));
			this.toggleRefresh();
		},
		eventRefreshManual: function(){
			this.load(true);
		},
		toggleRefresh: function(mode){
			var self = this;
			var c = self.getConfig();
			if (mode === undefined){
				mode = !c.refresh_auto;
			}else {
				mode = !!mode;
			}
			c.refresh_auto = mode;
			self._toggleRefresh(mode);
			self.$refresh.check
				.attr("data-type",mode?1:0)
				.toggleClass("uk-button-primary",mode);
			pubjs.storage(c.refresh_id, +mode);
			return self;
		},
		_toggleRefresh: function(mode){
			var self = this;
			if (mode){
				if (!self.$refresh_timeid){
					self.$refresh_timeid = setTimeout(
						self.refreshCallBack,
						self.getConfig().refresh_time * 1000
					);
				}
			}else {
				if (self.$refresh_timeid){
					clearTimeout(self.$refresh_timeid);
					self.$refresh_timeid = 0;
				}
			}
			return self;
		},
		refreshCallBack: function(mode){
			var self = this;
			if (self.getDOM().width() > 0){
				self.cast('autoRefresh');
			}else {
				self.$refresh_timeid = 0;
				self._toggleRefresh(1);
			}
		},
		onAutoRefresh: function(){
			if (this.getDOM().width() > 0){
				// 表格正常显示, 刷新自己
				this.load(true);
			}else {
				// 表格隐藏, 拦截事件不刷新
				return false;
			}
		},
		/**
		 * 设置分页数据
		 * @param {Number} page  当前页面数据
		 * @param {Number} size  分页数据大小
		 * @param {Number} total 总记录条数
		 */
		setPage: function(page, size, total){
			if (!page){ page = 1; }
			if (this.$.pager){
				this.$.pager.setup({
					page: page,
					total: total || undefined,
					size: size || undefined
				});
			}
			this.$sys_param.page = page;
		},
		/**
		 * 手工设置列表数据
		 * @param {Array} data 列表数据数组
		 */
		setData: function(data){
			var index = 0;
			if (this.$.pager){
				index = (this.$.pager.page - 1) * this.$.pager.size;
			}
			this.$data = data;
			this.$.list.setData(data,index);
			this.fire("sizeChange");
		},
		/**
		 * 返回当前Grid数据列表
		 * @return {Array} 返回数据列表数组
		 */
		getData: function(){
			return this.$data;
		},
		/**
		 * 设置总计模块数据
		 * @param {Object} data 总计模块数据对象
		 */
		setAmount: function(data){
			if (this.$.amount){
				this.$.amount.setData(data);
			}
		},
		/**
		 * 设置表格的某一项记录
		 * @param {Number} index 行索引号
		 * @param {Object} row   行数据对象 / {String} 行属性名称
		 * @param {Mix}    data  <可选> 行属性值
		 * @return {Bool} 返回更新操作结果
		 */
		setRow: function(index, row, data){
			var res = this.$.list.setRow(index, row, data);
			if (!res){
				return false;
			}
			this.$data = res;
			return true;
		},
		/**
		 * 删除某一行记录
		 * @param  {Number} index 行索引号码
		 * @return {Bool}       返回删除操作结果
		 */
		removeRow: function(index){
			var res = this.$.list.removeRow(index);
			if (!res){
				return false;
			}
			this.$data = res;
			return true;
		},
		/**
		 * 加载远程服务器数据
		 * @return {None}     无返回
		 */
		load: function(auto){
			var self = this;
			var cfg = self.getConfig();
			if (!cfg.url){ return self; }

			if (!util.checkUI(self.$checkDOM, 'load', self)){
				return self;
			}

			// 自动刷新
			if (self.$refresh){
				self._toggleRefresh(0);
				self.$refresh.button.prop('disabled', true).addClass('refing');
			}

			if (cfg.is_sub_grid && cfg.sub_param){
				// var type = self.subGridType || self.$gridType;
				// if (type){
				// 	cfg.url = '/rest/subgrid?type=' + type;
				// }
				self.$sys_param.condition = cfg.sub_param;
			}else {
				delete(self.$sys_param.condition);
			}

			var param = util.extend(
				{},
				cfg.param,
				self.$sys_param,
				self.getParam()
			);
			auto = (auto === true);

			if (self.$reqID){
				pubjs.data.abort(self.$reqID);
			}

			switch(cfg.reqType){
				case 'ajax':
					self.$reqID = pubjs.data[cfg.reqMethod](cfg.url, param, self, 'onData', auto);
				break;
				case 'websocket':
					pubjs.mc.send(cfg.url, param, self.onData.bind(self));
				break;
			}

			if (!auto){
				self.showLoading();
			}
			return self;
		},
		/**
		 * 重新加载数据, 默认重置当前页码
		 * @param  {Object} url <可选> 新的远程服务器配置信息
		 * @param  {Object} param <可选> 新的远程服务器配置信息
		 * @param  {Object} sub_param <可选> 新的远程服务器配置信息
		 * @param  {Object} page <可选> 新的远程服务器配置信息
		 * @return {None}     无返回
		 */
		reload: function(url, param, sub_param, page){
			var cfg = this.getConfig();
			if (url){
				cfg.url = url;
			}
			if (param){
				cfg.param = param;
			}
			if (sub_param){
				cfg.sub_param = sub_param;
			}
			this.$sys_param.page = page || 1;
			this.load();
		},
		showLoading: function(){
			this.$.list.showLoading();
		},
		hideLoading: function(){
			this.$.list.hideLoading();
		},
		/**
		 * 更新操作列显示
		 * @return {None} 无返回
		 */
		updateOperation: function(){
			this.$.list.updateColumnType('op');
		},
		/**
		 * 返回自定义参数
		 * @return {Object} 参数对象
		 */
		getParam: function(){
			return this.$customParam;
		},
		setParam: function(param, replace){
			this.$customParam = replace ? param : util.extend(this.$customParam, param);
			return this;
		},
		/**
		 * 更新合并请求参数
		 * @param  {Object} param 变更的参数对象
		 * @return {None}       无返回
		 */
		updateParam: function(param){
			this.extendConfig('param', param);
			return this;
		},
		/**
		 * 数据中心返回数据回调方法
		 * @param  {Object} err  请求错误对象
		 * @param  {Object} data 请求数据返回结果
		 * @return {None}      无返回
		 */
		onData: function(err, data, param){
			var self = this;
			var c = self.getConfig();
			self.$reqID = 0;
			// 自动刷新
			if (self.$refresh){
				self.$refresh.button.prop('disabled', false).removeClass('refing');
				if (c.refresh_auto){
					self._toggleRefresh(1);
					// 自动拉取时, 错误不更新不提示错误
					if (err){ return; }
					self.$.list.showRefresh();
				}
			}
			// 判断错误
			if (err){
				self.$.list.showEmptyRow();
				pubjs.error('拉取数据错误', err);
				return;
			}
			var index = 0;
			// 更新分页
			if (self.$.pager){
				self.$.pager.setup({
					'total': data.total,
					'size': (data.size || undefined),
					'page': (data.page || undefined)
				});
				index = (self.$.pager.page - 1) * self.$.pager.size;
			}

			// 设置数据到表格中
			self.$data = data.items;
			self.$.list.setData(data.items, index, param);

			// 更新数据到总计模块
			if (self.$.amount) {self.$.amount.setData(data.amount || {});}

			self.fire("sizeChange");
			if(c.eventDataLoad){
				self.fire("gridDataLoad",data);
			}
		},
		/**
		 * 搜索事件处理函数
		 * @param  {Object} ev 事件变量
		 * @return {Bool}       返回false拦截事件冒泡
		 */
		onSearch: function(ev){
			this.$sys_param.word = ev.param || undefined;
			this.$sys_param.page = 1;
			this.load();
			return false;
		},
		/**
		 * 分页切换事件
		 * @param  {Object} ev 事件变量
		 * @return {Bool}       返回false拦截事件冒泡
		 */
		onChangePage: function(ev){
			if (this.$.pager){
				this.$sys_param.page = ev.param.page;
				this.$sys_param.limit = ev.param.size;
				this.load();
			}
			return false;
		},
		/**
		 * 切换排序事件
		 * @param  {Object} ev 事件变量
		 * @return {Bool}       返回false拦截事件冒泡
		 */
		onChangeSort: function(ev){
			this.$sys_param.order = this.$.list.getSort();
			this.load();
			return false;
		},
		/**
		 * 切换栏目事件处理函数
		 * @param  {Object} ev 事件变量
		 * @return {Bool}     返回false拦截事件冒泡
		 */
		onChangeTab: function(ev){
			if (this.$.amount) {this.$.amount.showColumn(ev.param.cols);}
			if (this.$.list) {this.$.list.showColumn(ev.param.cols);}
			return false;
		},

		/**
		 * 导出按钮点击事件
		 * @param  {Object} ev 事件变量
		 * @return {Bool}     返回false拦截事件冒泡
		 */
		onExcelExport: function(ev){
			var cfg = this.getConfig();
			var ud;
			var param = util.extend(
				{},
				cfg.param,
				this.$sys_param,
				this.getParam(),
				{'page':ud, 'order':ud}
			);
			if (cfg.sub_exname){
				param.subex_name = cfg.sub_exname;
			}
			delete param.format;
			ev.returnValue = {
				'url': cfg.url,
				'param': param
			};
			return false;
		},
		/**
		 * 打开二级表格事件通知
		 * @param  {Object} ev 事件变量
		 * @return {Bool}     返回false拦截事件冒泡
		 */
		onShowSubGrid: function(ev){
			var param = ev.param;
			// 判断表格分类是否存在
			var module = (param.config.module || param.label.module);
			if (!util.isCreator(module)){
				if (util.isString(module)){
					pubjs.loadModule(module, param, this, 'buildSubGrid');
					return false;
				}
				module = exports[param.type];
				if (!util.isCreator(module)){
					pubjs.error('SubGrid Constructor Missing - ' + param.type);
					return false;
				}
			}
			this.buildSubGrid(module, param);
			return false;
		},
		/**
		 * 关闭二级表格事件通知
		 * @param  {Object} ev 事件变量
		 * @return {Bool}     返回false拦截事件冒泡
		 */
		onHideSubGrid: function(ev){
			var index = ev.param.index;
			var list = this.$subGrids;
			if (index && list[index]){
				list[index].show = 0;
			}
			return false;
		},
		/**
		 * 构建指定类型的二级表格实例
		 * @param  {Module} module 实例定义函数
		 * @param  {Object} param  实例构建参数
		 * @return {None}
		 */
		buildSubGrid: function(module, param){
			var gridParam = this.getSubGridParam(param);
			var cid = param.index;
			var inst = this.$subGrids[cid];

			if (inst){
				var subgrid = inst.grid;
				if (inst.type === param.type){
					if (gridParam.sub_param != inst.param){
						inst.param = gridParam.sub_param;
						if (!inst.date){
							subgrid.cast('updateSubGrid', inst.param);
						}
					}
					if (inst.date){
						// 表格需要重新加载
						subgrid.cast('changeDate', inst.date);
						inst.date = false;
					}
					// 同一个类型的Grid, 直接返回, 无需重复加载
					return;
				}else {
					inst.grid.destroy();
				}
			}
			// 创建实例
			this.$subGrids[cid] = {
				grid: this.create(module, gridParam),
				type: param.type,
				param: gridParam.sub_param,
				date: 0,
				show: 1
			};
			return;
		},
		// 子表格参数更新
		onUpdateSubGrid: function(ev){
			this.reload(null, null, ev.param);
			return false;
		},
		/**
		 * 切换更新二级表格实例索引
		 */
		onSwitchSubGrid: function(ev){
			var from = ev.param.from;
			var to = ev.param.to;
			var list = this.$subGrids;
			var fromInst = list[from];
			var toInst = list[to];
			if (toInst){
				list[from] = toInst;
			}else {
				delete list[from];
			}
			if (fromInst){
				list[to] = fromInst;
			}else {
				delete list[to];
			}
			return false;
		},
		/**
		 * 生成子查询Condition参数
		 * @param  {Object} param subGrid模块传递进来的带行DATA对象参数
		 * @return {String}       子表格查询参数字符串
		 */
		getSubParam: function(param){
			var cfg = this.getConfig();
			var id = param.data[cfg.sub_field] || param.data[(this.subGridType || this.$gridType) + '_id'];
			var sub_param = cfg.sub_param || '';
			sub_param += (sub_param && ',') + (cfg.sub_key || ((this.subGridType || this.$gridType) + '_id')) + '|' + id;
			return sub_param;
		},
		/**
		 * 返回子表格的自定义参数 (具体表格分类重写本函数可控制子表格的样式)
		 * @param  {Object} param showSubGrid的事件对象
		 * @return {Object}       返回子表格的参数对象
		 */
		getSubGridParam: function(param){
			return {
				'is_sub_grid': true,
				'sub_exname': param.data[this.$gridRowName],
				'sub_param': this.getSubParam(param),
				'sub_id': param.data[this.getConfig().sub_field],
				'sub_data': param.data,
				'hasSearch': false,
				'hasAmount': false,
				'target': param.target
			};
		},
		/**
		 * 子功能调用通知事件
		 * @param  {Object} ev 通知事件对象
		 * @return {Bool}    返回false阻止事件冒泡
		 */
		onSubFunction: function(ev){
			var param = ev.param;
			// 判断表格分类是否存在
			var module = (param.config.module || param.label.module);
			if (!util.isCreator(module)){
				if (util.isString(module)){
					pubjs.loadModule(module, param, this, 'runSubFunction');
					return false;
				}
			}
			this.runSubFunction(module, param);
			return false;
		},
		runSubFunction: function(module, param){
			if (module && util.isCreator(module)){
				var cid = 'funcmod_' + param.type;
				var mod = this.child(cid);
				if (mod){
					mod.setParam(param);
				}else {
					mod = this.create(cid, module, param);
				}
				return mod;
			}else {
				return false;
			}
		},
		/**
		 * 设置表格某行选中
		 * @param {Number} id 行ID值
		 */
		setRowHighlight: function(id) {
			if (id) {
				this.$.list.setRowHighlight(id);
				this.setTimeout('unsetRowHighlight', this.getConfig().highlight_time, id);
			}
		},
		/**
		 * 取消表格高亮行
		 * @param  {Number} id 行ID值
		 * @return {None}
		 */
		unsetRowHighlight: function(id){
			this.$.list.unsetRowHighlight(id);
		}
		/**
		 * 根据id数组设定表格选中行
		 * @param  {Array} ids id数组
		 * @return {None}
		 */
		,setSelectRowIds:function(ids){
			this.$.list.setSelectRowIds(ids);
		}
		/**
		 * 获取表格选中行id数组
		 * @return {Array} ids id数组
		 */
		,getSelectRowIds:function(){
			return this.$.list.getSelectRowIds();
		}
	});
	exports.baseNoDate = BaseNoDate;

	// 带日期参数的表格
	var Base = BaseNoDate.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'static_date': pubjs.getDate()
			});

			this.Super('init', arguments);
		},
		/**
		 * 时间改变的响应函数
		 * @param  {Object}  ev 消息对象
		 * @return {Boolean}    阻止广播
		 */
		onChangeDate:function(ev){
			// 强制刷新数据
			this.setDateRange(pubjs.getDate());
			this.load();
			// 二级表格全部置重新加载状态
			util.each(this.$subGrids, function(inst){
				if (inst.show){
					inst.grid.cast('changeDate', ev.param);
				}else {
					inst.date = ev.param;
				}
			})
			return false;
		},
		/**
		 * 更新时间段参数
		 * @param {Object} date datebar模块返回的时间段参数
		 * @return {Bool}		返回是否有参数更新
		 */
		setDateRange:function(date){
			var ud;
			var sp = this.$sys_param;
			if (!sp){ return false; }
			util.extend(sp, {
				stastic_all_time: ud,
				begindate: ud,
				enddate: ud
			}, date);
			return this;
		}
	});
	exports.base = Base;
});