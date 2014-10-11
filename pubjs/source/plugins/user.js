// 启动模块定义(路由模块)
define(function(require, exports){
	var util = require('../core/util');
	var app;

	// 用户登录检查
	var user_data = null;
	var user_guest = {
		'id': 0,
		'type': 0
	};
	function isLogin(){
		return !!user_data;
	}
	function setUser(user){
		user_data = user;
	}
	function getUser(){
		return user_data || user_guest;
	}


	var COOKIE_BEGIN = "begindate",
		COOKIE_END = "enddate",
		COOKIE_TYPE = "dateCountType";

	// 本地数据缓存
	var DATE_STORAGE = {
		'mode': util.cookie(COOKIE_TYPE) === '0' ? 0 : 1,
		'begin': +util.cookie(COOKIE_BEGIN) || 0,
		'end': +util.cookie(COOKIE_END) || 0,
		'aDay': 86400,
		init: function(){
			var self = this;
			var begin = self.begin, end = self.end;
			var today = self.today();
			var diff = today % self.aDay;
			if (begin){
				begin -= (begin - diff) % self.aDay;
			}else {
				begin = today;
			}
			if (end){
				end -= (end - diff) % self.aDay;
				if (end < begin){ end = begin; }
			}else {
				end = begin;
			}
			end += (self.aDay - 1);
			self.begin = begin;
			self.end = end;
		},
		today: function(){
			var tmp = new Date();
			tmp.setHours(0);
			tmp.setMinutes(0);
			tmp.setSeconds(0);
			return Math.floor(tmp.getTime() / 1000);
		},
		setMode: function(mode){
			if ((mode === 0 || mode === 1) && mode != this.mode) {
				this.mode = mode;
				util.cookie(COOKIE_TYPE, mode);
				return true;
			}
			return false;
		},
		setTime: function(begin, end){
			var ret = false;
			begin = +begin;
			end = +end;
			if (begin && begin != this.begin){
				this.begin = begin;
				util.cookie(COOKIE_BEGIN, begin);
				ret = true;
			}
			if (end && end != this.end){
				this.end = end;
				util.cookie(COOKIE_END, end);
				ret = true;
			}
			if (ret){
				util.cookie(COOKIE_TYPE, this.mode);
			}
			return ret;
		},
		getMode: function(){
			return this.mode;
		},
		getBegin: function(){
			return this.begin;
		},
		getEnd: function(){
			return this.end;
		}
	};
	DATE_STORAGE.init();

	function getDateStorage(){
		return DATE_STORAGE;
	}
	exports.getDateStorage = getDateStorage;


	/**
	 * 获取cookie中的时间
	 * @return {Object} 时间戳对象
	 */
	function getDate(){
		if (DATE_STORAGE.getMode()){
			var date = {
				'begindate': DATE_STORAGE.getBegin(),
				'enddate': DATE_STORAGE.getEnd()
			};
			if (app.config('dateType') == 'date'){
				date.begindate = util.date("Y-m-d",+date.begindate);
				date.enddate = util.date("Y-m-d",+date.enddate);
			}
			return date;
		}else{
			return {"stastic_all_time":1};
		}
	}
	exports.getDate = getDate;

	exports.plugin_init = function(pubjs, callback){
		app = pubjs;
		pubjs.isLogin = isLogin;
		pubjs.setUser = setUser;
		pubjs.getUser = getUser;
		pubjs.getDate = getDate;
		pubjs.getDateStorage = getDateStorage;
		callback();
	}
});