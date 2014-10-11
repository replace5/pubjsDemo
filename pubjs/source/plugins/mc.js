/**
 * 消息中心模块插件
 *   实现与服务器的WebSocket 消息发送与接收
 */
define(function(require, exports, module){
	var $ = require('jquery');
	var app = null;
	var host_regx = /^([a-z0-9]+):\/\/([^\/]+)[\/]?(.+)?$/i;

	var util = require('util');
	var io = require('@libs/socket.io/socket.io.min.js');

	function define_class(func, proto){
		for (var p in proto){
			if (proto.hasOwnProperty(p)){
				func.prototype[p] = proto[p];
			}
		}
		return func;
	}

	// 支持协议定义
	var hostProtocol = {
		// WebSocket远程连接
		"websocket": define_class(
			function(cfg){
				cfg['force new connection'] = true;
				this.$io = io.connect(cfg.url, cfg);
			},
			{
				isDown: function(){
					return (!this.$io.socket.connected && !this.$io.socket.connecting);
				},
				connect: function(){
					this.$io.socket.reconnect();
					return this;
				},
				send: function(data){
					this.$io.send(JSON.stringify(data));
					return this;
				},
				on: function(type, callback){
					// message
					this.$io.on(type, callback);
					return this;
				}
			}
		),
		// Local本地消息
		"local": define_class(
			function(cfg){
				this.$message_cbs = false;
			},
			{
				isDown: function(){ return false; },
				connect: function(){ return this; },
				send: function(data){
					var cbs = this.$message_cbs;
					if (cbs){
						for (var i=0; i<cbs.length; i++){
							cbs[i](data);
						}
					}
					return this;
				},
				on: function(type, callback){
					if (type == 'message'){
						var cbs = this.$message_cbs;
						if (cbs){
							cbs.push(callback);
						}else {
							this.$message_cbs = [callback];
						}
					}
					return this;
				}
			}
		),
		// 静态测试文件消息
		"file": define_class(
			function(cfg){
				// 文件路径
				this.$base = cfg.base;
				this.$message_cbs = false;
			},
			{
				isDown: function(){ return false; },
				connect: function(){ return this; },
				send: function(data){
					// 拼凑静态文件路径
					var url = this.$base + data.name + '.json';

					var mid = data.mid;
					var cbs = this.$message_cbs;
					$.getJSON(url, function(data){
						// 支持发送多数据 @todo 不太理解？
						data = [data];

						$.each(data, function(idx, val){
							// 拼凑dispatchMessage解析结构
							var item = {
								mid: mid,
								data: val
							}
							for (var i=0; i<cbs.length; i++){
								cbs[i](item);
							}
						})
					})
					return this;
				},
				// @todo 要修改不?
				on: function(type, callback){
					if (type == 'message'){
						var cbs = this.$message_cbs;
						if (cbs){
							cbs.push(callback);
						}else {
							this.$message_cbs = [callback];
						}
					}
					return this;
				}
			}
		)
	};

	// 解析uri数据
	function resolve_uri(uri){
		var self = this;
		var maps = self.$uri_maps;
		var list;
		if (maps.hasOwnProperty(uri)){
			uri = maps[uri];
		}else {
			var config = self.$config;
			var key = uri;
			if (uri.charAt(0) != '/'){
				uri = config.uri_prefix + uri;
			}

			// 转换uri到完整的节点
			var item;
			list = self.$prefix;
			for (var i=0; i<list.length; i++){
				item = list[i];
				if (uri.indexOf(item.from) === 0){
					uri = uri.replace(item.from, item.uri);
					break;
				}
			}
			maps[key] = uri;
		}

		// 分析uri结构, 提取remote信息
		list = host_regx.exec(uri)
		if (list){
			return {
				"uri": uri,
				"host": list[1],
				"name": list[2],
				"action": list[3] || null
			};
		}
		return false;
	}

	// 获取远程节点对象
	function get_remote(request){
		var self = this;
		var remote;
		var pools = self.$remotes;
		var remotes = self.$config.remotes;
		var name = request.host;

		if (pools.hasOwnProperty(name)){
			// 使用已缓存的连接
			remote = pools[name];
		}else if (remotes && remotes.hasOwnProperty(name)){
			// 使用配置信息创建连接
			var cfg = remotes[name];
			remote = pools[name] = new hostProtocol[cfg.type](cfg);
			remote.on('message', function(message){
				dispatchMessage.call(self, message, name);
			});
		}else {
			// 没有找到指定远程节点配置
			return false;
		}

		// 检查连接状态
		if (remote.isDown()){
			remote.connect();
		}
		return remote;
	}

	// 发送消息
	function sendMessage(message){
		var self = this;
		var req = resolve_uri.call(self, message.uri);
		if (!req){
			triggerError(message, 601, "Parse URI Error");
		}else {
			var remote = get_remote.call(self, req);
			if (remote){
				// 判断是否有回调事件
				if (message.callback){
					self.$callbacks[message.mid] = {
						"mid": message.mid,
						"uri": message.uri,
						"callback": message.callback,
						"param": message.param
					};
				}
				// 发送消息
				remote.send({
					"mid": message.mid,
					"type": message.type,
					"name": req.name,
					"action": req.action,
					"data": message.data
				});
			}else {
				triggerError(message, 602, "Remote Not Found");
			}
		}
	}

	// 读取消息队列中的数据, 处理每个请求数据
	function processMessage(){
		var self = this;
		var queues = self.$queues;
		while (queues.length){
			sendMessage.call(self, queues.shift());
		}
		self.$processQueueId = 0;
	}

	// 分发处理消息数据
	function dispatchMessage(message, host){
		if (message && 'string' == typeof(message)){
			try {
				message = JSON.parse(message);
			}catch (err){
				app.error({
					"code": 610,
					"message": "Parse Data Error",
					"data": message
				});
			}
		}

		var uri = host + '://' + message.name;
		if (message.action){
			uri += '/' + message.action;
		}

		var self = this;
		// 触发监听的回调
		var cb = self.$callbacks[message.mid];
		if (cb){
			delete self.$callbacks[message.mid];
			cb.callback.call(cb, message.error, message.data);
		}

		// 触发绑定uri的消息
		var maps = self.$uri_maps;
		var binds = self.$binds;
		var list, bind, i;
		for (bind in binds){
			i = maps[bind];
			// uri地址匹配, 完全匹配或部分uri匹配
			if (i == uri || (uri.charAt(i.length) == '/' && uri.indexOf(i) === 0)){
				list = binds[bind];
				for (i=0; i<list.length; i++){
					cb = list[i];
					if (++cb.count === 0){
						// 回调计数达到限制, 从绑定记录重删除
						list.splice(i, 1);
						i--;
					}
					// 回调
					cb.callback.call(cb, null, message.data);
				}
				// 检查是否回调列表为空列表
				if (list.length === 0){
					delete binds[bind];
				}
			}
		}
	}

	// 标准回调函数触发错误
	function triggerError(listener, code, message){
		if (listener && listener.callback){
			listener.callback.call(
				listener, {"code": code, "message": message}, null
			);
		}
	}

	// 消息中心核心模块
	function MessageCenter(config_path){
		var self = this;
		// 模块配置
		self.$config = util.extend(1, {
			"uri_prefix": "/msg/",
			"prefix":{},
			"remotes":{}
		}, app.config(config_path));

		// 远程节点
		self.$remotes = {};

		// 事件绑定记录
		self.$binds = {};

		// uri映射表
		self.$uri_maps = {};

		// 请求等待队列
		self.$queues = [];

		// 回调请求数据
		self.$callbacks = {};

		// 唯一的消息编号
		self.$message_id = 0;

		// 消息发送计时器ID
		self.$processQueueId = 0;

		// 读取系统配置数据节点
		var prefix = self.$prefix = [];
		var list = self.$config.prefix;
		if (list){
			var key, val, kf, vf;
			for (key in list){
				val = list[key];
				if (key.charAt(0) != '/'){
					key = '/' + key;
				}
				kf = (key.substr(-1) == '/');
				vf = (val.substr(-1) == '/');
				if (!kf && vf){
					key += '/';
				}
				if (!vf && kf){
					val += '/';
				}
				prefix.push({'from': key, 'uri': val});
			}
			// 排序节点
			prefix.sort(function(a,b){
				if (a.from.length == b.from.length){
					return (a.from > b.from);
				}else {
					return (a.from.length <= b.from.length);
				}
			});
		}
	}
	define_class(MessageCenter, {
		on: function(uri, callback, param, count){
			var self = this;
			var binds = self.$binds;
			var list = binds[uri];
			if (!list){
				if (!resolve_uri.call(self, uri)){
					// 不能解析uri记录不能绑定
					return self;
				}
				list = binds[uri] = [];
			}
			list.push({
				"uri": uri,
				"callback": callback,
				"param": param,
				"count": count || 0
			});
			return self;
		},
		once: function(uri, callback, param){
			return this.on(uri, callback, param, -1);
		},
		off: function(uri, callback){
			var binds = this.$binds;
			var list = binds[uri];
			if (list && list.length){
				var i = list.length;
				if (callback){
					for (;i>0;){
						if (list[--i].callback === callback){
							list.splice(i, 1);
						}
					}
					if (list.length === 0){
						delete binds[uri];
					}
				}else {
					delete binds[uri];
				}
			}
			return this;
		},
		send: function(uri, data, callback, param){
			if (!uri){
				return 0;
			}

			if (util.isFunc(data)){
				param = callback;
				callback = data;
				data = null;
			}

			// 消息存入待发送消息队列
			var self = this;
			param = {
				"type": 'message',
				"mid": ++self.$message_id,
				"uri": uri,
				"data": data || null,
				"callback": callback || null,
				"param": param || null
			};
			self.$queues.push(param);

			if (!self.$processQueueId){
				self.$processQueueId = setTimeout(
					function(){processMessage.call(self)}, 0
				);
			}

			return param.mid;
		},
		abort: function(message_id, silent){
			var self = this;
			// 查找消息队列中是否有未发送的消息
			var queues = self.$queues;
			for (var id=queues.length; --id>=0;){
				if (queues[id].mid < message_id){
					break;
				}else if (queues[id].mid == message_id){
					queues.splice(id, 1);
					return self;
				}
			}
			// 查找已发送的回调请求
			if (self.$callback[message_id]){
				var cb = self.$callback[message_id];
				delete self.$callback[message_id];

				if (!silent){
					// 触发回调函数
					triggerError(cb, 600, "User Abort");
				}

				// 发送取消消息
				sendMessage.call(
					self, {"mid": cb.mid, "uri": cb.uri, "type":"abort"}
				);
			}
		},
		emit: function(uri, error, data){
			var self = this;
			var binds = self.$binds;
			var list, cb, i;
			for (i in binds){
				// uri地址匹配, 完全匹配或部分uri匹配
				if (i == uri || (uri.charAt(i.length) == '/' && uri.indexOf(i) === 0)){
					list = binds[i];
					for (i=0; i<list.length; i++){
						cb = list[i];
						if (++cb.count === 0){
							// 回调计数达到限制, 从绑定记录重删除
							list.splice(i, 1);
							i--;
						}
						// 回调
						cb.callback.call(cb, error, data);
					}
					// 检查是否回调列表为空列表
					if (list.length === 0){
						delete binds[i];
					}
				}
			}
			return self;
		}
	});

	// 插件初始化方法
	exports.plugin_init = function(pubjs, next){
		app = pubjs;
		pubjs.mc = new MessageCenter('app/mc');
		window.pubjs = pubjs;
		next();
	}
})