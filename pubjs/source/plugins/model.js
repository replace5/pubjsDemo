/**
 * 数据模块基类
 */
define(function(require, exports){
	var ModelBase, ModelProp, ModelCBID=0;
	var Model = null;
	var noop, UDF;
	var util = require('../core/util');

	function normalize(uri){
		if (!uri){
			return '/';
		}else if (uri.charAt(0) != '/'){
			return '/' + uri;
		}else {
			return uri;
		}
	}
	function define_module(){
		Model = noop.extend({
			// 构造函数
			CONSTRUCTOR: function(config, parent){
				this.init(config, parent);
			},
			/**
			 * 初始化模型实例
			 * @param  {Object} config <可选> 实例初始化对象
			 * @param  {Object} parent <可选> 父模块实例
			 * @return {None}
			 */
			init: function(config, parent){
				var self = this;
				// 父模块实例
				self.$parent = (parent instanceof Model) ? parent : null;
				// 实例相对根目录
				self.$root = config && config.root || '';
				// 数据存储
				self.$data = config && config.data || UDF;
				// 事件绑定列表
				self.$bind = {};
				// 字实例列表
				self.$child = {};
				// 错误计数器
				self.$error = 0;
			},
			/**
			 * 设置属性值
			 * @param  {String} uri   属性URI
			 * @param  {Mix}    value 属性值
			 * @return {Object}       返回链式调用指针
			 */
			set: function(uri, value){
				var self = this;
				uri = normalize(uri);
				if (self.$parent){
					if (uri === '/'){ uri = ''; }
					self.$parent.set(self.$root + uri, value);
					return self;
				}
				self._prepare(uri, true);
				if (ModelBase){
					var last = ModelBase[ModelProp];
					var type = util.has(ModelBase, ModelProp) ? 'update' : 'create';
					// 更新值
					ModelBase[ModelProp] = value;
					// 触发更新事件
					self._trigger(uri, type, value, last);
					ModelBase = ModelProp = last = null;
				}else {
					self.$error++;
				}
				return self;
			},
			/**
			 * 获取传址属性值 (可被外部修改)
			 * @param  {String} uri 属性URI
			 * @param  {Mix}    def <可选> 属性不存在时返回的默认值
			 * @return {Mix}        返回读取到的属性值或默认值
			 */
			get: function(uri, def){
				var self = this;
				uri = normalize(uri);
				if (self.$parent){
					if (uri === '/'){ uri = ''; }
					return self.$parent.get(self.$root + uri, def);
				}
				self._prepare(uri);
				if (ModelBase && util.has(ModelBase, ModelProp)){
					// 克隆对象, 防止被外部污染
					return ModelBase[ModelProp];
				}
				return def;
			},
			/**
			 * 获取传值形式的属性值
			 * @param  {String} uri 属性URI
			 * @param  {Mix}    def <可选> 属性不存在时返回的默认值
			 * @return {Mix}        返回读取到的属性值或默认值
			 */
			val: function(uri, def){
				var data = this.get(uri, def);
				if (data){
					return util.clone(data);
				}else {
					return data;
				}
			},
			/**
			 * 删除属性
			 * @param  {String} uri    属性URI
			 * @param  {Bool}   silent <可选> 静默删除, 不触发删除事件
			 * @return {Object}        返回链式调用指针
			 */
			remove: function(uri, silent){
				var self = this;
				uri = normalize(uri);
				if (self.$parent){
					if (uri === '/'){ uri = ''; }
					self.$parent.remove(self.$root + uri);
					return self;
				}
				self._prepare(uri);
				if (ModelBase && util.has(ModelBase, ModelProp)){
					var last = ModelBase[ModelProp];
					delete ModelBase[ModelProp];
					self._trigger(uri, 'remove', UDF, last);
					last = null;
				}else {
					self.$error++;
				}
				ModelBase = ModelProp = null;
				return self;
			},
			/**
			 * 设置默认值
			 * @param {Number} deep <可选> 合并深度
			 * @param {String} uri  <可选> 节点URI
			 * @param {Object} data 默认值对象
			 * @param ...
			 * @return {Model}      返回模块本身
			 */
			setDefault: function(){
				var args = util.argsToArray(arguments);
				var deep = util.isNumber(args[0]) ? args.shift() : -1;
				var uri = util.isString(args[0]) ? args.shift() : '/';

				if (args.length){
					// 合并默认值
					var data = this.get(uri);
					args.unshift(deep, {});
					args.push(data);
					data = util.extend.apply(util, args);
					this.set(uri, data);
				}
				return this;
			},
			/**
			 * 扩展指定URI下的值
			 * @param  {Number} deep <可选> 合并深度
			 * @param  {String} uri  <可选> 节点URI
			 * @param  {Object} data 新合并对象值
			 * @param  ...
			 * @return {Model}       返回模块本身
			 */
			extend: function(){
				var args = util.argsToArray(arguments);
				var deep = util.isNumber(args[0]) ? args.shift() : -1;
				var uri = util.isString(args[0]) ? args.shift() : '/';

				if (args[0]){
					var value = this.get(uri);
					args.unshift(deep, value);
					value = util.extend.apply(util, args);
					return this.set(uri, value);
				}else {
					return this;
				}
			},
			/**
			 * 绑定事件
			 * @param  {String}   uri      触发事件的属性URI
			 * @param  {Function} callback 事件回调函数
			 * @param  {Mix}   data     <可选> 事件回调函数的附加data参数
			 * @param  {Object}   context  <可选> 回调函数的运作作用域, 默认为模型实例
			 * @return {Object}            返回链式调用指针
			 */
			bind: function(uri, callback, data, context){
				var self = this;
				uri = normalize(uri);
				if (!(callback instanceof Function)){
					self.$error++;
					return self;
				}
				var binds = self.$bind[uri] || [];
				var bind = {
					'id': ++ModelCBID,
					'uri': uri,
					'callback': callback,
					'data': data,
					'context': context || self,
					'model': self
				};
				binds.push(bind);
				self.$bind[uri] = binds;

				// 同步添加绑定到父模型对象中
				if (self.$parent){
					if (uri === '/'){ uri = ''; }
					self.$parent._bind(self.$root + uri, bind);
				}
				return self;
			},
			lastBindId: function(){
				return ModelCBID;
			},
			/**
			 * 解除绑定事件
			 * @param  {String}   uri      触发事件的属性URI
			 * @param  {Function} callback <可选> 解除的指定回调函数
			 * @return {Object}            返回链式调用指针
			 */
			unbind: function(uri, callback){
				var self = this;
				uri = normalize(uri);
				var binds = self.$bind[uri];
				if (binds){
					if (callback){
						for (var i=binds.length; --i>=0;){
							if (binds[i].callback === callback){
								// 符合条件, 移除绑定记录
								binds.splice(i, 1);
							}
						}
					}else {
						binds.splice(0, binds.length);
					}
				}

				// 同步解除父模型中的绑定
				if (self.$parent){
					if (uri === '/'){ uri = ''; }
					self.$parent.unbind(self.$root + uri, callback);
				}
				return self;
			},
			unbindById: function(id){
				var self = this;
				if (id){
					var binds, list = self.$bind;
					for (var uri in list){
						if (binds = list[uri]){
							for (var i=binds.length; --i>=0;){
								if (binds[i].id === id){
									binds.splice(i, 1);
								}
							}
						}
					}
				}
				// 同步解除父模型中的绑定
				if (self.$parent){
					self.$parent.unbindById(id);
				}
				return self;
			},
			/**
			 * 生成指定URI为起点的模型实例
			 * @param  {String} root 根节点URI, 必须以 "/" 开始的非根节点字符串
			 * @return {Object}      返回新的模型实例对象
			 */
			extract: function(root){
				if (!root || root.length < 2 || root.charAt(0) !== '/'){
					return null;
				}else {
					var mod = new Model({'root': root}, this);
					var childs = this.$child[root] || (this.$child[root] = []);
					childs.push(mod);
					return mod;
				}
			},
			/**
			 * 销毁当前模型对象, 移除父模型中的事件绑定与关联
			 * @return {None}
			 */
			destroy: function(){
				var self = this;
				var parent = self.$parent;
				if (parent){
					var root = self.$root;
					// 解除事件绑定
					util.each(self.$bind, function(bind){
						parent.unbind(root + bind.uri, bind.callback);
					});
					// 解除实例关联
					var childs = parent.$child[root];
					if (childs){
						var len = childs.length;
						while (len--){
							if (childs[len] === self){
								childs.splice(len, 1);
							}
						}
					}
					self.$parent = null;
				}
			},
			/**
			 * 返回错误计数, 并清空错误计数器
			 * @return {Number} 返回之前操作的错误计数
			 */
			error: function(){
				var err = this.$error;
				this.$error = 0;
				return err;
			},
			_bind: function(uri, bind){
				var self = this;
				var binds = self.$bind[uri] || [];
				binds.push(bind);
				self.$bind[uri] = binds;
				if (self.$parent){
					self.$parent._bind(self.$root + uri, bind);
				}
			},
			_trigger: function(uri, type, current, last){
				var self = this;
				if (self.$parent){
					return self.$parent._trigger(self.$root + uri, type, current, last);
				}
				// 触发绑定事件
				var binds = self.$bind;
				var param = {
					'uri': null,		// 绑定URI
					'data': null,		// 绑定参数
					'model': null,		// 事件绑定模型实例
					'type': type,		// 事件类型
					'value': current,	// 当前值
					'last': last,		// 原始值
					'absolute': uri,	// 绝对URI
					'relative': ''		// 相对URI, ''表示当前URI
				};
				// 1. 触发当前URI绑定事件
				if (binds[uri]){
					if (self._runEvent(param, binds[uri])){
						return true;
					}
				}
				// 2. 触发URI的子层绑定事件 (todo)
				// 3. 触发父层的绑定事件
				if (uri === '/'){ return true; }
				var pos, relative = '';
				while (uri.length > 1){
					pos = uri.lastIndexOf('/');
					relative = uri.slice(pos+1) + '/' + relative;
					uri = pos>0 ? uri.substr(0, pos) : '/';

					if (binds[uri]){
						param.relative = relative.slice(0, -1);
						if (self._runEvent(param, binds[uri])){
							return true;
						}
					}
				}
			},
			_runEvent: function(param, list){
				var ret, bind, i=list.length, block=false;
				while (i>0){
					bind = list[--i];
					param.uri = bind.uri;
					param.data = bind.data;
					param.model = bind.model;
					ret = bind.callback.call(bind.context, param);
					if (ret === 2 || ret === 3){
						block = true;
					}
					if (ret === 1 || ret === 1){
						break;
					}
				}
				return block;
			},
			_prepare: function(uri, create){
				var self = this;
				if (self.$parent){
					return self.$parent._prepare(self.$root + uri, create);
				}
				// 分解URI, 查找对应的记录
				ModelBase = self;
				ModelProp = '$data';
				if (uri === '/'){
					return true;
				}
				try {
					if (uri.charAt(0) !== '/' || uri.indexOf('//') != -1){
						throw null;
					}
					var ns = uri.split('/');
					ns.shift(); // 过滤开始根目录左边的空白
					while (ns.length){
						if (create && ModelBase[ModelProp]===UDF){
							ModelBase[ModelProp] = {};
						}
						ModelBase = ModelBase[ModelProp];
						ModelProp = ns.shift();
						if (ModelBase && typeof(ModelBase) === 'object'){
							if (ModelBase instanceof Array && isNaN(+ModelProp)){
								throw null;
							}
						}else {
							throw null;
						}
					}
				}catch (e){
					ModelBase = ModelProp = null;
					return false;
				}
				return true;
			}
		});
	}

	/**
	 * 模块配置模型生成功能函数
	 * @param  {Number} deep          <可选> 默认合并深度
	 * @param  {Object} config        配置对象 / 配置Modle实例
	 * @param  {Object} default_value 默认配置属性对象
	 * @param  {Object} ...           <可选> 更多的默认配置
	 * @return {Model}                返回配置对象Model实例
	 */
	function conf(){
		var args = util.argsToArray(arguments);
		var deep = util.isNumber(args[0]) ? args.shift() : -1;
		var config = args.shift();

		if (!config){
			config = args.shift();
		}
		if (!(config instanceof Model)){
			config = new Model({data: config});
		}
		if (args.length){
			args.unshift(deep, '/');
			config.setDefault.apply(config, args);
		}
		return config;
	}


	exports.plugin_init = function(pubjs, callback){
		if (!Model){
			noop = pubjs.noop;
			define_module();
			pubjs.Model = exports.Model = Model;
			pubjs.store = exports.store = new Model();
			pubjs.conf = exports.conf = conf;
		}
		callback();
	}
});