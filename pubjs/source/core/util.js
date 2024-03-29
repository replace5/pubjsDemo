define(function(require, ex){
	var $ = require('jquery');
	var UD;
	var OP = Object.prototype;
	var AP = Array.prototype;
	var ENCODE = encodeURIComponent;
	var DECODE = function(val){
		try {
			return decodeURIComponent(val);
		}catch (e){
			return val;
		}
	}

	// 变量类型判断
	function isFunc(func){
		return (func instanceof Function);
	}

	function isString(str){
		return (typeof(str) === 'string');
	}

	function isArray(val){
		return (val instanceof Array);
	}

	function isFakeArray(val){
		var key;
		for (key in val){
			if (key === 'length'){
				if (isNaN(+val[key])){
					return false;
				}
			}else if (has(val, key) && isNaN(+key)){
				return false;
			}
		}
		return true;
	}

	function isObject(val){
		return (val instanceof Object);
	}

	function isPlainObject(val){
		if (OP.toString.call(val).slice(8,-1) !== 'Object' || val.nodeType || val === window){
			return false;
		}
		try {
			if (val.constructor && !has(val.constructor.prototype, 'isPrototypeOf')){
				return false;
			}
		} catch (e){
			return false;
		}

		return true;
	}

	function isNumber(val){
		return !(val === null || isNaN(+val));
	}

	function typeOfObject(val){
		return (val && typeof(val) === 'object');
	}

	function starRegExp(str){
		str = str.replace(/([\$\.\^\(\)\[\]\{\}])/g, '\\$1');
		str = str.replace(/\*/g, '(?:.+)');
		return new RegExp(str);
	}

	function getCssValue(el, name){
		var val = $(el).css(name).replace(/[a-z]+/i, '');
		return parseInt(val,10) || 0;
	}

	function ucFirst(str){
		if (isString(str)){
			var c = str.charAt(0).toUpperCase();
			return c + str.substr(1);
		}
		return str;
	}

	function toHex(num, len){
		var hex = '0123456789ABCDEF';
		var c = '';
		num = parseInt(num, 10);
		while (num > 15){
			c = hex.charAt(num % 16) + c;
			num = num >> 4;
		}
		c = hex.charAt(num % 16) + c;

		while (len && c.length < len){
			c = '0' + c;
		}
		return c;
	}

	var _has = OP.hasOwnProperty;
	function has(obj, key){
		if (key === UD) {return false;}
		return _has.call(obj, key);
	}

	ex.isFunc = isFunc;
	ex.isString = isString;
	ex.isArray = isArray;
	ex.isFakeArray = isFakeArray;
	ex.isObject = isObject;
	ex.typeOfObject = typeOfObject;
	ex.isNumber = isNumber;

	var email_regx = /^[a-zA-Z0-9][a-zA-Z0-9_\.\-]+@[a-zA-Z0-9\-]+(\.[a-zA-Z0-9]{2,4})+$/;
	ex.isEmail = function(email){
		return email_regx.test(email)
	}

	ex.starRegExp = starRegExp;
	ex.getCssValue = getCssValue;
	ex.ucFirst = ucFirst;
	ex.toHex = toHex;
	ex.has = has;

	var ua = navigator.userAgent.toLowerCase(),tmp;
	ex.isIe = (tmp = ua.match(/msie ([\d.]+)/))?tmp[1]:false;
	ex.isFf = (tmp = ua.match(/firefox\/([\d.]+)/))?tmp[1]:false;
	ex.isChrome = (tmp = ua.match(/chrome\/([\d.]+)/))?tmp[1]:false;
	ex.isOpera = (tmp = ua.match(/opera.([\d.]+)/))?tmp[1]:false;
	ex.isSafari = (tmp = ua.match(/version\/([\d.]+).*safari/))?tmp[1]:false;
	ua = tmp = null;

	var trim = String.prototype.trim;
	if (!trim){
		var trim_exp = /(^\s*)|(\s*$)/g;
		trim = function(){
			return this.replace(trim_exp, '');
		}
	}
	ex.trim = function(str){
		if (isString(str)){
			return trim.call(str);
		}else {
			return str;
		}
	}

	ex.argsToArray = function(args){
		if (args instanceof arguments.constructor){
			return AP.slice.call(args);
		}else {
			return args;
		}
	}

	/**
	 * 返回对象自有的属性值
	 * @param  {Object} obj  属性所属的对象
	 * @param  {String} prop 属性名称
	 * @return {Mix}      返回对象的属性, 不存在或属性为继承获得, 返回undefined
	 */
	ex.own = function(obj, prop){
		if (has(obj, prop)){
			return obj[prop];
		}else {
			return UD;
		}
	}

	function toRGB(r,g,b){
		var c = '#';
		c += toHex(r * 255, 2);
		c += toHex(g * 255, 2);
		c += toHex(b * 255, 2);
		return c;
	}

	/**
	 * HSL 转 RGB 颜色格式
	 * @param  {Number} h 色相 [ 0-360 ]
	 * @param  {Number} s 饱和 [ 0-1 ]
	 * @param  {Number} l 亮度 [ 0-1 ]
	 * @return {String}   CSS颜色字符串
	 */
	ex.hsl2rgb = function(h,s,l){
		if (isObject(h) && "h" in h && "s" in h && "l" in h) {
			l = h.l;
			s = h.s;
			h = h.h;
		}
		// h *= 360;
		var R, G, B, X, C;
		h = (h % 360) / 60;
		C = 2 * s * (l < 0.5 ? l : 1 - l);
		X = C * (1 - Math.abs(h % 2 - 1));
		R = G = B = l - C / 2;

		h = ~~h;
		R += [C, X, 0, 0, X, C][h];
		G += [X, C, C, X, 0, 0][h];
		B += [0, 0, X, C, C, X][h];

		return toRGB(R,G,B);
	}
	/**
	 * HSB/HSV 转 RGB 颜色格式
	 * @param  {Number} h 色相 [ 0-360 ]
	 * @param  {Number} s 饱和 [ 0-1 ]
	 * @param  {Number} v 明度 [ 0-1 ]
	 * @return {String}   CSS颜色字符串
	 */
	ex.hsb2rgb = function (h, s, v) {
		if (isObject(h) && "h" in h && "s" in h && "b" in h) {
			v = h.b;
			s = h.s;
			h = h.h;
		}
		// h *= 360;
		var R, G, B, X, C;
		h = (h % 360) / 60;
		C = v * s;
		X = C * (1 - Math.abs(h % 2 - 1));
		R = G = B = v - C;

		h = ~~h;
		R += [C, X, 0, 0, X, C][h];
		G += [X, C, C, X, 0, 0][h];
		B += [0, 0, X, C, C, X][h];

		return toRGB(R,G,B);
	};

	ex.blockEvent = function(evt){
		evt.stopPropagation();
		return false;
	};
	ex.stopEvent = function(evt){
		evt.stopPropagation();
		return true;
	}

	ex.each = function(list, cb, ct){
		if (!list || !isFunc(cb)) {return false;}
		if (!ct) {ct = window;}
		var ret, c, i=null;
		if (isArray(list)){
			for (i=0; i<list.length; i++){
				ret = cb.call(ct, list[i], i);
				if (ret === false){
					break;
				}
				if (ret === null){
					list.splice(i,1);
					i--;
				}else if (ret !== UD){
					list[i] = ret;
				}
			}
			if (i==list.length){
				i = null;
			}
		}else if (isObject(list)){
			for (c in list){
				if (!_has.call(list, c)) {continue;}
				ret = cb.call(ct, list[c], c);
				if (ret === false){
					i = c;
					break;
				}
				if (ret === null){
					list[c] = null;
					delete list[c];
				}else if (ret !== UD){
					list[c] = ret;
				}
			}
		}
		list = cb = ct = null;
		ex.each.result = i;
		return i;
	}

	ex.uniq = ex.unique = function(arr, keep, reverse){
		if (!isArray(arr)) {return null;}
		if (reverse){ arr.reverse(); }
		var exist = {};
		var result = keep ? [] : arr;
		var val;
		for (var i=0; i<arr.length; i++){
			val = arr[i];
			if (_has.call(exist, val)){
				if (keep){
					result.push(val)
				}else {
					arr.splice(i--, 1);
				}
			}else {
				exist[val] = 1;
			}
		}
		if (reverse){
			arr.reverse();
			if (keep){ result.reverse(); }
		}
		return keep ? result : arr;
	}

	ex.exclude = function(base, exclude, keep){
		if (keep){
			base = base.slice();
		}
		for (var i=base.length; i>0;){
			if (exclude.indexOf(base[--i]) !== -1){
				base.splice(i, 1);
			}
		}
		return base;
	}

	/**
	 * 清空数组或者对象属性
	 * @param  {Mix}  list 要清空数组或者对象
	 * @return {Bool}      返回是否清空成功
	 */
	ex.empty = function(list){
		if (isArray(list)){
			list.splice(0, list.length);
		}else if (isObject(list)){
			var k;
			for (k in list){
				if (_has.call(list, k)){
					delete list[k];
				}
			}
		}else {
			return false;
		}
		return true;
	}

	/**
	 * 查找数组或对象中匹配的索引
	 * @param  {Object}    list  数组或对象
	 * @param  {Mix}       value 查询依据数据
	 * @param  {String}    field 查询的关键字段
	 * @return {Mix}             匹配的索引<未查到时返回null>
	 * @private
	 */
	function Index(list, value, field){
		var ret, c, i, al = (arguments.length >= 3);
		if (isArray(list)){
			// 数组类型
			c = list.length;
			for (i=0; i<c; i++){
				ret = al ? list[i][field] : list[i];
				if ((value === ret) || (value && value == ret)){
					return i;
				}
			}
		}else if (isObject(list)){
			// 对象类型
			for (i in list){
				if (!_has.call(list, i)) {continue;}
				ret = al ? list[i][field] : list[i];
				if ((value === ret) || (value && value == ret)){
					return i;
				}
			}
		}
		return null;
	}
	ex.index = Index;

	ex.find = function(list){
		var id = Index.apply(this, arguments);
		if (id !== null){
			return list[id];
		}else {
			return null;
		}
	}

	/**
	 * 检测数组或对象中的值或点路径
	 * @param  {Mix} obj  待测数据
	 * @param  {Mix} path 查询依据数据
	 * @return {Mix}      结果数据
	 * .eg
	 *    util.some({"a":{"b":1}},"a.b"); // 1
	 *    util.some({"a":{"b":1}},"a.b.c") // null
	 */
	ex.some = function(obj,path){
		var isPath = isString(path) && path.indexOf(".") !== -1 || false;
		if(isArray(obj) || isObject(obj) && !isPath){
			return ex.find(obj,path);
		}else if(isPath){
			var re = obj;
			path = path.split(".");
			for(var i=0,len = path.length;i<len;i++){
				if(re[path[i]] !== UD){
					re = re[path[i]];
				}else{
					re = null;
					break;
				}
			}
			return re;
		}
	}

	ex.without = function(list,values,field){
		var arr = [],rtArr = [],flag = true,cur;
		if(isArray(list)){
			arr = list;
		}else{
			arr = [list];
		}
		for(var i = 0;i<arr.length;i++){
			for(var j = 0;j<values.length;j++){
				cur = (arr[i] == values[j])?1:null;
				if(cur == null){
					cur = ex.find(arr[i],values[j]);
				}
				if(cur!=null){
					flag = false;
					break;
				}
			}
			if(flag){
				rtArr.push(arr[i]);
			}else{
				flag = true;
			}
		}
		return rtArr;
	}
	ex.remove = function(list){
		var id = Index.apply(this, arguments);
		if (id === null){ return false; }
		if (isArray(list)){
			list.splice(id, 1);
		}else {
			delete list[id];
		}
		return true;
	}

	ex.getViewport = function(){
		var d = document, de = d.documentElement, db = d.body;
		var m = (d.compatMode === "CSS1Compat");
		return {
			width: (m ? de.clientWidth : db.clientWidth),
			height: (m ? de.clientHeight : db.clientHeight)
		};
	}

	ex.first = function(list){
		var ret;
		if (isArray(list)){
			ret = list[0];
		}else if (isObject(list)){
			for (var i in list){
				if (has(list, i)){
					ret = list[i];
					break;
				}
			}
		}
		return ret;
	}
	ex.first_key = function(obj){
		if (isObject(obj)){
			for (var i in obj){
				if (has(obj, i)){
					return i;
				}
			}
		}
		return UD;
	}

	ex.prop = function(obj, prop_name){
		var ns = (''+prop_name).split('/');
		var name;
		while (ns.length){
			name = ns.shift();
			if (typeof(obj) == 'object' && obj.hasOwnProperty(name)){
				obj = obj[name];
			}else {
				return null;
			}
		}
		return obj;
	}

	var tab = {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'};
	var esc_reg  = /[&<>"]/g;
	function esc_rp(m){ return tab[m]; }
	ex.html = function(s){
		return (typeof(s) != 'string') ? s : s.replace(esc_reg, esc_rp);
	}

	/**
	 * 防环状嵌套克隆
	 * @param {Mix} value 克隆的对象值
	 */
	function Clone(value){
		if (isPlainObject(value) || isArray(value)){
			var cloneKey = '___deep_clone___';

			// 已经被克隆过, 返回新克隆对象
			if (value[cloneKey]){
				return value[cloneKey];
			}

			var objClone = value[cloneKey] = (value instanceof Array ? [] : {});
			for (var key in value){
				if (key !== cloneKey && value.hasOwnProperty(key)){
					objClone[key] = (typeOfObject(value[key]) ? Clone(value[key]) : value[key]);
				}
			}
			delete value[cloneKey];
			return objClone;
		}
		return value;
	}
	ex.clone = Clone;

	/**
	 * 扩展合并函数
	 * @param  {Number} deep   <可选> 递归合并层数
	 * @param  {Object} target 接受合并内容的目标对象
	 * @param  {Object} ...    需要合并到目标对象的扩展对象(1个或多个)
	 * @return {Object}        返回合并后的对象内容
	 */
	function Extend(){
		var args = arguments;
		var len = args.length;
		var deep = args[0];
		var target = args[1];
		var i = 2;
		if (!isNumber(deep)){
			target = deep;
			deep = -1;
			i = 1;
		}
		if (!target){
			target = {};
		}
		while (i<len){
			if (typeOfObject(args[i])){
				target = ExtendObject(target, args[i], deep);
			}
			i++;
		}
		return target;
	}
	function ExtendObject(dst, src, deep){
		if (dst === src){ return dst; }
		var i, type = (dst instanceof Array ? 0 : 1) + (src instanceof Array ? 0 : 2);
		switch (type){
			case 0:
				// 都是数组, 合并有值的, 忽略undefined的
				for (i=src.length-1; i>=0;i--){
					ExtendItem(dst, i, src[i], 0, deep);
				}
			break;
			case 1:
				// 目标是对象, 新值是数组
				dst = Clone(src);
			break;
			case 2:
				// 目标是数组, 新值是对象
				if (!isFakeArray(src)){
					dst = Clone(src);
					break;
				}
			/* falls through */
			case 3:
				// 都是对象
				if (!dst){ dst = {}; }
				for (i in src){
					if (has(src, i)){
						ExtendItem(dst, i, src[i], 1, deep);
					}
				}
			break;
		}
		return dst;
	}
	function ExtendItem(dst, key, value, remove, deep){
		if (value === UD){
			// undefined 时删除值
			if (remove){ delete dst[key]; }
		}else if (value && (isArray(value) || isPlainObject(value))){
			// 新值为对象
			var old = dst[key];
			if (old === value){ return; }
			if (deep !== 0 && (isArray(old) || isPlainObject(old))){
				// 继续合并数组和简答对象
				dst[key] = ExtendObject(old, value, --deep);
			}else {
				// 克隆新对象赋值
				dst[key] = Clone(value);
			}
		}else {
			// 直接赋值
			dst[key] = value;
		}
	}
	ex.extend = Extend;

	/**
	 * 转换对象为JS Date对象
	 * @param  {Mix}    date   <可选> 日期数据(时间戳, 字符串, Date对象, 空)
	 * @param  {Number} offset 修正偏移的秒数
	 * @return {Date}          返回JS Date对象 / NULL 日期格式错误
	 */
	var date_regx = /[^\d]+/;
	function toDate(date, offset){
		var ts;
		if (date instanceof Date){
			ts = date;
		}else if (isNaN(+date)){
			if (isString(date)){
				date = date.split(date_regx);
				if (date.length === 3){
					ts = new Date(+date[0], date[1]-1, +date[2], 0, 0, 0, 0);
					if (isNaN(+ts)){
						ts = null;
					}
				}
			}else {
				return null;
			}
		}
		if (!ts){
			if (!date){ return null; }
			ts = new Date();
			if (date > 5e8){
				// 时间戳
				ts.setTime(date * 1000);
			}else{
				// 时间偏移(秒数)
				ts.setTime(ts.getTime() + date * 1000);
			}
		}
		if (!isNaN(+offset)){
			ts.setTime(ts.getTime() + offset * 1000);
		}
		return ts;
	}
	ex.toDate = toDate;

	/**
	 * 格式化数字, 自动补0前续
	 * @param  {Number} number 要格式化的数字
	 * @param  {Number} size   格式化后出来的数字位数
	 * @return {String}        格式化结果
	 */
	function fix0(number, size){
		number = number.toString();
		while (number.length < size){
			number = '0' + number;
		}
		return number;
	}
	ex.fix0 = fix0;
	/**
	 * 保留指定位数的小数点
	 * 因有浏览器兼容问题，所以不能直接采用原生的办法
	 * @param  {Number} num     要转化的数字
	 * @param  {Int}    howmuch 要保留的位数
	 * @return {Number}         处理完的数字
	 */
	ex.toFixed = function(num,howmuch){
		howmuch = +howmuch;
		if (isNaN(howmuch)){ return num; }
		howmuch = Math.pow(10,howmuch);
		return Math.round(num*howmuch)/howmuch;
	}
	ex.round0 = function(val, num, return_arr){
		val = +val;
		if (num <= 0){ return Math.round(+val || 0); }
		val = isNaN(val)? 0 : ex.toFixed(val, num);
		var arr = val.toString().split('.');
		if (!arr[1]){ arr[1] = '0'; }
		if (arr[1].length > num){
			arr[1] = arr[1].substr(0, num);
		}else {
			while (arr[1].length < num){
				arr[1] += '0';
			}
		}
		return (return_arr ? arr : arr.join('.'));
	}
	ex.numberFormat = function(val, separator, size){
		if (!isNumber(val)){ return '0'; }
		if (!separator){ separator = ','; }
		if (!size){ size = 3; }
		var last = size;

		val = val.toString();
		var pos = val.indexOf('.');
		var res = '';
		if (pos === -1){
			pos = val.length;
		}else {
			res = val.substr(pos);
		}
		if (val.charAt(0) === '-'){
			last++;
		}
		while (pos > last){
			pos -= size;
			res = separator + val.substr(pos, size) + res;
		}
		if (pos){
			res = val.substr(0, pos) + res;
		}
		return res;
	}


	var timestamp = null;
	var format_exp = /[YymndjNwaAghGHis]/g;
	function format_callback(tag){
		var t = timestamp;
		switch (tag){
			case 'Y': return t.getFullYear();
			case 'y': return t.getFullYear() % 100;
			case 'm': return fix0(t.getMonth()+1, 2);
			case 'n': return t.getMonth()+1;
			case 'd': return fix0(t.getDate(), 2);
			case 'j': return t.getDate();
			case 'N': return t.getDay();
			case 'w': return t.getDay() % 7;
			case 'a': return t.getHours() < 12 ? 'am':'pm';
			case 'A': return t.getHours() < 12 ? 'AM':'PM';
			case 'g': return t.getHours() % 12 + 1;
			case 'h': return fix0(t.getHours() % 12 + 1, 2);
			case 'G': return t.getHours();
			case 'H': return fix0(t.getHours(), 2);
			case 'i': return fix0(t.getMinutes(), 2);
			case 's': return fix0(t.getSeconds(), 2);
		}
		return tag;
	}
	ex.date = function(format, date, offset){
		if (!format) {return '';}
		timestamp = toDate(date, offset);
		if (timestamp === null){ timestamp = new Date(); }
		return format.replace(format_exp, format_callback);
	}

	ex.time = function(){
		return Math.round((new Date()).getTime() / 1000);
	}

	ex.time_diff = function(start){
		var ts = (new Date()).getTime();
		if (start){
			return (ts - start);
		}else {
			return ts;
		}
	}
	ex.toDuration = function(val){
		var time = [], v;
		v = val % 60;
		time.push(v < 10 ? '0'+v : v);
		val = Math.floor(val / 60);
		v = val % 60;
		time.unshift(v < 10 ? '0'+v : v);
		val = Math.floor(val / 60);
		time.unshift(val);
		return time.join(':');
	}


	/**
	 * 正则参数替换回调函数
	 * @private
	 * @param  {Object} match 正则匹配对象
	 * @return {String}       替换字符串
	 */
	var _indexReplaceList;
	var _indexReplaceRegx = /\%(\d+)|\{\d+\}/g;
	function _indexReplace(match){
		if (match[1] > 0 && _indexReplaceList[match[1]] !== UD){
			return _indexReplaceList[match[1]];
		}else {
			return match[0];
		}
	}
	/**
	 * 正则索引标签替换方法
	 * @param  {String}  format  模板字符串。索引从1开始。
	 * @param  {Mix}     [...]   对应索引标签的替换数据
	 * @return {String}          格式化完的字符串。如找不到索引标签对应的数据则返回标签本身。
	 * eg.
	 *     var link = util.formatIndex('<a href="{1}">{2}</a>',"http://www.clicki.cn/","clicki");
	 *     console.log(link); // <a href="http://www.clicki.cn/">clicki</a>
	 */
	ex.formatIndex = function(format){
		_indexReplaceList = arguments;
		return format.replace(_indexReplaceRegx, _indexReplace);
	}
	ex.parse = function(str,exp1,exp2){
		if (!exp1){ exp1 = '&'; }
		if (!exp2){ exp2 = '='; }
		var strArr = str && str.split(exp1),rtObj = {};
		ex.each(strArr,function(item,index){
			var arr = item.split(exp2);
			var name = arr.shift();
			arr = DECODE(arr.join(exp2));
			rtObj[name] = (arr === '0' ? 0 : arr);
		})
		return rtObj;
	}
	ex.param = function(param, exp1, exp2){
		if (!exp1){ exp1 = '&'; }
		if (!exp2){ exp2 = '='; }

		var result = [];
		for (var key in param){
			if (has(param, key)){
				result.push(
					ENCODE(key) + exp2 + ENCODE(param[key])
				);
			}
		}
		return result.join(exp1);
	}

	/**
	 * 计算DOM元素相对另外一个DOM的相对位置
	 * @param  {Element} dom    要计算位置的DOM对象
	 * @param  {Element} relate <可选> 相对位置的DOM对象
	 * @return {Object}         返回一个带有top和left的相对位置数值对象
	 */
	ex.offset = function(dom, relate){
		var body = document.body;
		var ret = {top:0, left:0};

		dom = $(dom).get(0);
		if (!dom){
			return ret;
		}
		while (dom !== body){
			ret.top += dom.offsetTop;
			ret.left += dom.offsetLeft;
			dom = dom.offsetParent;
		}

		if (relate){
			relate = $(relate).get(0);
		}
		if (relate){
			while (relate !== body){
				ret.top -= relate.offsetTop;
				ret.left -= relate.offsetLeft;
				relate = relate.offsetParent;
			}
		}
		return ret;
	}

	/**
	 * 检查字符串是否符合Html标签正则
	 * @type {RegExp}
	 */
	var HTML_EXPREG = /^<(\w+)\s*\/?>(?:<\/\1>|)$/;
	/**
	 * 检查传入的字符串是否为html标签
	 * @param  {String} html 待检测的字符串
	 * @return {Mix}         null表示检测失败，数值形式表示成功。
	 */
	ex.testHtmlTag = function(html){
		return HTML_EXPREG.exec(html);
	}

	/**
	 * 获取一个唯一的ID
	 * @return {Number} 返回唯一的ID号
	 */
	var _guid = 1;
	ex.guid = function(fix){
		if (fix){
			return ''+fix+(_guid++);
		}else {
			return _guid++;
		}
	}

	/**
	 * Cookie功能函数
	 * @param {String} name    Cookie变量名称, 留空所有参数获取所有Cookie, 指定一个名称获取指定名称的值
	 * @param {String} value   <可选> 有值时, 设置Cookie的的值
	 * @param {Object} options <可选> 设置Cookie的选项参数对象
	 */
	function Cookie(name, value, options){
		if (arguments.length <= 1){
			// 获取Cookie
			var map = {};
			var str = document.cookie;
			if (isString(str)){
				var val = str.split('; ');
				var key;
				for (var i=0; i<val.length; i++){
					value = val[i].indexOf('=');
					key = val[i].substr(0, value);
					map[key] = DECODE(val[i].substr(value+1));
				}
			}
			if (arguments.length == 1){
				return map[name] || null;
			}else {
				return map;
			}
		}else {
			if (!name) {return false;}
			options = options || {};
			var expires = options['expires'];
			var domain = options['domain'];
			var path = options['path'] || '/';

			if (value === null){
				expires = -1;
				value = '';
			}
			if (!options['raw']) {
				value = ENCODE(String(value));
			}

			var text = name + '=' + value;

			// expires
			if (expires instanceof Date){
				text += '; expires=' + expires.toUTCString();
			}else if (!isNaN(+expires)){
				var date = new Date();
				date.setDate(date.getDate() + expires);
				text += '; expires=' + date.toUTCString();
			}
			// domain
			if (domain) {
				text += '; domain=' + domain;
			}
			// path
			text += '; path=' + path;

			// secure
			if (options['secure']) {
				text += '; secure';
			}

			document.cookie = text;
			return true;
		}
	}
	ex.cookie = Cookie;


	var UIQueue = [];
	var UIKeyName = 'pubjs_ui_' + (new Date()).getTime();
	var UITimerID = 0;
	var UIBody = document.body;

	function fireUICallback(elm, idx){
		if (idx === null){
			var id = elm[UIKeyName];
			if (id){ idx = Index(UIQueue, id, 'id'); }
			if (idx === null){ return; }
		}
		var item = UIQueue[idx];
		if (item){
			var cb;
			UIQueue.splice(idx, 1);
			for (idx = item.cs.length; idx>0;){
				cb = item.cs[--idx];
				cb[0].call(cb[1] || window);
			}
		}
	}
	function runUICheck(){
		var item, elm;
		for (var i=UIQueue.length; i>0;){
			item = UIQueue[--i];
			elm = item.el;
			if (++item.c > 10){
				while (elm){
					elm = elm.parentElement;
					if (elm === UIBody){ break; }
				}
				if (elm){
					item.c = 0;
					elm = item.el;
				}else {
					// 对象已经从Document中删除
					UIQueue.splice(i, 1);
					continue;
				}
			}

			if (elm.clientWidth > 0){
				// 对象可见, 回调事件
				fireUICallback(elm, i);
			}
		}

		// 队列已空, 结束循环计时器
		if (UIQueue.length === 0){
			clearInterval(UITimerID);
			UITimerID = 0;
		}
	}
	function pushUICheck(elm, callback, context){
		if (isString(callback)){
			callback = context && context[callback];
			if (!isFunc(callback)){
				return;
			}
		}
		if (!UITimerID){
			UITimerID = setInterval(runUICheck, 500);
		}

		var id = elm[UIKeyName] || (elm[UIKeyName] = ex.guid());
		var item = ex.find(UIQueue, id, 'id');
		if (!item){
			item = {'id': id, 'cs':[], 'el': elm, 'c':0};
			UIQueue.push(item);
		}else {
			var calls = item.cs;
			for (id=calls.length; id>0;){
				if (calls[--id][0] === callback){
					calls[id][1] = context;
					return;
				}
			}
		}
		item.cs.push([callback, context]);
	}
	ex.checkUI = function(elm, callback, context){
		if (elm.jquery){
			elm = elm.get(0);
		}
		if (elm.clientWidth > 0){
			fireUICallback(elm, null);
			return true;
		}else {
			pushUICheck.apply(ex, arguments);
			return false;
		}
	}
});