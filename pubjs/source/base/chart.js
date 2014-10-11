/**
 * 图标基础模块
 */
define(function(require, exports){
	var $ = require('jquery');
	var pubjs = require('../core/pub');
	var util  = require('../core/util');
	var view  = require('./view');
	var hChart = require("../libs/charts/highcharts");

	// 设置默认highCharts配置
	//	禁用UTC时间
	hChart.setOptions({'global':{'useUTC': false}});

	// 颜色
	/*var colors = (function(){
		var colors = [];
		var color = 0;
		for (var i=0; i<36; i++){
			colors.push(util.hsb2rgb(color, 0.33, 0.88));
			color += 130;
		}
		return {colors:colors};
	})();*/
	var DEFAULT_COLORS = ["#00a4bc","#ff005f","#0ec900"];

	/**
	 * 图表的默认设置
	 * @type {Object}
	 * @private
	 */
	var DEFAULT_BUILD = {
		// x轴设定
		"xAxis":{
			// 坐标分割线宽度
			"gridLineWidth":1
			// 分割步长
			,"tickInterval":2
			,"tickmarkPlacement":"on"
			// 坐标分割线样式
			,"gridLineDashStyle":"longdash"
			// 坐标分割线颜色
			,"gridLineColor":"#c0e8f0"
			// 坐标上显示的文字设定
			,"labels":{
				// 文字样式
				"style":{
					 "font":"normal 11px Verdana, sans-serif"
				}
				// 步长
				,"step":1
			}
		}
		// y轴设定。部分设定请参照x轴
		,"yAxis":{
			// y轴上显示的标题
			"title":{
				"text":null
			}
			// 可显示的最小值
			,"min":0
			,"gridLineWidth":1
			,"gridLineColor":"#eeeeee"
			,"gridLineDashStyle":"longdash"
			,"plotLines": [{
				"value":0
				,"width":1
				,"color":"#808080"
			}]
		}
		// 图表设定
		,"chart": {
			// 间距
			"margin":[50,80,100,100]
			// 图表背景
			,"backgroundColor":null
			// 图表边框
			,"borderColor":null
			// 图表主样式
			,"style":{
				"fontFamily":"'Microsoft YaHei',Verdana, Arial, Helvetica, sans-serif"
			}
		}
		// 版权
		,"credits":{
			"enabled":false
		}
		// 图表标题
		,"title":null
		// 信息浮动层
		,"tooltip":{
			// 关联所有同X坐标的series
			"shared":true
			// 标识线样式
			,"crosshairs":{
				"width":1
				,"color":"red"
				,"dashStyle":"DashDot"
			}
			,"backgroundColor":"#ffffff"
		}
		,"plotOptions":{
			"areaspline":{
				// 线大小
				"lineWidth":1
				// 填充的不透明度
				,"fillOpacity":0.1
				// 是否显示阴影
				,"shadow":false
			}
			,"series":{
				"marker":{
					"lineWidth":1
					,"symbol":"circle"
				}
				,"dataLabels":{
					// "enabled":true
				}
				// ,"dashStyle":"longdash"
			}
		}
		,"legend": {
			"borderWidth":0
		}
	};

	/*
	series配置对象格式
	{
		text: <线条名称>
		group: <分组维度名称, 按该维度的值把数据分组>
		label_field: <X轴显示标签属性名称>
		label_format: <X轴显示标签格式化回调函数>
		x_field: <维度属性名称>
		x_format: <X轴显示信息格式化>
		y_field: <指标属性名称>
		y_format: <Y轴显示信息格式化> : 可以返回null过滤不符合要求的记录
		init: <series 初始化回调函数>
		param: <series 附加配置参数>
		filter: <记录过滤参数对象 / 过滤检查函数(返回true/false)>,
	}
	*/
	var Chart = view.widget.extend({
		init: function(config, parent){
			config = pubjs.conf(config, {
				'type': 'none', // 图表类型
				'title': null, // 图表标题
				'loading': LANG('资料加载中..'), // Loading提示信息
				'empty': LANG('没有数据'),
				'url': null, // 图表数据拉取点
				'param': null, // 数据请求参数
				'autoLoad': true,
				'hasDateParam': true,
				'export': false, // 是否有导出选项
				'series': null, // 图表数据配置选项
				'context': null, // 回调函数的作用域对象
				'height': 500,
				'width': 700,
				'colors': DEFAULT_COLORS,
				'build': DEFAULT_BUILD,
				"reqMethod":"get",
				"x_property":"x"
			});

			// 多个Y轴合并默认Y轴配置
			var yAxis = config.get('build/yAxis');
			if (util.isArray(yAxis)){
				for (var i=yAxis.length; i>0;){
					config.setDefault('build/yAxis/'+(--i), DEFAULT_BUILD.yAxis);
				}
			}

			var self = this;
			// 正在请求的ajax id
			self.$ajax_id = null;

			// 默认对象数据
			self.$cats = null;
			self.$data = null;
			self.$list = null; // 原始数据

			// 继续调用父类的初始化
			self.Super('init', arguments);
		},
		afterBuild: function(layout){
			var self = this;
			var c = self.getConfig();

			// 生成到处按钮
			var exp = c['export'];
			if (exp){
				if (!exp.target){
					exp.target = $('<div/>').appendTo(self.getContainer('export'));
				}
				self.createAsync('export', '@base/common/base.excelExport', exp);
			}

			// 默认chart渲染参数设置
			self.extendConfig('build/chart', {
				'width': c.width,
				'height': c.height,
				'renderTo': self.getContainer('chart').get(0)
			});
			if (c.title){
				self.setConfig('build/title', {'text':c.title, 'style':c.build.chart.style});
			}
			// serise默认转为数组对象
			if (c.series && !util.isArray(c.series)){
				self.setConfig('series', [c.series]);
			}

			// 生成图表
			self.$chart = new hChart.Chart(self.getConfig('build'));
			self.$chartCon = $(self.$chart.container);

			// 提示信息容器
			self.$tip = $('<div class="M-chartTip"/>').insertAfter(self.$chartCon);

			// 设置图表数据
			if(self.$list && self.$list.length){
				self.setData(self.$list);
			}else if (c.autoLoad){
				self.load();
			}
			self.fire('sizeChange');
			if (layout){
				self.send(layout, 'sizeChange');
			}
		},
		toggleLoading: function(show){
			var self = this;
			if(!self.$chartCon){
				return;
			}
			var tip = self.$tip;
			self.$chartCon.toggle(!show);
			tip.removeClass('M-chartEmpty');
			if (show){
				tip.addClass('M-chartLoading')
					.text(self.getConfig('loading'))
					.show();
			}else {
				tip.removeClass('M-chartLoading').hide();
			}
			return self;
		},
		toggleEmpty: function(show){
			var self = this;
			if(!self.$chartCon){
				return;
			}
			var tip = self.$tip;
			self.$chartCon.toggle(!show);
			tip.removeClass('M-chartLoading');
			if (show){
				tip.addClass('M-chartEmpty')
					.text(self.getConfig('empty'))
					.show();
			}else {
				tip.removeClass('M-chartEmpty').hide();
			}
			return self;
		},
		toggleSeries: function(index, state){
			var serie = this.$chart.series[index];
			if (serie){
				if (state !== true && state !== false){
					state = serie.visible;
				}
				if (state){
					serie.show();
				}else {
					serie.hide();
				}
			}
			return this;
		},
		/**
		 * 重置图表内容
		 * @return {None} 无返回
		 */
		reset: function(){
			// 移除图像数据
			var self = this;
			if (self.$ajax_id){
				pubjs.data.abort(self.$ajax_id);
			}
			self.resetChart();
			self.$data = null;
			self.$list = null;
			self.$ajax_id = null;

			return self;
		},
		resetChart: function(){
			var chart = this.$chart;
			if (chart){
				var series = chart.series;
				while (series.length > 0){
					series[0].remove(false);
				}
				chart.redraw();
			}
			return this;
		},
		/**
		 * 设置图表数据, 并更新显示图表
		 * @param {Array} list 数据对象数组
		 */
		setData: function(list){
			var self = this;
			self.$list = list;

			if(!self.$ready){ return self; }

			// 重置图表显示
			self.resetChart();

			var isEmpty = true;
			if (list && list.length){
				// 格式化数据为chart类库使用的格式, 存在this.$data中
				self.formatData(list);

				if (self.$data.length){
					self.toggleEmpty(false);

					// 设置X轴标签
					if (self.$cats){
						self.$chart.xAxis[0].setCategories(self.$cats);
					}

					// 添加图表数据集
					util.each(self.$data, function(serie){
						self.$chart.addSeries(serie, false);
					});

					// 重绘图表, 输出结果
					self.$chart.redraw();
					isEmpty = false;
				}
			}

			if (isEmpty){
				// 没有数据或数据被过滤后没有合适的数据
				self.toggleEmpty(true);
			}
			self.fire('sizeChange');
			if (self.$el){
				self.send(self.$el, 'sizeChange');
			}
			return self;
		},
		setSeries: function(index, option){
			var serie = this.$chart.series[index];
			if (serie){
				serie.update(option);
				this.extendConfig('series/'+index, option);
			}
			return this;
		},
		addSeries: function(series){
			var self = this;
			self.getConfig('series').push(series);
			self.setData(self.$list);
			return self;
		},
		addSeriesEx: function(series){
			if (!series.color){
				var c = this.getConfig();
				series.color = c.colors[this.$chart.series.length % c.colors.length];
			}
			return this.$chart.addSeries(series);
		},
		removeSeries: function(index, redraw){
			var series = this.getConfig('series');
			if (util.isString(index)){
				index = util.index(series, index, 'y_field');
				if (index === null){
					return this;
				}
			}
			var serie = this.$chart.series[index];
			if (serie){
				serie.remove(Boolean(redraw));
			}
			series.splice(index, 1);
			return this;
		},
		resetSeries: function(series, redraw){
			var self = this;
			self.resetChart();
			self.setConfig('series', series);
			if (redraw !== false){
				self.setData(self.$list);
			}
			return self;
		},
		formatClicki: function(val, key){
			this[key] = val;
		},
		/**
		 * 格式化列表数据, 生成各个需要的图表数据组
		 * @param  {Array} data 数据对象数组
		 * @return {Array}      HightChart使用的series列表数组
		 */
		formatData: function(data){
			var UD, c = this.getConfig();
			var series = this.$data = [];
			var cats = [];
			var ctx = c.context || this;
			var format = this.formatClicki;

			util.each(c.series, function(cfg){
				var list = {};
				util.each(data, function(item){
					if (item.keys){ util.each(item.keys, format, item); }
					if (item.x_axis){ util.each(item.x_axis, format, item); }
					if (item.y_axis){ util.each(item.y_axis, format, item); }

					if (cfg.filter && !cfg.filter.call(ctx, item, cfg)) {return;}

					var id, d;
					if (cfg.group && util.has(item, cfg.group)){
						d = id = item[cfg.group];
					}else {
						id = 'main'; d = null;
					}
					if (util.has(list, id)){
						d = list[id];
					}else {
						d = list[id] = util.extend({
							name: cfg.text || d,
							yAxis: cfg.y_axis || 0,
							data: []
						}, cfg.param);
						if (cfg.init && util.isFunc(cfg.init)){
							// 参数说明: 配置对象, 数据行, 配置信息
							cfg.init.call(ctx, d, item, cfg);
						}
					}
					id = d.data.length;
					//
					var val={};
					val[c.x_property] = id;

					var yAix = item['y_axis']||item;
					var v = util.own(yAix, cfg.y_field);


					if (cfg.y_format && util.isFunc(cfg.y_format)){
						// 参数说明: 记录对象, 当前值, 数据行, 数据行号
						v = cfg.y_format.call(ctx, v, val, item, id);
					}
					if (v !== UD){
						val.y = +v;

						var x_axis =item['x_axis']||item;
						v = util.own(x_axis, cfg.x_field);

						v = util.own(item, cfg.x_field);
						if (cfg.x_format && util.isFunc(cfg.x_format)){
							// 参数说明: 记录对象, 当前值, 数据行, 数据行号
							v = cfg.x_format.call(ctx, v, val, item, id);
						}
						if (v !== UD) {val[c.x_property] = v;}
						var label_field = util.own(item, cfg.label_field);
						if(label_field){
							v = label_field;
						}
						if (cfg.label_format && util.isFunc(cfg.label_format)){
							// 参数说明: 记录对象, 当前值, 数据行, 数据行号
							v = cfg.label_format.call(ctx, v, val, item, id);
						}
						if (v !== UD) {cats.push(v);}

						d.data.push(val);
					}

				});

				util.each(list, function(serie){
					if (serie.data.length <= 0) {return;}
					serie.color = c.colors[series.length % c.colors.length];
					series.push(serie);
				});
			});

			if (cats.length > 0){
				this.$cats = cats;
			}
			series = cats = null;
			return this.$data;
		},
		// 设置网络请求参数
		setParam: function(param, replace){
			if (replace){
				this.setConfig('param', param);
			}else {
				this.extendConfig('param', param);
			}
			return this;
		},
		// 获取请求参数
		getParam: function(){
			if (this.getConfig('hasDateParam')){
				var ud;

				this.extendConfig('param', {
					'begindate': ud,
					'enddate': ud,
					'stastic_all_time': ud
				}, pubjs.getDate())
			}
			var param = this.getConfig('param');
			if (!param.site_id){
				param.site_id = pubjs.config('site_id');
			}
			return param;
		},
		/**
		 * 放弃正在进行的请求
		 * @return {Object} 模块实例
		 */
		abort:function(){
			var self = this;
			if (self.$ajax_id){
				pubjs.data.abort(self.$ajax_id);
				self.$ajax_id = null;
			}
			return self;
		},
		/**
		 * 指定参数加载远端数据
		 * @param  {Object} param <可选> 要提交到服务器端的GET参数
		 * @param  {Boolean} replace_param <可选> 是否替换请求参数
		 * @return {Boolean}      返回是否成功发出请求
		 */
		load: function(param, replace_param){
			var self = this;
			var c = self.getConfig();
			if (c.url){
				if (param){
					self.setParam(param, replace_param);
				}
				self.toggleLoading(true);
				self.abort();
				self.$ajax_id = pubjs.data[c.reqMethod](c.url, self.getParam(), self);
				return (self.$ajax_id > 0);
			}else {
				pubjs.error('Chart load data with no url!');
				return false;
			}
		},
		/**
		 * 服务器数据返回响应回调函数
		 * @param  {Object} err  请求错误信息对象
		 * @param  {Object} data 请求数据结果
		 * @return {Boolean}     返回false阻止事件冒泡
		 */
		onData: function(err, data){
			this.toggleLoading(false);
			if (err){
				this.setData(null);
				pubjs.alert(LANG('您的查询暂时不支持！'));
				return false;
			}
			this.setData(data.items);
			return false;
		},
		/**
		 * 对象销毁前处理函数, 调用chart对象的销毁函数销毁图表对象
		 * @return {None} 无返回
		 */
		beforeDestroy: function(){
			this.$chart.destroy();
			this.Super('beforeDestroy', arguments);
		},
		/**
		 * 时间改变的响应函数
		 * @param  {Object}  ev 消息对象
		 * @return {Boolean}    阻止广播
		 */
		onChangeDate:function(ev){
			// 重新加载数据, 日期参数在加载过程的获取参数时会合并更新
			if (this.getConfig('hasDateParam')){
				this.load();
			}
			return false;
		},
		getChart:function(){
			return this.$chart;
		},
		// 动态设置图表标题
		setTitle: function(title, sub_title){
			if (title){
				if (util.isString(title)){
					title = {
						'text': title,
						'align':'center',
						'y': 25,
						'style': {
							'font-family': "Microsoft YaHei",
							'font-size': '16px',
							'color': '#3E576F'
						}
					};
				}
			}else {
				title = null;
			}
			if (sub_title){
				if (util.isString(sub_title)){
					sub_title = {'text': sub_title, 'align':'center'};
				}
			}else {
				sub_title = null;
			}
			this.$chart.setTitle(title, sub_title);
			return this;
		},
		redraw: function(){
			this.$chart.redraw();
			return this;
		}
	});
	exports.base = Chart;


	/*****************************************
	 * 其他基本形状配置的Chart模块
	 *****************************************/


	// 直线图类型模块
	var Line = Chart.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'build': {
					'chart': {
						'defaultSeriesType': 'areaspline'
					},
					'xAxis': {
						'labels': {
							'step': 1,
							'rotation': -25,
							'align': 'right'
						}
					}
				}
			});
			this.Super('init', arguments);
		}
	});
	exports.line = Line;

	// pv直线图
	var PVLine = Line.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'colors': ['#FF005F', '#0EC900'],
				'series':[
					{'y_field':'pageviews', 'label_field':'hour', 'text':LANG('今天')},
					{'y_field':'pageviews2', 'label_field':'hour', 'text':LANG('昨天'), param: {dashStyle: "longdash"}}
				],
				'hasDateParam': false,
				'height': 300,
				'title': LANG('今日昨日PV对比'),
				'build': {
					'chart':{
						"margin":[50,30,60,60]
					},
					'xAxis': {
						'labels': {
							'rotation': 0,
							'align': 'left',
							'step':2
						}
					}
				}
			});
			this.Super('init', arguments);
		},
		onData:function(err, data){
			if (!err){
				util.each(data.items, function(item,index){
					var arr = item.y_axis,
						target = arr[0],
						resoure = arr[1];

					util.each(resoure, function(sub,i){
						target[i+"2"] = sub;
					})
					item.y_axis = target;
				});
			}
			this.Super('onData', [err, data]);
		}
	});
	exports.pvLine = PVLine;

	// 柱状图
	var Bar = Chart.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'build': {
					'chart': {
						'defaultSeriesType': 'column'
					},
					'xAxis': {
						'labels': {
							'step':1,
							'rotation': -25,
							'align': 'right'
						}
					}
				}
			});
			this.Super('init', arguments);
		}
	});
	exports.bar = Bar;


	// 饼图
	var Pie = Chart.extend({
		init:function(config){
			config = pubjs.conf(config, {
				"build": {
					"chart":{
						"defaultSeriesType":"pie"
						,"height":300
					}
					,"tooltip":{
						'formatter': function() {
							return '<b>'+ this.point.name +'</b>: '+ util.round0(this.percentage,2) +' %';
						}
						,"crosshairs":null
						,"shared":false
					}
					// @todo 新版是否要用新的配色？
					// 产品的蛋疼需求要跟旧版的配色一致……
					,"colors":["#4572A7","#AA4643","#89A54E","#80699B","#3D96AE","#DB843D","#92A8CD","#A47D7C","#B5CA92"]
					,"plotOptions":{
						"pie": {
							"allowPointSelect":true
							,"cursor":"pointer"
							,"dataLabels":{
								 enabled: true
							}
						}
					}
				}
				,"x_property":"name"
			});
			this.Super('init', arguments);
		}
	});
	exports.pie = Pie;

	// 圆柱图
	var Column = Chart.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'build': {
					'chart': {
						'defaultSeriesType': 'column'
					}
					,"plotOptions": {
						'column': {
							'pointPadding': 0.1,  //图表柱形的
							'borderWidth': 1      //图表柱形的粗细
						},'bar': {
							'dataLabels': {
								'enabled': false
							}
						}
					}
					,'xAxis':{
						'labels':{
							'rotation':-45
							,'y':50
						}
					}

				},
				"x_property":"name"
			});
			this.Super('init', arguments);
		}
	})
	exports.column = Column;

	// 兼容处理 -潜在关键字 去掉null的数据
	var ColumnKeyword = Column.extend({
		setData: function(data){
			// 去掉为null的数据
			var newData = [];
			util.each(data, function(val,i){
				if(val['x_axis']['prekeyword_name']!= null){
					newData.push(val);
				}
			});
			this.Super('setData', [newData]);
		}
	});
	exports.columnKeyword = ColumnKeyword;
})