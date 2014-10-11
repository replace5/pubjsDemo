define(function(require, exports){
	var $ = require('jquery');
	var pubjs = require('../../core/pub');
	var util  = require('../../core/util');
	var view  = require('../view');

	/**
	 * Input类
	 */
	var Base = view.widget.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'layout': {
					'tag': 'span',
					'class': 'M-commonInput'
				},
				'class': '',
				'tag': 'input',
				'type': 'button',
				'attr': null,
				'css': null,
				'width': 0,
				'height': 0,
				'value': LANG('按钮'),
				'events': 'click'
			});

			this.Super('init', arguments);
		},
		afterBuild: function(layout){
			var self = this;
			var c = self.getConfig();
			var input = self.$input = $('<'+c.tag+' />');

			// 设置属性
			if (c.attr){
				input.attr(c.attr);
			}
			input.attr('type', c.type);

			// 设置CSS和尺寸
			if (c.css){
				input.css(c.css);
			}
			if (c.width){
				input.width(c.width);
			}
			if (c.height){
				input.height(c.height);
			}

			// 设置样式
			var cls = c['class'] || [];
			if (!util.isArray(cls)){
				cls = [cls];
			}
			if (c.type == 'button'){
				cls.push('uk-button');
			}
			if (cls.length){
				input.addClass(cls.join(' '));
			}

			// 插入对象到目标对象
			if (layout){
				self.append(input);
			}else {
				self.$el = input;
				self.appendTo(c.target);
			}

			// 绑定事件
			if (c.events){
				self.uiBind(input, c.events, 'eventHandler');
			}

			if (c.value){
				self.setValue(c.value);
			}
		},
		// 事件转发
		// onInputClick ..
		eventHandler: function(evt, elm){
			var self = this;
			self.fire('input' + util.ucFirst(evt.type),{
				'value': self.getValue(),
				'target': elm
			});
		},
		setValue: function(value){
			this.$input.val(value);
			return this;
		},
		getValue: function(){
			return this.$input.val();
		},
		// 转发操作
		click: function(){
			var el = this.$input;
			el.click.apply(el, arguments);
			return this;
		},
		blur: function(){
			var el = this.$input;
			el.blur.apply(el, arguments);
			return this;
		},
		focus: function(){
			var el = this.$input;
			el.focus.apply(el, arguments);
			return this;
		},
		enable: function(){
			this.$input.prop('disabled', false);
			return this;
		},
		disable: function(){
			this.$input.prop('disabled', true);
			return this;
		}
	});
	exports.base = Base;

	var Button = Base.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'tag': 'button',
				'icon': null,
				'width': 100
			});

			this.Super('init', arguments);
		},
		setValue: function(val){
			var self = this;
			var icon = self.getConfig('icon');
			var btn = self.$input;
			if (icon){
				icon =
				btn.html('<i class="'+icon+' pr5"></i>' + util.html(val));
			}else {
				btn.text(val);
			}
			return self;
		},
		getValue: function(){
			return this.$input.text();
		}
	});
	exports.button = Button;

	var Text = Base.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'value': '',
				'type':'text',
				'placeholder':null
			});

			this.$bindPlaceholder = false;
			this.Super('init', arguments);

			window.inp = this;
		},
		afterBuild: function(){
			var self = this;
			self.Super('afterBuild', arguments);
			self.setPlaceholder(self.getConfig('placeholder'));
		},
		eventPlaceHolder: function(evt){
			var self = this;
			var input = self.$input;
			var val = input.val();
			var def = self.$placeholder;

			switch (evt && evt.type){
				case 'focus':
					if (val == def){
						val = '';
						input.val(val);
					}
					break;
				case 'blur':
					if (!val){
						val = def;
						input.val(val);
					}
					break;
			}
			input.toggleClass('M-commonInputPlaceholder', (Boolean(def) && (val == def)));
		},
		setPlaceholder: function(val){
			var self = this;
			var bind = self.$bindPlaceholder;
			self.$placeholder = val;
			if (val && !bind){
				self.$bindPlaceholder = true;
				self.uiBind(self.$input, 'focus.placeholder blur.placeholder', self.eventPlaceHolder);
			}else if (!val && bind){
				self.$bindPlaceholder = false;
				self.uiUnbind(self.$input, 'focus.placeholder blur.placeholder');
			}
			self.eventPlaceHolder();
			return self;
		},
		setValue: function(value){
			var self = this;
			self.$input.val(value || self.$placeholder || '');
			// 调用事件, 更新样式
			if (self.$placeholder){
				self.eventPlaceHolder();
			}
			return self;
		}
	});
	exports.text = Text;

	/**
	 * 可增减输入框- 数量可变
	 */
	var FlexibleInput = Text.extend({
		init: function(config, parent){
			config = pubjs.conf(config, {
				'type':'text',
				'placeholder':null,
				'width':''
			});

			this.$data = null;
			this.$amount = 0;
			this.Super('init', arguments);
		},
		afterBuild: function(){
			var con = $('<div class="M-commonFlexibleInputWrap"/>');
			this.append(con);

			//构建input组
			this.$inputGroup = $('<div class="M-commonFlexibleInput"></div>').appendTo(con);
			//按钮-新增一个输入框
			var addBtn = $('<span class="M-commonFlexibleInputAdd">+</span>').appendTo(con);

			//绑定按钮事件
			this.uiBind(addBtn,"click", "eventAddItem");
			this.uiProxy(this.$inputGroup, '.M-commonFlexibleInputDel', 'click', 'eventDelItem');

			//构建单条input组
			if (this.$data){
				this.setData(this.$data);
			}else {
				this.buildItem();
			}
		},
		/**
		 * 单条input组
		 * @return {Object} Jquery对象
		 */
		buildItem: function(value){
			var c = this.getConfig();

			//单条input组
			var inputDiv =$('<div class="M-commonFlexibleInputDiv"/>').appendTo(this.$inputGroup);

			// 输入框input
			this.input = this.create(Text,{
				'placeholder': c.holder,
				'value': value || '',
				'width': c.width,
				'attr':{'id': c.id}
			}).appendTo(inputDiv);


			//按钮-删除当前输入框
			$('<span class="M-commonFlexibleInputDel">x</span>').appendTo(inputDiv);

			this.$amount++;
			if (this.$amount > 1){
				this.$inputGroup.find(".M-commonFlexibleInputDel").show();
			}
		},
		/**
		 * 新增输入框 -按钮的回调事件
		 * @param  {object} ev 事件对象
		 */
		eventAddItem: function(ev, elm){
			this.buildItem();
		},
		/**
		 * 删除输入框 -按钮的回调事件
		 * @param  {object} ev 事件对象
		 */
		eventDelItem: function(ev, elm){
			if(this.$amount > 1){
				this.$amount--;
				$(elm).parent().remove();
				//若只剩下一个输入框，隐藏删除按钮
				if(this.$amount==1){
					this.$inputGroup.find(".M-commonFlexibleInputDel").hide();
				}
			}
		},
		getData: function(){
			//在数组inputs中的每一条，返回各自的val;
			//保存在data数组里面。
			var inputs = this.getDOM().find("input");
			var data = [], val;
			for(var i=0; i<inputs.length; i++){
				val = util.trim($(inputs[i]).val());
				if (val !== ''){
					data.push(val);
				}
			}
			return data;
		},
		setData: function(data){
			this.$data = data;
			if(data){
				this.$inputGroup.empty();
				this.$amount = 0;
				for(var i=0; i<data.length; i++){
					//调用buildItem，创建输入框
					this.buildItem(data[i]);
				}
				if (this.$amount === 0){
					this.buildItem();
				}
			}else {
				this.reset();
			}
		},
		reset: function(){
			this.$data = null;
			this.$inputGroup.empty();
			this.$amount=0;
			this.buildItem();
		}
	});
	exports.flexibleInput = FlexibleInput;

	/**
	 * 按钮组模块
	 */
	var ButtonGroup = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'items': null,
				'selected': null,
				'no_state': false,
				'disabled': false
			});
			this.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			self.$doms = {};
			self.buildItems();
			self.updateSelected();
			self.addClass('uk-button-group');
			self.uiProxy('input', 'click', 'eventClick');
		},
		/**
		 * 禁用某几个按钮
		 * @param  {Array}  items   按钮索引数组
		 * @return {Object}         实例对象
		 */
		disableItems:function(items){
			var self = this;
			var c = self.getConfig();
			var doms = self.$doms;
			util.each(c.items, function(item, index){
				doms['item_'+index].prop('disabled', false);
			});

			util.each(items, function(item){
				item = doms['item_'+item];
				if (item){
					item.prop('disabled', true);
				}
			});
			return self;
		},
		// 生成按钮组按钮项目
		buildItems: function(){
			var self = this;
			var doms = self.$doms;
			var c = self.getConfig();
			util.each(c.items, function(item, index){
				var id = 'item_'+index;
				var name = (item && item.text) || item;
				if (util.has(doms, id)) {return;}

				var dom = $('<input class="uk-button" type="button"/>');
				doms[id] = dom.attr('data-id', index)
							.val(name)
							.prop('disabled', item.disabled || c.disabled);
				self.append(dom);
			});
			return self;
		},
		// 更新按钮选中状态
		updateSelected: function(){
			var self = this;
			var c = self.getConfig();
			if (c.no_state) {return false;}
			var doms = self.$doms;
			self.getDOM().children('.uk-active').removeClass('uk-active');
			if (c.selected !== null){
				var item = doms['item_' + c.selected];
				if (item){
					item.addClass('uk-active');
				}
			}
			return self;
		},
		// 按钮点击事件
		eventClick: function(evt, elm){
			var c = this.getConfig();
			var id = $(elm).attr('data-id');
			if (!c.no_state && id === c.selected){ return false; }
			var msg = {
				last: c.selected,
				selected: id,
				item: c.items[id] || null
			};
			c.selected = id;
			if (!c.no_state) { this.setData(id); }
			this.fire('changeButton', msg);
		},
		// 重置控件, 清除按钮组选项按钮
		reset: function(){
			var self = this;
			util.each(self.$doms, function(item, name){
				if (name == 'group') {return;}
				item.remove();
				return null;
			});
			var c = self.getConfig();
			c.items = null;
			c.selected = null;
			return self;
		},
		// 设置控件数据
		setData: function(selected, items){
			var self = this;
			var c = self.getConfig();
			if (util.isArray(selected)){
				items = selected;
			}else {
				c.selected = selected;
			}
			if (items){
				self.reset();
				c.items = items;
				self.buildItems();
			}
			self.updateSelected();
			return self;
		},
		// 获取选中状态
		getData: function(complete){
			var c = this.getConfig();
			return complete?{
				"id":c.selected,
				"text":c.items[c.selected]
			}:c.selected;
		},
		/**
		 * 设置单个控件的数据
		 * @param {Number} index 索引
		 * @param {Object} data  数据item
		 */
		setItem: function(index, data) {
			var self = this;
			var item = self.getConfig('items/'+index);
			item = $.extend(item, data);
			var id = 'item_' + index;
			var name = item && item.text;
			self.$doms[id].val(name);
			return self;
		}
	});
	exports.buttonGroup = ButtonGroup;


	/**
	 * 时间粒度切换模块
	 */
	var TimeRange = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'items': [
					LANG('小时'), LANG('天'), LANG('周'),
					LANG('月'), LANG('季'), LANG('年')
				],
				'selected': 0
			});
			this.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			var c = self.getConfig();
			self.addClass('M-commonTimeRange');
			self.create('buttons', ButtonGroup, {
				'items': c.items,
				'selected': c.selected
			});
		},
		/**
		 * 切换时间粒度
		 */
		onChangeButton: function(ev){
			var c = this.getConfig();
			c.selected = +ev.param.selected;
			this.fire('changeTimeRange', {
				selected: (c.selected ? c.selected : 6),
				item: ev.param.item
			});
			return false;
		},
		/**
		 * 禁用某几个按钮
		 * @param  {Array}  items   按钮索引数组
		 * @return {Object}         实例对象
		 */
		disableItems:function(items){
			if(!items || !items.length){
				return this;
			}
			this.$.buttons.disableItems(items);
			var sel = this.getConfig('selected');
			if (util.index(items, sel) != null){
				// 粒度已经被禁用, 变为小时粒度
				this.setData(6);
			}
			return this;
		},
		getData: function(detail){
			var item = this.$.buttons.getData(true);
			if (!item.id){
				item.id = 6;
			}
			return detail ?  item : item.id;
		},
		setData: function(sid){
			if (sid == 6){
				sid = 0;
			}
			var btns = this.$.buttons;
			btns.setData.apply(btns, arguments);
			this.setConfig('selected', sid);

			return this;
		},
		setDateRange: function(date){
			var days = Math.round((util.toDate(date.enddate) - util.toDate(date.begindate)) / 86400000);
			var items = [];
			if (days < 365){ items.push(5); }
			if (days < 90){ items.push(4); }
			if (days < 30){ items.push(3); }
			if (days < 7){ items.push(2); }
			if (days < 1){ items.push(1); }
			this.disableItems(items);
			return this;
		}
	});
	exports.timeRange = TimeRange;

	// 该模块用于生成多个radio
	var RadioGroup = view.container.extend({
		init: function(config) {
			config = pubjs.conf(config, {
				// 当items要从远端拉取时的url地址
				'class': 'M-commonRadioGroup',
				'url': null,
				'param': null,
				'auto_load': true,
				// data为初始化列表
				// {'text': label中的文字, 'value': radio中的value, 'checked': 是否选中, 不填则不选}
				'data': null,
				// 初始化状态
				'value': null,
				// 根据请求数据生成时用到，对应checkbox的value
				'key': 'value',
				// 根据请求数据生成时用到，对应checkbox的label
				'name': 'text',
				// 是否显示搜索框
				'search': false,
				// 限制高度出现滚动条
				'height': 0
			});

			var self = this;
			// 使用guid来生成不重复的name
			self.$inputName = 'input' + util.guid();
			self.$inputType = self.$inputType || 'radio';

			// 储存所有item数据
			self.$data = null;
			self.$list = null;
			self.$value = config.get('value');
			self.$index = null;

			self.Super('init', arguments);
		},
		afterBuild: function() {
			var self = this;
			var el = self.getDOM();
			var c = self.getConfig();
			// 添加搜索框
			if (c.search) {
				var searchDiv = $('<div class="M-commonRadioGroupSearch"/>').appendTo(el);
				var input = self.$searchInput = $('<input type="text" class="checkBoxGroupSearch" />');
				input.attr('placeholder', LANG('请输入搜索关键字')).appendTo(searchDiv);
				self.uiBind(input, 'keyup', 'eventSearchInputKeyup');

				var btn = $('<button class="uk-button" />').text(LANG('取消')).appendTo(searchDiv);
				self.uiBind(btn, 'click', 'eventClearSearch');
			}

			var itemCon = self.$itemsDiv = $('<div class="items"></div>').appendTo(el);
			if (c.height){
				var con = $('<div />').css('max-height', c.height).appendTo(el);
				self.$itemsDiv.appendTo(con);
				self.createAsync('scroller', '@base/common/base.scroller', {
					'dir': 'V',
					'target': con,
					'content': itemCon,
					'wrap': true,
					'watch': true
				});
			}

			self.uiProxy(itemCon, 'input', 'change', 'eventValueChange');

			if (c.data) {
				self.setData(c.data);
			}else if (c.url && c.auto_load){
				self.load();
			}
		},
		// 构建选项项目
		buildItems: function(items) {
			var self = this;
			var c = self.getConfig();
			var con = self.$itemsDiv;
			var type = self.$inputType;
			var name = self.$inputName;

			// 首先清空所有item
			con.empty();

			util.each(items, function(item, index){
				var label = $('<label/>').text(item[c.name]).appendTo(con);
				var input = $('<input type="'+type+'"/>').prependTo(label);
				input.attr('name', name).attr('value', index);
			});

			if (self.$value !== null){
				self.setValue(self.$value);
			}
		},
		// 搜索框的事件，每有输入的时候就进行搜索
		eventSearchInputKeyup: function(ev) {
			var self = this;
			var items = self.$list;

			if (items){
				// 获得输入框文字
				var inputText = this.$searchInput.val();
				if (inputText){
					// 过滤项目
					var result = {};
					var name = self.getConfig('name');
					util.each(items, function(item, index){
						if (item[name].indexOf(inputText) !== -1) {
							result[index] = item;
						}
					});
					self.buildItems(result);
				}else {
					// 显示所有项目
					self.buildItems(items);
				}
			}
		},
		eventClearSearch: function(evt){
			this.$searchInput.val('');
			this.eventSearchInputKeyup(evt);
			return false;
		},
		eventValueChange: function(evt, elm){
			var self = this;
			self.$index = elm.value;
			var item = (self.$list && self.$list[elm.value]);
			if (item){
				this.$value = item[self.getConfig('key')];
			}
			// 冒泡单选框变化事件
			this.fire('radioChange', this.$value);
		},
		// 设置加载参数
		setParam: function(param){
			return this.extendConfig('param', param);
		},
		// 加载数据
		load: function(){
			var self = this;
			var c = self.getConfig();

			pubjs.sync();
			pubjs.data.get(c.url, c.param, self, 'afterLoad');
			return self;
		},
		afterLoad: function(err, data){
			if (err){
				if (err.message){
					pubjs.alert(err.message);
				}
				pubjs.error(err);
			}else {
				this.setData(data.items);
			}
			pubjs.sync(true);
		},
		// 设置当前值
		setValue: function(value){
			var self = this;
			var con = self.$itemsDiv;
			var key = self.getConfig('key');
			// 保存数据
			self.$value = value;
			if (self.$list){
				self.$index = util.index(self.$list, value, key);

				// 更新状态
				con.find('input').prop('checked', false);
				con.find('input[value="'+self.$index+'"]').prop('checked', true);
			}
			return self;
		},
		// 获取当前值
		getValue: function(){
			return this.$value;
		},
		getFullValue: function(){
			var self = this;
			return (self.$list && self.$list[self.$index]);
		},

		// 返回当前显示数据对象列表
		getData: function() {
			return this.$data;
		},
		// 设置要显示的对象列表, 构建对象
		setData: function(data) {
			this.$data = data;
			var list = this.$list = {};
			util.each(data, function(item, index){
				list[index] = item;
			});
			// 构建子项目
			this.buildItems(list);

			return this;
		},
		// 重置模块
		reset: function() {
			var self = this;
			self.$data = self.$value = self.$index = self.$list = null;
			self.$itemsDiv.empty();
			if (self.$searchInput){
				this.$searchInput.val('');
			}

			var c = self.getConfig();
			if (c.data){
				self.setData(c.data);
			}else if (c.auto_load && c.url){
				self.load();
			}
			return self;
		}
	});
	exports.radioGroup = RadioGroup;

	// 多选框Checkbox分组模块
	var CheckBoxGroup = RadioGroup.extend({
		init: function(){
			var self = this;
			self.$inputType = 'checkbox';
			self.Super('init', arguments);
		},
		eventValueChange: function(evt, elm){
			var self = this;
			var val = elm.value;
			var key = self.getConfig('key');
			var item = (self.$list && self.$list[val]);
			var index = self.$index = (self.$index || []);
			var value = self.$value = (self.$value || []);

			var pos = util.index(index, val);
			if (elm.checked){
				if (pos === null){
					index.push(val);
					value.push(item[key]);
				}
			}else {
				if (index !== null){
					index.splice(pos, 1);
					value.splice(pos, 1);
				}
			}
		},
		setValue: function(value){
			var self = this;
			var con = self.$itemsDiv;
			var key = self.getConfig('key');
			var list = self.$list;
			// 保存数据
			self.$value = value;
			// 查找选中的项目
			if (list){
				var index = self.$index = [];
				util.each(value, function(id){
					var idx = util.index(list, id, key);
					if (idx !== null){
						index.push(idx);
					}
				});

				// 更新状态
				con.find('input').prop('checked', false).each(function(idx, input){
					input.checked = (util.index(index, input.value) !== null);
				});
			}
			return self;
		},
		getFullValue: function(){
			var self = this;
			var list = self.$list;
			var result = [];
			if (list){
				util.each(self.$index, function(idx){
					result.push(list[idx]);
				})
			}
			return result;
		}
	});
	exports.checkboxGroup = CheckBoxGroup;
});