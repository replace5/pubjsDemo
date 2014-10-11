define(function(require, exports){
	var $ = require("jquery"),
		raphael = require('../../libs/raphael/raphael.2.1.0'),
		mapset = require("./mapset"),
		pubjs = require('../../core/pub'),
		util = require('../../core/util'),
		view = require('../view');

	/**
	 * 绘图函数
	 * @param  {String}   path     描图路径数据字符串
	 * @param  {Object}   attr     描图路径的样式设置
	 * @return {Object}            绘制完后的raphael图形对象
	 * @private
	 */
	function _draw(path, attr){
		attr = attr || this.getConfig('attr');
		path = this.$svg.path(path);
		path.attr(attr);
		return path;
	}

	/**
	 * 地图路径的固有尺寸
	 * svg无法根据用户设置的大小自动缩放尺寸，所以需要有一个基准尺寸来设定地图路径
	 *
	 * （¯﹃¯）
	 * 乖，听话，不要改变这个设定，除非你想重写mapset模块中的mapData对象中的所有path数据
	 *
	 * @type {Object}
	 */
	var DEFAULT_SET = {
		"width":480
		,"height":380
	};
	var ZOOM_MODE  = 0;
	var ZOOM_RATIO = 4;

	var Map = view.widget.extend({
		init: function(config){
			config = pubjs.conf(config, {
				// 是否马上绘制
				"atOnce":1,
				// 国家地图
				"type":"china",
				"width":480,
				"height":400,
				// 地图渲染配置
				"attr":{
					"fill":"#f5f5f5",
					"stroke":"#ddd",
					"stroke-width":1,
					"stroke-linejoin":"round",
					"cursor":"pointer"
				},
				// 地图区域激活时的效果
				"actAttr":{
					// "fill":"#fcc",
					"stroke": "#555",
					"stroke-width":2
				},
				// 动画延迟时间
				"animDelay":300,
				'hasHoverAnimation': true,
				// 地图是否具备事件响应
				"bindEvent":0,
				// 能响应的事件处理对象
				// 多事件响应的话请用空格分隔事件类型
				"events":"click",
				// 地图绘制前的操作
				"beforDraw":null
			});
			this.Super('init', arguments);
		},
		// 布局构造完成, 开始构造模块
		afterBuild: function(layout){
			var self = this;
			var conf = self.getConfig();

			// 常规|缩放
			var size_zoom = ZOOM_MODE ? ZOOM_RATIO : 1;

			// 地图宽高设定
			var w = conf.width * size_zoom,
				h = conf.height * size_zoom;

			// 地图主raphael svg对象。真正的svg对象是该对象中的canvas
			var tar = self.getContainer('map').get(0);

			// 地图图形对象缓存
			self.$states = {};

			// 构建图形库对象
			self.$svg = raphael(tar, w, h);

			// 缩放初始数值相关计算
			if (w * DEFAULT_SET.height > h * DEFAULT_SET.width){
				conf.scale = DEFAULT_SET.height/h;
				conf.viewWidth = conf.scale*w;
				conf.viewHeight = DEFAULT_SET.height;
				conf.left = Math.round((DEFAULT_SET.width - conf.viewWidth)/2);
				conf.top = 0
			}else {
				conf.scale = DEFAULT_SET.width/w
				conf.viewWidth = DEFAULT_SET.width;
				conf.viewHeight = conf.scale*h;
				conf.top = Math.round((DEFAULT_SET.height - conf.viewHeight)/2);
				conf.left = 0;
			}

			self.$svg.setViewBox(conf.left, conf.top, conf.viewWidth, conf.viewHeight,false);

			if(conf.bindEvent){
				// 事件绑定
				self.uiBind(tar, conf.events, self.eventHandler);
			}

			// 当前选中的区域
			self.$currentPath = null;
			self.$animation = raphael.animation(conf.actAttr, conf.animDelay);
			if (conf.hasHoverAnimation){
				self.$stateHoverFn = function(evt){
					var tar = $(evt.target),
						pos = tar.offset(),
						box = this.getBBox(),
						x = pos.left + box.width/2,
						y = pos.top + box.height/2;
					self.removeSelected();
					self.$currentPath = this;
					this.toFront().animate(self.$animation);
					self.fire("mapHover", {
						"x":x, "y":y, "el":tar,
						"data": this.data('name')
					});
				};
			}

			if(conf.atOnce){
				self.draw();
			}
		}
		/**
		 * 事件分发函数
		 * @param  {Object}    evt 鼠标事件
		 * @return {Undefined}     无返回值
		 */
		,eventHandler:function(evt, elm){
			var type = "event"+util.ucFirst(evt.type);
			if (util.isFunc(this[type])){
				return this[type](evt, elm);
			}
		}
		/**
		 * 绘制地图
		 * @param  {String}    type       国家
		 * @param  {Function}  callback   绘制完成后的回调
		 * @return {Undefined}            无返回值
		 */
		,draw:function(type, callback){
			var self = this;
			var c = self.getConfig();
			var mData = mapset.get(type || c.type);

			if(mData){
				// 检索到有对应的地图数据时
				if(type){
					c.type = type;
				}else {
					type = c.type;
				}

				// 绘制前的前期处理函数入口
				if(util.isFunc(c.beforDraw)){
					c.beforDraw.call(self,mData);
				}
				var states = self.$states[type];
				if (!states){
					states = self.$states[type] = {};
				}

				// 循环生成
				for(var state in mData){
					states[state] = _draw.call(self, mData[state].path, mData[state].attr);
					states[state].data('name', state);
					if (self.$stateHoverFn){
						states[state].hover(self.$stateHoverFn);
					}
				}

				// 回调
				if(util.isFunc(callback)){
					callback.call(states, state, mData);
				}

				// 兼容处理
				self.$svg.safari();
			}
		}
		/**
		 * 取消选中的省份状态
		 * @return {None}
		 */
		,removeSelected: function(){
			var path = this.$currentPath;
			if(path){
				this.$currentPath = null;
				path.stop().animate(this.getConfig('attr'), 100);
			}
		}
		/**
		 * 点击处理函数, 单击选中省份
		 * @param  {Object} evt jQuery事件对象参数
		 * @return {Undefined}
		 */
		,eventClick:function(evt, elm){
			var self = this;
			var path = elm;
			if (path && (path.nodeName == "path"||path.nodeName == "shape") && path.raphael){
				path = self.$svg.getById(path.raphaelid);
				if(path){
					// 清除其他选择
					self.removeSelected();

					// 缓存当前对象属性
					self.$currentPath = path;

					path.toFront().animate(self.$animation);
					self.fire("mapClick", {
						"x":evt.pageX, "y":evt.pageY, el:$(elm),
						"data":path.data("name")
					});
				}
			} else {
				self.fire('noPathClick');
			}
		}
		/**
		 * 获取数据
		 * @return {mix} 对应的数据
		 */
		,getData:function(key){
			var path = this.$currentPath;
			if(path && key){
				return path.data(key);
			}else{
				return null;
			}
		}
		/**
		 * 设定地域数据
		 * @param {Object} data 地域数据
		 */
		,setData:function(data){}
		/**
		 * 重置模块
		 * @return {Object} 实例本身
		 */
		,reset:function(){
			this.$svg.clear();
			this.$states = {};
			this.draw();
			return this;
		}
		/**
		 * 加载数据
		 * @param  {Object}    param 请求参数
		 * @return {Undefined}       无返回值
		 */
		,load:function(param){}
	});
	exports.base = Map;

});