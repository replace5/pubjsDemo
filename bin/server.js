var http = require('http');
var fs = require('fs');
var config_file = './config.json';
var router;
var server;
var SERVER_CONF = {
	port: 8080
};

var TYPES = {
	'png': 'image/png',
	'gif': 'image/gif',
	'jpg': 'image/jpeg',
	'jpeg': 'image/jpeg',
	'json': 'application/json',
	'js': 'application/x-javascript',
	'css': 'text/css',
	'html': 'text/html',
	'htm': 'text/html',
	'ico': 'image/x-icon'
};
var Running = false;

function loadConfig(){
	try {
		var data = fs.readFileSync(config_file, {encoding: 'utf8'});
		//data = JSON.parse(data);
		data = (new Function('return ' + data))();
		router = data;

		// 提出服务器配置选项
		if (data.server && JSON.stringify(data.server) != JSON.stringify(SERVER_CONF)){
			SERVER_CONF = data.server;

			// 重启服务器
			startServer();
		}
		delete data.server;

		// 修正根目录
		var cfg, path, dir;
		for (var site in data){
			cfg = data[site];
			if (cfg.root && cfg.local){
				for (dir in cfg.local){
					path = cfg.local[dir];
					if (!/^\/|[a-z]:/i.test(path)){
						cfg.local[dir] = cfg.root + path;
					}
				}
			}
		}
		return true;
	}catch (e){
		console.log('读取服务器配置错误', e);
	}
	return false;
}

if (loadConfig()){

	fs.watchFile(
		config_file,
		{ persistent: true, interval: 1000 },
		function (curr, prev) {
			// 监控配置文件的修改
			console.log('Reload config..');
			loadConfig();
		}
	);


	server = http.createServer(function (req, res) {
		// console.log(req.headers);
		var config = null;
		var domain = req.headers.host.split(':').shift();
		if (domain){
			domain = domain.toLowerCase();
			config = router[domain] || null;
		}
		if (!config){
			// 检查别名与绑定默认第一个配置
			var first = null, i;
			for (config in router){
				config = router[config];
				if (!first){
					first = config;
				}

				// 匹配别名
				if (config.alias){
					for (i=config.alias.length; i>0;){
						if (config.alias[--i] == domain){
							i = true;
							break;
						}
					}
					if (i === true){
						break;
					}
				}
				config = null;
			}
			if (!config){
				config = first;
			}
		}
		if (!config){
			res.end('SunFeith Frontend HTTP Server Ready!');
			return;
		}

		// 检查是否本地目录
		for (var path in config.local){
			if (req.url.indexOf(path) === 0){
				path = req.url.replace(path, config.local[path]).split('?').shift();
				// 读取本地文件
				if (fs.existsSync(path) && fs.statSync(path).isFile()){
					var stream = fs.createReadStream(path);
					console.log('Local File: %s', path);

					// 生成对应的content-type
					var ext = path.split('.');
					ext = ext.length > 1 ? ext.pop().toLowerCase() : '';
					if (ext && TYPES[ext]){
						res.setHeader('content-type', TYPES[ext]);
					}

					stream.pipe(res);
					return;
				}else {
					console.log('Miss Local File: %s', req.url);
				}
			}
		}

		// 远程服务请求
		var options = {
			hostname: config.ip || config.host,
			port: config.port || 80,
			path: req.url,
			method: req.method,
			headers: {
				'host': config.host
			}
		};
		var headers = req.headers;
		for (var name in headers){
			switch (name){
				case 'cookie':
				case 'referer':
				case 'content-length':
				case 'content-type':
					options.headers[name] = headers[name];
					break;
			}
		}

		console.log('Fetching Remote: http://%s:%d%s', config.host, config.port, req.url);
		var remote = http.request(options, function(remote_res){
			var headers = remote_res.headers;
			var res_headers = {};

			console.log('Remote Return: [%d] http://%s:%d%s', remote_res.statusCode, config.host, config.port, req.url);

			// 转发HTTP头信息
			res_headers['X-REMOTE-INFO'] = config.host + ':' + config.port + req.url + (config.ip ? ' ['+config.ip+']' : '');
			for (var name in headers){
				switch (name){
					case 'location':
						res_headers[name] = headers[name].replace('http://'+config.host, '');
						break;
					case 'content-type':
					case 'content-disposition':
						res_headers[name] = headers[name];
						break;
				}
			}

			// 替换远程cookie
			var cookies = headers['set-cookie'];
			switch (typeof(cookies)){
				case 'string':
					res_headers['set-cookie'] = cookies.replace(config.host, domain);
					break;
				case 'object':
					var setCookie = [];
					for (var i in cookies){
						setCookie.push(cookies[i].replace(config.host, domain));
					}
					res_headers['set-cookie'] = setCookie;
					break;
			}

			// 转发远程响应HTTP代码
			var code = remote_res.statusCode;
			res.writeHead(code == 404 ? 200 : code, res_headers);

			// 检查是否需要替换
			if (config.replace){
				for (var url in config.replace){
					if (req.url.indexOf(url) === 0){
						// 进入替换程序
						replaceResponse(config.replace[url], remote_res, res, config);
						return;
					}
				}
			}

			// 没有特殊处理, 转发远程内容
			remote_res.pipe(res);
		});

		var clientClosed = false;
		remote.on('error', function(){
			if (!clientClosed){
				console.log('Remote URL: [ERROR] http://%s:%d%s', config.host, config.port, req.url);
				res.end('REMOTE SERVER ERROR!');
			}
		});

		var clientErrorHandler = function(){
			console.log('Client Abort: %s', req.url)
			clientClosed = true;
			remote.abort();
		}
		req.on('clientError', clientErrorHandler);
		res.on('close', clientErrorHandler);

		// 请求远端服务器文件
		req.pipe(remote);
	})

	server.on('error', function(){
		console.log('监听服务器地址失败 (PORT: %d)', SERVER_CONF.port);
		console.log('请重新设置监听端口.');
		Running = false;
		// process.exit();
	});
	server.on('listening', function(){
		console.log('SunFeith Frontend HTTP Server Running.. (PORT: %d)', SERVER_CONF.port);
	});

	startServer();
}


