define(function(require, exports){
	var $ = require('jquery');
	var pubjs = require('../core/pub');
	var util  = require('../core/util');
	var view  = require('./view');
	var input = require("@base/common/input");

	/**
	 * 在指定数组中排除某一个/多个元素
	 * @param  {Array} arr      待筛选数组
	 * @param  {Mix}   deadMans 要排除的数据
	 * @return {Array}          筛选完的数组
	 * @private
	 * @todo 排除多个的还未实现
	 */
	function _without(arr,deadMans){
		var newArr = [];
		for(var i = 0;i<arr.length;i++){
			if(arr[i] === deadMans){
				continue;
			}
			newArr.push(arr[i]);
		}
		return newArr;
	}

	var TagLabels = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				"target":"body"
				,"class":"M-tagLabels"
				,"label":LANG("分组：")
				// 标签列表容器
				,"tagContainer":{
					// 容器主样式
					"class":"M-tagLabelsContainer"
					// 标题。用的是P标签。所以不要在html里写默认是块状显示的标签
					// ,"title":{
					// 	"html":LANG("选择一个合适的标签（点击即可）：")
					// }
					,"inClass":"M-tagLabelsInner"
					,"tagClass":""
					,"tagAct":"act"
				}
				// 提交服务器的查询参数
				,"param":{}
				// 读取所有标签
				,"all": false
				// 标签类型
				// SweetyLabel|WhiskyLabel|null
				,"type":"SweetyLabel"
				,"data":null
				// 折叠
				,"collapse":1
				// 数据发送类型。为真时发送标签文字，为假时发送Id
				,"dataType":1
				// 数据节点
				,"database":null
				// 显示文字
				,"txts":{
					"title":LANG("分组：")
					,"__nolabel__":LANG("其它")
					,"__all__":LANG("分组")
				}
				,"tips":false
				,"eventDataLoad":false // 是否发送数据加载成功消息
			});

			// 数据接口
			this.database = config.get('database') || "/listlabels";

			// 系统参数
			var time = pubjs.getDate();
			this.sysParam = config.get('all') ? {} : time;
			var type = config.get('type');
			this.sysParam.type = type ? type : '';


			// 标签对象集合
			this.tags = {};

			// 标签数量
			this.len = 0;

			// 原始数据
			this.data = null;

			// 已选的数据
			this.selectedData = {};

			// 数据请求中
			this.busy = false;

			// 行高
			this.lineHeight = 0;

			// 整体高度
			this.allHeight = 0;

			// 折叠功能控制对象
			this.collapseCtrl = null;

			// 折叠状态
			this.collapseStatus = 0;
			//标签输入框线程控制
			this.inputBusy = 0;

			if(config.get('collapse')){
				config.get('tagContainer')["class"] += " M-tagLabels-allowCollapse";
			}else{
				config.get('tagContainer')["class"] += " M-tagLabels-noCollapse";
			}

			this.Super('init', arguments);
		},
		afterBuild: function(){
			// this.render();

			var self = this;
			var c = self.getConfig();
			var el = this.getDOM();

			$('<label class="M-tagLabelsLabel"/>').text(c.label).appendTo(el);

			// 输入框
			this.tagLabelsInput = this.create(
				"tagLabelsInput"
				,input.text
				,{
					"target":el
					,"label":null
					// @todo 有bug
					// ,"placeholder":LANG("输入新组名或从下面对列表中选择")
					,"events":"blur"
					,"value":''
				}
			);

			// 标签显示外部容器
			this.tagLabelsContainer = this.create(
				"tagLabelsContainer"
				,view.container
				,{
					"class":'tag_select'
					,"target":el
					,"html":'<div class="'+c.tagContainer.inClass+'"></div>'
				}
			);

			this.tagLabelsContainer.tagsBox = this.tagLabelsContainer.$el.find("div:first");
			// 事件
			this.uiProxy(this.tagLabelsContainer.tagsBox, 'span', 'click', 'appendToInput');
			this.uiBind(this.tagLabelsInput.$el,'input','inputChange');
			if(c.data){
				this.setData(c.data);
			}
			this.refresh();
		}
		,setData:function(data){
			this.setTag(data);
			return this.selectedData;
		}
		,getData: function(){
			var list = [];
			util.each(this.selectedData, function(check, tag){
				if (check){
					list.push(tag);
				}
			});
			return list;
		}
		/**
		 * 标签输入框监听事件,设定线程300毫秒后执行 changeTag事件
		 * @param  {event} ev  jquery事件
		 * @param  {dom} elm dom元素
		 * @return {undefined}     [description]
		 */
		,inputChange:function(ev,elm){
			if(!this.inputBusy){
				var self = this;
				setTimeout(function(){
					self.changeTag(elm.value);
					self.inputBusy = 0;
				},300)
				this.inputBusy = 1;
			}
		}
		/**
		 * 标签激活事件，根据传入value设定所以激活的标签
		 * @param  {string} value [标签输入框的值]
		 * @return {undefined}       [description]
		 */
		,changeTag:function(value){
			var self = this,data = this.selectedData,inputlist = value.split(/,|，/);
			util.each(data,function(item,index){
				data[index] = 0;
				if(util.has(self.tags,index)){
					self.tags[index].$el.removeClass('act');
				}
			});
			util.each(inputlist,function(item){
				var index = util.trim(item);
				if(util.has(self.tags,index)){
					data[index] = 1;
					self.tags[index].$el.addClass('act');
				}
			});
		}
		/**
		 * 添加/删除选中的标签到输入框。同时操作选中标签的样式
		 * @param  {Object}    ev 事件对象
		 * @return {Undefined}    无返回值
		 */
		,appendToInput:function(ev, elm){
			var el = this.tagLabelsInput.getDOM().find('input');
			var val = el.val()
				,tagVal = elm.innerHTML.replace(/<em>(.*)<\/em>/,"");

			var c = this.getConfig();
			if(val === ''){
				val = [];
			}else{
				val = val.split(/,|，/);
			}
			if (this.selectedData[tagVal]){
				val = _without(val,tagVal);
				delete this.selectedData[tagVal];
			}else{
				val.push(tagVal);
				this.selectedData[tagVal] = 1;
			}
			$(elm).toggleClass(c.tagContainer.tagAct);
			el.val(val);
			tagVal = val = null;
		}
		/**
		 * 插入标签
		 * @param  {String} tag 标签名
		 * @return {Object}     标签对应的实例
		 */
		,addTag:function(tag,target){
			var c = this.getConfig();

			target = target || this.tagLabelsContainer.tagsBox;

			this.tags[tag.name] = this.create(
				tag.name
				,view.container
				,{
					"target":target
					,"tag":"span"
					,"class":this.selectedData[tag.name] && c.tagContainer.tagAct || c.tagContainer.tagClass
					,"html":tag.name+"<em>("+tag.count+")</em>"
				}
			);
			this.tags[tag.name].data = tag;
			return this.tags[tag.name];
		}
		/**
		 * 输入框失去焦点时的响应函数
		 * @param  {Object}    ev 消息对象
		 * @return {Undefined}    无返回值
		 */
		,onInputBlur:function(ev){
			var val = ev && ev.param.value.split(/,|，/);
			this.setTag(val);
		}
		/**
		 * 删除标签
		 * @param  {String}    tag 标签索引
		 * @return {Undefined}     无返回值
		 */
		,removeTag:function(tag){
			var _tag = this.tags[tag];
			_tag.destroy();
			delete this.tags[tag];
			_tag = null;
		}
		/**
		 * 删除所有标签
		 * @return {Undefined}     无返回值
		 */
		,removeAllTags:function(){
			try{
				for(var n in this.tags){
					this.removeTag(n);
				}
			}catch(err){
				if(window.console){
					console.error(err);
				}
			}
		}
		,onData:function(err,data){
			this.busy = false;
			var tagBox = this.tagLabelsContainer.tagsBox;
			tagBox.removeClass("M-tagLabelsloading");
			if(err){
				pubjs.alert(err.message);
				return false;
			}else {
				this.len = data.total;

				// 格式化
				var c = this.getConfig();
				if (util.isFunc(c.format)){
					data.items = c.format(data.items);
				}
				this.data = data.items;

				for(var i = 0;i<data.total;i++){
					if (this.data[i].name == '__nolabel__'){
						this.len--;
						continue;
					}
					this.addTag(this.data[i]);
				}
				var tags = [];
				util.each(this.selectedData, function(chk, tag){
					if (chk) { tags.push(tag); }
				});
				this.setTag(tags);
				if(this.getConfig('eventDataLoad')){
					this.fire('tagDataLoad', data);
				}
				this.fire("sizeChange");
			}
		}
		/**
		 * 返回自定义参数
		 * @return {Object} 参数对象
		 */
		,setParam:function(param){
			var c = this.getConfig();
			$.extend(c.param, param);
		}
		/**
		 * 刷新标签列表
		 * @return {Undefined} 无返回值
		 */
		,refresh:function(){
			var c = this.getConfig();
			if (this.busy) {return false;}
			this.busy = true;

			var tagBox = this.tagLabelsContainer.tagsBox;
			tagBox.addClass("M-tagLabelsloading");
			this.removeAllTags();
			pubjs.data.get(
				this.database
				,$.extend({}, c.param, this.sysParam)
				,this
			);
		}
		/**
		 * 销毁函数
		 * @return {Undefined} 无返回值
		 */
		,beforeDestroy:function(){
			this.tagLabelsContainer.tagsBox.undelegate("span","click",this,this.appendToInput);
			this.$el.remove();
		}
		/**
		 * 时间改变的响应函数
		 * @param  {Object}  ev 消息对象
		 * @return {Boolean}    阻止冒泡
		 */
		,onChangeDate:function(ev){
			ev = ("stastic_all_time" in ev.param) ?ev.param:ev.param.nowTimestamp;
			$.extend(this.sysParam,ev);
			this.refresh();
			ev = null;
			return false;
		}
		/**
		 * 重置
		 * @return {Undefined} 无返回值
		 */
		,reset:function(){
			var c = this.getConfig();
			this.selectedData = {};
			this.tagLabelsInput.$input.val("");
			this.tagLabelsContainer.tagsBox.find("span").removeClass(c.tagContainer.tagAct);
		}
		/**
		 * 检测总体高度与行高
		 * @return {Boolean} 总体高度与行高对比度结果
		 */
		,chkLine:function(){
			var c = this.getConfig();
			if(!c.collapse){
				return false;
			}
			// @todo pubjs.util 有问题吧？
			if(!this.lineHeight){
				this.lineHeight = pubjs.util.first(this.tags).$el.height();
				this.allHeight = this.tagLabelsContainer.tagsBox.height();
				this.collapseCtrl[
					this.allHeight <= this.lineHeight*1.5 && "hide" || "show"
				]();
				this.tagLabelsContainer.tagsBox.height(this.lineHeight);
			}
		}
		,toggleLine:function(){
			// this.collapseCtrl
			if(this.collapseStatus){
				this.tagLabelsContainer.tagsBox.height(this.lineHeight);
			}else{
				this.tagLabelsContainer.tagsBox.css("height","100%");
			}
			this.collapseCtrl.html(this.collapseStatus?this.collapseCtrl.attr("data-open"):this.collapseCtrl.attr("data-close"));
			this.collapseStatus = !this.collapseStatus;
		}
		/**
		 * 检查标签
		 * @param  {Array}  val 已输入的标签
		 * @param  {Object} tmp 索引对象
		 * @return {Object}     索引对象
		 * @private
		 */
		,setTag: function(list){
			var c = this.getConfig();
			var cls = c.tagContainer.tagAct;
			var sels = this.selectedData;
			var tags = this.tags;
			var news = {};
			var text = [];
			util.each(list, function(tag){
				tag = util.trim(tag);
				if (tag === ''){ return; }
				if (!sels[tag] && tags[tag]){
					tags[tag].$el.addClass(cls);
				}
				text.push(tag);
				sels[tag] = news[tag] = 1;
			});
			util.each(sels, function(chk, tag){
				if (chk && !news[tag]){
					if (tags[tag]){
						tags[tag].$el.removeClass(cls);
					}
					return null;
				}
			});
			this.tagLabelsInput.$input.val(text.toString());
			cls = news = sels = tags = null;
			return this.selectedData;
		}
	});
	exports.base = TagLabels;

	var SimpleLabels = TagLabels.extend({
		init: function(config){
			config = pubjs.conf(config, {
				"tagContainer":{
					"class":"M-tagLabelsSimpleContainer"
					,"inClass":"wraper"
				}
			});

			this.Super('init', arguments);
		},
		afterBuild: function(){
			var c = this.getConfig();
			var el = this.getDOM();

			// 标签显示外部容器
			this.tagLabelsContainer = this.create(
				"tagLabelsContainer"
				,view.container
				,{
					"target":el
					,"class":c.tagContainer["class"]
					,"html":'<label class="spLabelTitle">'+c.txts.title+'</label><div class="'+c.tagContainer.inClass+'"></div>'
				}
			);

			this.tagLabelsContainer.tagsBox = this.tagLabelsContainer.$el.find("div:first");

			if(c.collapse){
				this.collapseCtrl = $('<em class="ctrlBnt" data-open="'+LANG("更多")+'" data-close="'+LANG("收起")+'">'+LANG("更多")+'</em>');
				this.tagLabelsContainer.$el.append(this.collapseCtrl);
				this.collapseCtrl.bind("click",this,this.doCollapse);
			}

			// 事件
			this.tagLabelsContainer.tagsBox.delegate("span","click",this,this.appendToInput);

			this.refresh();
		}
		/**
		 * 发送选择请求
		 * @param  {Object}    ev 消息对象
		 * @return {Undefined}    无返回值
		 */
		,appendToInput:function(ev){
			var me = ev.data
				,cn = me.$config.get('tagContainer').tagAct
				,tag = $(this)
				,tags
				,list = [];

			// if(tag.attr('data-name') !== '__all__'){
				tag.toggleClass(cn);
			// }

			tags = tag.parent().find('.' + cn);
			// list = null;

			if(tag.attr('data-name') == '__all__' && tags.length > 1){
				tags.removeClass(cn);
				tag.addClass(cn);
			}else if(tag.attr('data-name') == '__all__' && tags.length ==1){
				return;
			}else{
				list = [];
				for (var i=0; i<tags.length; i++){
					tag = tags.eq(i).attr(me.$config.get('dataType') && 'data-name' || 'data-id');
					if(me.$config.get('dataType')){
						tag = tags.eq(i).attr('data-name');
					}else{
						tag = +tags.eq(i).attr('data-id');
					}
					if (tag && tag != '__all__'){
						list.push(tag);
					}else{
						tags.eq(i).removeClass(cn);
					}
				}
			}
			me.fire("simpleLabelChange",list);

			me = cn = tag = tags = list = null;
		}
		/**
		 * 请求响应函数
		 * @param  {Object}    err  错误信息
		 * @param  {Object}    data 请求返回的数据
		 * @return {Undefined}      无返回值
		 */
		,onData:function(err,data){
			var c = this.getConfig();

			var tagBox = this.tagLabelsContainer.tagsBox;
			tagBox.removeClass("M-tagLabelsloading");
			if(!err){

				this.removeAllTags();

				this.len = data.total;
				this.data = data.items;
				var _all;
				this.tagLabelsContainer.tagsBox.empty();
				for(var i = 0;i<this.len;i++){
					if(this.data[i].name === "__nolabel__"){
						_all = this.addTag({
							"name":c.txts["__nolabel__"]
							,"count":this.data[i].count
						});
					}else{
						_all = this.addTag(this.data[i]);
					}
					_all.$el.attr('data-name', this.data[i].name);
					if(!c.dataType && (this.data[i].Id || this.data[i]._id)){
						_all.$el.attr('data-id', (this.data[i].Id || this.data[i]._id));
					}
				}
				_all = this.addTag({
					"name":LANG("所有")
					,"count":data.items_child_count
				});
				_all.$el.addClass(c.tagContainer.tagAct);
				this.tagLabelsContainer.tagsBox.prepend(_all.$el);
				_all.$el.attr('data-name', '__all__');

				this.chkLine();

				data = null;
				this.fire("sizeChange");
			}else{
				tagBox.removeClass("M-ajaxErr");
			}
		}
		,doCollapse:function(ev){
			ev.data.toggleLine();
		}
	});
	exports.simple = SimpleLabels;


	// 列表列表类型选择
	var ListType = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'class': 'M-tagLabelsSimpleContainer',
				'target': parent,
				'title': LANG('类型：'),
				'all_label': LANG('所有'),
				'data': [null, LANG('PC广告'), LANG('广告监测')],
				'url': null, // 数据接口地址
				'param': null, // 接口参数
				'format': null, // 数据格式化
				// 是否支持多选
				'multiple':false,
				'collapse':true, // 折叠
				'auto_load': true
			});

			// 数据列表
			this.$data = null;
			//多选的选项
			this.$selected = [];
			// 当前选中的项目
			this.$type = -1;

			this.Super('init', arguments);
		},
		afterBuild: function(){
			var c = this.getConfig();
			var el = this.getDOM();

			$('<label/>').text(c.title).addClass('spLabelTitle').appendTo(el);
			this.$body = $('<div '+(c.collapse?'':'class="M-tagLabelsListTypeBox"')+'/>').appendTo(el);
			this.$wrapBody = $('<div class="wraper"/>').appendTo(this.$body);
			this.$innerBody = $('<div/>').appendTo(this.$wrapBody);
			this.uiProxy(this.$body, 'span', 'click', 'eventClick');
			this.lineHeight = this.$wrapBody.css('line-height');
			this.collapseStatus = false;
			if (c.data){
				this.setData(c.data);
			}else if (c.url && c.auto_load){
				this.load();
			}
		},
		/**
		 * 给指定的label增加样式
		 * @param  {Number} dataId    行所在id
		 * @param  {String} className 增加的class
		 * @return {Boolean}          增加的label数量
		 */
		addClass: function(dataId, className){
			var el = this.getDOM();
			return !!el.find('[data-id='+dataId+']').addClass(className).length;
		},
		eventClick: function(evt, elm){
			var self = this;
			elm = $(elm);
			var type = elm.attr('data-id');
			var mutiple = self.getConfig('multiple');
			if(mutiple){
				var dup
					,parent = elm.parent();
				if(type === undefined){
					type = null;
					self.$body.find('.act').removeClass('act');
					elm.addClass('act');
					self.$selected = [];
				}
				else {
					parent.find('[data-all]').removeClass('act');
					for(var i = 0; i < self.$selected.length; i++){
						if(self.$selected[i] == type){
							self.$selected.splice(i,1);
							elm.removeClass('act');
							dup = true;
							break;
						}
					}
					if(!dup || !self.$selected.length){
						self.$selected.push(type);
						elm.addClass('act');
					}
				}

				this.fire('listTypeChange', {
					'type': type,
					'selected': self.$selected,
					'item': this.$data //&& this.$data[type] || ''
				});
			}
			else {
				if(type === undefined){
					type = null;
				}
				if (type == this.$type){
					return false;
				}
				this.$body.find('.act').removeClass('act');
				this.$type = type;
				elm.addClass('act');
				// 类型如果没有设置值，默认返回产从1～N的数值
				// 全部是null
				this.fire('listTypeChange', {
					'type': type,
					'item': this.$data && this.$data[type] || ''
				});
				return false;
			}
		},
		reset: function(){
			this.$innerBody.empty();
			this.$type = -1;
		},
		setData: function(data){
			this.reset();
			this.$data = data;
			var c = this.getConfig();

			// 所有类型项目固有
			if (c.all_label){
				this.$innerBody.append('<span data-all="1" class="act">'+c.all_label+'</span>');
			}

			// 其他类型
			util.each(data, function(item, id){
				if (!item) {return;}
				var dom = $('<span/>').attr('data-id', id).appendTo(this.$innerBody);
				if (util.isString(item)){
					dom.text(item);
				}else {
					if (item.html){
						dom.html(item.html);
					}else {
						dom.text(item.name);
					}
					if (util.has(item, 'count')){
						dom.append('<i>('+item.count+')</i>');
					}
					if(item.def || (item.id && item.id == c.selected)){
						// 有默认设置则去除之前设定的选中状态
						this.$innerBody.find(".act").removeClass("act");
						dom.addClass("act");
						this.$type = id;
					}
					if (item.cls){
						dom.addClass(item.cls);
					}
				}
			}, this);
			this.$body.parent().addClass('M-tagLabels-allowCollapse');
			this.$wrapBody.height(this.lineHeight);
			var flag = this.$innerBody.height()>(parseInt(this.lineHeight,10)+5);
			if(c.collapse){
				if (!this.collapseCtrl){
					this.collapseCtrl = $('<em class="ctrlBnt" />')
						.attr('data-open', LANG('更多'))
						.attr('data-close', LANG('收起'))
						.text(LANG('更多'))
						.appendTo(this.$body);
					this.uiBind(this.collapseCtrl,'click','doCollapse');
				}
				this.collapseCtrl.toggle(flag);
			}
		},
		getData: function(all){
			var type = this.$type;
			if (all){
				if (type === null){
					return null;
				}else if (this.$data){
					return this.$data[type];
				}
			}else {
				return type;
			}
		},
		getOrignData:function(){
			return this.$data;
		},
		load: function(param){
			// this.$body.addClass('laoding');

			var c = this.getConfig();
			if (param){
				c.param = util.merge(c.param, param);
			}
			pubjs.data.get(c.url, c.param, this);
		},
		onData: function(err, data){
			var c = this.getConfig();

			if (err){
				pubjs.alert(err.message)
				return false;
			}
			if (util.isFunc(c.format)){
				this.setData(c.format(data.items));
			}else {
				this.setData(data.items);
			}
			return false;
		},
		doCollapse: function(){
			if(this.collapseStatus){
				this.$wrapBody.height(this.lineHeight);
			}else{
				this.$wrapBody.css("height","100%");
			}
			this.collapseCtrl.html(this.collapseStatus?this.collapseCtrl.attr("data-open"):this.collapseCtrl.attr("data-close"));
			this.collapseStatus = !this.collapseStatus;
		}
	});
	exports.listType = ListType;

});