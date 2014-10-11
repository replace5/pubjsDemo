"use strict";

module.exports = function(grunt) {

	var GCC_OPTIONS = {
		compilation_level: "SIMPLE_OPTIMIZATIONS",
		externs: "docs/externs.js",

		warning_level: "VERBOSE",
		jscomp_off: "checkTypes",
		jscomp_error: "checkDebuggerStatement"
	};

	var CONFIG_FILES = [
		'Gruntfile.js'
	];
	var CLIENT_FILES = [
		'source/core/*.js',
		'source/base/*.js',
		'source/base/*/*.js',
		'source/plugins/*.js'
	];

	function excludeJS(filepath){
		return (filepath.slice(-3).toLowerCase() != '.js' || /[\/\\]libs[\/\\]/.test(filepath));
	}

	function excludeRES(filepath){
		var ns = filepath.split(/[\/\\]+/);
		return (ns[1] != 'less' && ns[1] != 'icons' && filepath.slice(-5).toLowerCase() != '.less');
	}

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),

		jshint: {
			config: {
				files: {
					src: CONFIG_FILES
				},
				options: {
					node: true
				}
			},
			client: CLIENT_FILES,
			options: {
				asi:true,
				curly:true,
				latedef:true,
				forin:false,
				noarg:false,
				sub:true,
				undef:true,
				unused:'vars',
				boss:true,
				eqnull:true,
				browser:true,
				laxcomma:true,
				devel:true,
				smarttabs:true,
				predef:[
					"require"
					,"define"
					,"console"
					,"extend"
					,"LANG"
					,"ROOT"
					,"PUBJS"
					,"_T"
					,"seajs"
					,"BASE"
				],
				globals: {
					jQuery: true
					,browser:true
				}
			}
		},
		concat: {
			client: {
				src: [
					"client/src/main.js"
				],
				dest: "dist/client-debug.js"
			}
		},
		less: {
			dev: {
				files:{
					'source/resources/css/app.css': 'source/resources/less/app.less'
				}
			},
			old: {
				files:{
					'source/resources/css/app.css': 'source/resources/css/app.less'
				}
			},
			product:{
				files:{
					'release/source/resources/css/app.css': 'source/resources/less/app.less'
				},
				options:{
					yuicompress: true
				}
			},
			options: {
				paths: ['.', 'source/resources/less']
			}
		},
		watch: {
			config: {
				files: CONFIG_FILES,
				tasks: ['jshint:config']
			},
			client: {
				files: CLIENT_FILES,
				tasks: ['jshint:client']
			},
			less: {
				files: [
					'source/resources/less/**/*.less',
					'source/resources/less/*/*.less'
				],
				tasks: ['less:dev']
			},
			icons: {
				files: [
					'source/resources/icons/list.txt'
				],
				tasks:['shell:icon']
			}
		},
		gcc: {
			client: {
				src: "dist/client-debug.js",
				dest: "dist/client.js",
				options: grunt.util._.merge({
					source_map_format: "V3",
					create_source_map: "dist/client.js.map"
				}, GCC_OPTIONS)
			},
			release: {
				src: [
					'project/**/*.js',
					'pubjs/**/*.js',
					'data/*.js',
					'controller/**/*.js'
				],
				dest: function(src){
					if (src == 'pubjs/externs.js' || src.indexOf('/libs/') != -1){
						return null;
					}
					return 'release/' + src;
				},
				options: grunt.util._.merge({
					// source_map_format: 'V3',
					// variable_map_input_file: 'docs/require.map'
				}, GCC_OPTIONS)
			}
		},
		copy: {
			release: {
				files: [
					{
						src: ['data/**', 'project/**', 'pubjs/**', 'controller/**'],
						dest: 'release/',
						filter: excludeJS
					},
					{
						src: ['crossdomain.xml', 'fav.ico', 'index.html'],
						dest: 'release/',
						filter: 'isFile'
					},
					{src: ['i18n/**', 'tpl/**'], dest: 'release/'},
					{src: ['source/resources/**'], dest: 'release/', filter: excludeRES}
				]
			}
		},
		shell: {
			icon: {
				command: '<%= shell.options.cmd %> S:<%= shell.icon.source %> O:<%= shell.icon.output %> CF:<%= shell.icon.style %> CU:0',
				source: 'source/resources/icons',
				output: 'source/resources/images/icons.png',
				style: 'source/resources/less/icons.less'
			},
			options: {
				cmd: 'pip.cmd',
				stdout: true
			}
		}
	});

	grunt.registerTask("embed", "Embed version etc.", function() {
		var configs = grunt.config("concat");
		var version = grunt.config("pkg.version");
		var code, name;

		for (name in configs){
			name = configs[name].dest;
			code = grunt.file.read(name);
			code = code.replace(/@VERSION/g, version);
			grunt.file.write(name, code);
		}

		grunt.log.writeln("@VERSION is replaced to \"" + version + "\".");
	});

	grunt.registerTask("fix", "Fix sourceMap etc.", function() {
		var configs = grunt.config('gcc');
		var code, name, mapfile, minfile, srcfile;
		var mapname, minname, srcname;

		for (name in configs){
			mapfile = configs[name].options.create_source_map;
			minfile = configs[name].dest;
			srcfile = configs[name].src;

			mapname = mapfile.split("/").pop();
			minname = minfile.split("/").pop();
			srcname = srcfile.split("/").pop();

			code = grunt.file.read(mapfile);
			code = code.replace('"file":""', '"file":"' + minname + '"');
			code = code.replace(srcfile, srcname);
			code = code.replace(srcfile.replace(/[\/]+/g, '\\\\'), srcname);
			grunt.file.write(mapfile, code);
			grunt.log.writeln('"' + mapfile + '" is fixed.');

			code = grunt.file.read(minfile);
			code += "//@ sourceMappingURL=" + mapname + "\n";
			grunt.file.write(minfile, code);
			grunt.log.writeln('"' + minfile + '" is fixed.');
		}
	});

	grunt.registerMultiTask("gcc", "Minify files with GCC.", function() {
		var done = this.async();

		var options = this.options({ banner: "" });
		var gccOptions = {};

		var banner = options.banner;
		banner = grunt.template.process(banner ? banner + "\n" : "");

		// Parse options
		Object.keys(options).forEach(function(key) {
			if (key !== "banner") {
				gccOptions[key] = options[key];
			}
		});

		var files = this.files;

		// Iterate over all src-dest file pairs
		function next() {
			var file = files.shift();
			if (file) {
				minify(file);
			}else {
				done();
			}
		}

		// Error handler
		function failed(error) {
			grunt.log.error(error);
			grunt.verbose.error(error);
			grunt.fail.warn('Google Closure Compiler failed.');
			done();
		}

		function minify(file) {
			var source = file.src.filter(function(filepath) {
				var bool = grunt.file.exists(filepath);

				// Warn on and remove invalid source files
				if (!bool) {
					grunt.log.warn('Source file "' + filepath + '" not found.');
				}
				return bool;
			});

			// Minify files, warn and fail on error
			var result = "";
			try {
				var gcc = require('gcc');
				var fs = require('fs');
				var run = next;
				var out = file.dest;

				var gccCallback = function(error, stdout) {
					if (error) {
						failed(error);
						return;
					}
					result = banner + stdout;
					grunt.file.write(out, result);
					grunt.log.writeln('File `' + out + '` created.');
					run();
				};

				if (!out || out instanceof Function){
					// 单独编译
					var fun = out;
					run = function(){
						var fn, ss, ds;
						while (1){
							fn = source.shift();
							// 没有文件, 退出
							if (!fn){ next(); return; }

							// 没有指定输出文件, 跳过
							out = fun ? fun(fn) : (fn.slice(0,-3) + '.min.js');
							if (out){
								// 目标文件不存在
								if (!fs.existsSync(out)){ break; }
								// 原文件比目标文件新
								ss = fs.statSync(fn);
								ds = fs.statSync(out);
								if (ss.mtime > ds.mtime){
									break;
								}
							}
						}


						// 创建输出目录
						var dir = '';
						var path = out.split(/[\/\\]+/);
						path.pop();
						// path = path.join('/');
						while (path.length){
							dir += (dir?'/':'') + path.shift();
							if (!fs.existsSync(dir)){
								fs.mkdirSync(dir);
							}
						}

						// 处理映射表文件名
						if (gccOptions.source_map_format){
							gccOptions.create_source_map = out + '.map';
						}else {
							delete gccOptions.create_source_map;
						}
						gcc.compile(fn, gccOptions, gccCallback);
					}
					run();
				}else {
					require("gcc").compile(source, gccOptions, gccCallback);
				}
			}
			catch (error) {
				failed(error);
			}
		}

		next();
	});

	// These plugins provide necessary tasks.
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-shell');

	// "npm test" runs these tasks
	grunt.registerTask('test', ['jshint']);
	grunt.registerTask('test-client', ['jshint:client']);

	// Less compile
	grunt.registerTask('less-product', ['less:product']);

	// Watch tasks
	grunt.registerTask('watch-all', ['jshint','watch']);
	grunt.registerTask('watch-client', ['jshint:client','watch:client']);

	// Build task
	grunt.registerTask('build', ['less-product']);
	grunt.registerTask('build-icon', ['shell:icon']);
	grunt.registerTask('build-release', ['build-icon', 'less:product', 'copy:release', 'gcc:release']);

	// Default task.
	grunt.registerTask('default', ['watch-all']);

	// default force mode
	grunt.option('force', true);
};