function replaceResponse(item, remote, client, config){
	var path = item.file.replace('{root}', config.root);
	try {
		var data = fs.readFileSync(path, {encoding: 'utf8'});
	}catch(e){
		console.log('Miss Local File: %s', path);
		remote.pipe(client);
		return;
	}

	var remote_data = '';
	remote.on('data', function(chunk){
		remote_data += chunk.toString();
	});
	remote.on('end', function(){
		if (item.callback){
			data = item.callback(data, remote_data);
		}else if (item.lines){
			data = data.split('\n');
			remote_data = remote_data.split('\n');
			var lines = item.lines;
			while (lines.length >= 2){
				data[lines[0]] = remote_data[lines[1]];
				lines.splice(0,2);
			}
			data = data.join('\n');
		}else {
			// todo: 暂时替换<head>标记行
			data = data.split('\n');
			remote_data = remote_data.split('\n');
			for (var tar=0; tar<remote_data.length; tar++){
				if (remote_data[tar].toLowerCase().indexOf('<head>') !== -1){
					break;
				}
			}
			if (remote_data[tar]){
				data[item.search_lines] = remote_data[tar];
			}

		}

		// 发送替换后的数据
		client.end(data);
	});
}

function startServer(){
	var run = function(){
		Running = true;
		console.log('SunFeith Frontend HTTP Server Starting.. (PORT: %d)', SERVER_CONF.port);
		server.listen(SERVER_CONF.port);
	}
	if (server){
		if (Running){
			console.log('Server Shutting Down...');
			server.close(run);
		}else {
			run();
		}
	}
}