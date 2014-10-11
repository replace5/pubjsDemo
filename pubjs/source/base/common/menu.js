define(function( require, exports ){
	var $ = require('jquery');
	var pubjs = require('pubjs');
	var util  = require('util');
	var view  = require('@base/view');

	var Menu = view.container.extend({
		init: function( config ) {
			config = pubjs.conf( config, {
				'target': pubjs.DEFAULT_POPUP_CONTAINER,
				'trigger': null,		// 模块创建触发源
				'algin': 'left-bottom',	// 对齐方式

				'width': 160,			// 选项宽度
				'height': 30,			// 选项高度
				'scroll_height': 0,		// 有滚动条时整个菜单的高度
				'space': 5,				// 弹出菜单与显示框的间距
				'line_space': 5,		// 分割线与上下的间距
				'pageX': 0,				// 自定义菜单横坐标
				'pageY': 0,				// 自定义菜单纵坐标

				'options': null,		// 自定义选项<数组形式>
				'option_render': null,	// 选项渲染函数
				'url': null,			// 选项数据拉取地址
				'key': 'id',			// 选项 关键字 字段名
				'name': 'name',			// 选项 显示文字 字段名
				'skey': 'subs',			// 选项 子项关键字 字段名
				'sub_dir': 'right',		// 子菜单的展开方向<只能是right或left>
				'param': null,			// 拉取数据时的参数
				'auto_load': true,		// 自动拉取数据
				'search': false,		// 是否含有搜索框,如果有设置为keyup或者button
				'callback': null,		// 选中数据后的回调函数
				'relate_elm': null,		// 关联元素
				'z': 1000				// 菜单zindex
			});

			this.$subArr = [];			// 存放下一级子菜单
			this.$count = 0;			// 含有子菜单的选项计数(sub-id属性)
			this.$data = {};			// 选项数据缓存
			this.$fmod = {};			// 父选项信息缓存
			this.$timeStamp = 0;		// 记录事件发生时间戳
			this.$doms = {};			// DOM缓存
			this.Super( 'init', arguments );
		},
		afterBuild: function() {
			var self = this;
			var C = self.getConfig();
			self.$el = self.getDOM();
			// 设置选项数据
			if( C.url && C.auto_load ) {
				self.load();
			}
			else {
				self.setData( C.options );
			}
		},

		/**
		 * [setData 设置数据]
		 * @param {[type]} options [数据选项<数组>]
		 */
		setData: function( options ) {
			var self = this;
			var C = self.getConfig();
			self.createPanel( options );
			self.$data = C.options = options;
		},

		/**
		 * [getData 获取选中的数据]
		 * @param  {[type]} opt []
		 */
		getData: function( opt ) {
			return this.$data;
		},

		/**
		 * [load 拉取数据]
		 * @param  {[type]} param [参数]
		 */
		load: function( param ) {
			var C = this.getConfig();
			if( param ) {
				C.param = util.merge( C.param, param );
			}
			pubjs.data.get( C.url, C.param, this );
		},

		/**
		 * [onData 拉取数据回调]
		 * @param  {[type]} error [错误对象]
		 * @param  {[type]} data  [返回数据]
		 */
		onData: function( error, data ) {
			var self = this;
			if( error ) {
				pubjs.error( error.message );
				return;
			}
			self.setData( data.items );
			self.fire( 'menuDataLoaded', {
				'data': self.$data
			});
		},

		/**
		 * [createPanel 创建菜单选项面板]
		 * @param  {[Array]} options [需要构建的选项数组]
		 */
		createPanel: function( options ) {
			var self = this;
			var opts = options;
			var C = self.getConfig();
			var elm = C.trigger;
			// 选项和分割线数目
			self.$itemSum = 0;
			self.$lineSum = 0;
			// 创建菜单外层面板
			self.$el.addClass('M-Menu');
			self.$doms.options = $('<ul class="M-MenuOptions"/>').appendTo( self.$el );
			// 创建选项
			if( util.isArray( opts ) ) {
				util.each( opts, self.buildItems, self );
			}
			// 渲染选项样式
			self.renderItems().setZindex( C.z );

			// 定位菜单的出现位置
			if( $(elm).hasClass('hasSub') && $(elm).attr('sub-id') ) {
				self.setSubMenuPosition( elm );
			}
			else {
				self.setMenuPosition( elm );
			}

			// 如果有搜索框
			if( C.search == 'keyup' || C.search == 'button' ) {
				self.addSearch( C.search );
			}
		},

		/**
		 * [buildItems 在each循环中创建选项]
		 * @param  {[type]} item [选项对象]
		 * @param  {[type]} idx  [数组下标]
		 */
		buildItems: function( item, idx ) {
			var self = this;
			var C = self.getConfig();
			var li = $('<li class="option"/>');
			var anchor, lyt;
			// 如果是分割线
			if( item === '-' ) {
				li.removeClass('option').addClass('option-line').css('margin', C.line_space + 'px 0');
				self.$lineSum++;
			}
			// 正常选项, TODO：选项添加Icon的形式
			else {
				anchor = $('<a href="#" data-id="'+ item[C.key] +'"/>');
				if( util.isFunc( C.option_render ) ) {
					lyt = C.option_render( idx, item, anchor ) || '';
				}
				else {
					lyt = item[C.name];
				}
				anchor.html( lyt );
				anchor.appendTo( li );
				// 含有子项，添加箭头
				if( item[C.skey] ) {
					li.addClass('hasSub')
					.attr( 'sub-id', self.$count++ )
					.append('<b class="more"/>');
					// 缓存子菜单
					self.$subArr.push( item[C.skey] );
				}
				self.$itemSum++;
			}
			// 选项插入到ul中
			li.appendTo( self.$doms.options );
		},

		/**
		 * [renderItems 创建完选项后渲染选项样式]
		 */
		renderItems: function() {
			var self = this;
			var C = self.getConfig();
			var uh = C.height + 'px';
			// 设置菜单面板宽度
			self.$el.width( C.width );
			// 设置选项高度
			self.$el.find('.option').css({
				'height': uh,
				'line-height': uh
			});
			// 选项li的鼠标移入事件
			self.uiBind( self.$el.find('.option'), 'mouseenter', self.eventItemMouseEnter, self );
			// 选项点击事件
			self.uiBind( self.$el.find('.option'), 'click', self.eventItemSelect, self );
			// 点击模块内部不消失
			self.uiBind( self.$el, 'mouseup', self.eventClickModule, self );
			// 点击空白处移除模块
			self.uiBind( $('body'), 'mouseup', self.eventClickBlank, self );
			if( C.relate_elm ) {
				self.uiBind( C.relate_elm, 'mouseup', self.eventClickModule, self );
			}
			return self;
		},

		/**
		 * [addSearch 添加搜索框]
		 * @param {[String]} type [搜索类型,keyup或者button]
		 */
		addSearch: function( type ) {
			var self = this;
			var sbox = $('<div class="M-MenuSearch"/>');
			var input = $('<input type="text" class="M-MenuSearchInput" placeholder="'+ LANG("请输入搜索内容") +'">').appendTo( sbox );
			var emClear = $('<em class="M-MenuSearchClearWord"/>').appendTo( sbox ).hide();
			var emBtn = $('<em class="M-MenuSearchBtnClick"/>').appendTo( sbox ).hide();
			// 搜索框插到选项ul之前
			sbox.insertBefore( self.$doms.options );
			input.focus();
			// DOM缓存
			self.$doms.searchInput = input;
			self.$doms.searchEmClear = emClear;
			self.$doms.searchEmBtn = emBtn;
			// 搜索类型
			switch( type ) {
				case 'keyup':
					emClear.show();
					self.uiBind( input, 'keyup', self.eventSearch, self );
				break;
				case 'button':
					emBtn.show();
					self.uiBind( emBtn, 'click', self.eventSearchBtnClick, self );
				break;
			}
			self.uiBind( emClear, 'click', self.eventSearchClear, self );
			// 鼠标移到搜索框上子菜单消失
			self.uiBind( sbox, 'mouseenter', self.eventSearchMouseEnter, self );
		},

		/**
		 * [eventSearch 搜索事件]
		 * @param  {[type]} evt   [事件类]
		 * @param  {[type]} input [事件源]
		 */
		eventSearch: function( evt, input ) {
			var self = this;
			var val = input === undefined ? '' : $(input).val().trim();
			var C = self.getConfig();
			var opts = C.options;
			var res = val === '' ? opts : self.filterOptions( val, opts );
			// 先清空选项 再创建
			self.$doms.options.empty();
			util.each( res, self.buildItems, self );
			self.renderItems();
		},

		/**
		 * [filterOptions 搜索中过滤选项]
		 * @param  {[type]} val  [搜索词]
		 */
		filterOptions: function( val, opts ) {
			var ret = [];
			var C = this.getConfig();
			var leng = opts.length;
			var isline = true;
			for( var i = 0; i < leng; i++ ) {
				if( opts[i] === '-' ) {
					if( isline ) {
						ret.push( opts[i] );
						isline = false;
					}
					continue;
				}
				var Name = opts[i][C.name].toLowerCase();
				if( Name.indexOf( val.toLowerCase() ) != -1 ) {
					ret.push( opts[i] );
					isline = true;
				}
			}
			// 开头和结尾不能有line
			if( ret[0] === '-' ) {
				ret.shift();
			}
			if( ret[ret.length-1] === '-' ) {
				ret.pop();
			}
			return ret;
		},

		/**
		 * [eventSearchClear 清除搜索框内容]
		 */
		eventSearchClear: function( evt, elm ) {
			var self = this;
			var C = self.getConfig();
			self.eventSearch();
			self.$doms.searchInput.val('').focus();
			if( C.search === 'button' ) {
				$(elm).hide();
				self.$doms.searchEmBtn.show();
			}
		},

		/**
		 * [eventSearchBtnClick 点击搜索按钮方式搜索]
		 */
		eventSearchBtnClick: function( evt, elm ) {
			var self = this;
			var opts = self.getConfig().options;
			var val = self.$doms.searchInput.val().trim();
			if( val === '' ) {
				self.$doms.searchInput.focus();
				return;
			}
			var res = self.filterOptions( val, opts );
			self.$doms.options.empty();
			util.each( res, self.buildItems, self );
			self.renderItems();
			$(elm).hide();
			self.$doms.searchEmClear.show();
		},

		/**
		 * [eventSearchMouseEnter 鼠标移到搜索框内也要消除子模块]
		 */
		eventSearchMouseEnter: function() {
			var self = this;
			var sub = self.get('subMenu');
			if( sub ) {
				sub.destroy();
			}
		},

		/**
		 * [getSrcPosition 获取触发元素的位置]
		 * @param  {[type]} elm   [触发元素]
		 * @return {[Object]}     [包含left和top属性]
		 */
		getSrcPosition: function( elm ) {
			return $(elm).offset();
		},

		/**
		 * [getSrcSize 获取触发元素的宽高]
		 * @param  {[type]} elm   [触发元素]
		 * @return {[Object]}     [包含width和height]
		 */
		getSrcSize: function( elm ) {
			return {
				'width': $(elm).width(),
				'height': $(elm).height()
			}
		},

		/**
		 * [setMenuPosition 设置一级菜单的弹出位置]
		 * @param  {[type]} elm   [触发元素]
		 */
		setMenuPosition: function( elm ) {
			var self = this;
			var C = self.getConfig();
			var mLeft, mTop;
			// 触发元素的位置和尺寸
			var pos = self.getSrcPosition( elm );
			var size = self.getSrcSize( elm );
			var ih = document[document.compatMode === "CSS1Compat" ? "documentElement" : "body"].clientHeight;
			// 保留高度
			var remain = 0;
			// 菜单总高度
			var menuHeight = self.$itemSum * C.height + self.$lineSum * ( C.line_space * 2 + 1 ) + 2;
			var al = C.algin.split('-');
			var lb = ( al[0] === 'left' && al[1] === 'bottom' );
			var rb = ( al[0] === 'right' && al[1] === 'bottom' );
			var lt = ( al[0] === 'left' && al[1] === 'top' );
			var rt = ( al[0] === 'right' && al[1] === 'top' );
			// 自定义位置
			if( C.pageX || C.pageY ) {
				mLeft = C.pageX;
				mTop = C.pageY;
			}
			else {
				// 左下
				if( lb ) {
					mLeft = pos.left;
					mTop = pos.top + size.height + C.space;
					remain = ih - mTop;
				}
				// 右下
				if( rb ) {
					mLeft = pos.left - C.width + size.width;
					mTop = pos.top + size.height + C.space;
					remain = ih - mTop;
				}
				// 左上
				if( lt ) {
					mLeft = pos.left;
					mTop = pos.top - C.space - menuHeight;
					remain = pos.top;
				}
				// 右上
				if( rt ) {
					mLeft = pos.left - ( C.width - size.width );
					mTop = pos.top - C.space - menuHeight;
					remain = pos.top;
				}
			}
			// 菜单定位
			self.$el.css({'left': mLeft, 'top': mTop});

			// 高度超出可视区使用滚动条
			if( menuHeight > remain && remain !== 0 ) {
				if( C.scroll_height ) {
					remain = C.scroll_height;
				}
				self.$el.css( 'height', remain );
				// 定位在上方的要重新设置top值
				if( lt || rt ) {
					self.$el.css( 'top', pos.top - C.space - remain );
				}
				self.createAsync('scroll', '@base/common/base.scroller', {
					'target': self.$el,
					'content': self.$doms.options,
					'dir': 'V'
				});
			}
		},

		/**
		 * [eventItemMouseEnter 选项li的鼠标移入/出事件]
		 * @param  {[type]} evt [事件]
		 * @param  {[type]} elm [元素]
		 */
		eventItemMouseEnter: function( evt, elm ) {
			var self = this;
			var sid = $(elm).attr('sub-id');
			var sub = self.get('subMenu');
			if( evt.type == 'mouseenter' ) {
				// 子菜单注销
				if( sub && ( !sid || sid != self.$sid ) ) {
					$(elm).siblings('li').removeClass('act');
					sub.destroy();
				}
				if( sid ) {
					var elma = $(elm).find('a');
					self.$fmod = {
						fid: elma.attr('data-id'),
						txt: elma.text()
					};
					$(elm).addClass('act');
					self.createSubMenu( elm );
					// 标记当前展开的子模块
					self.$sid = sid;
				}
			}
		},

		/**
		 * [createSubMenu 创建子菜单]
		 * @param  {[type]} elm [父级Item]
		 */
		createSubMenu: function( elm ) {
			var self = this;
			var C = self.getConfig();
			var idx = +$(elm).attr('sub-id');
			var sub = self.get('subMenu');
			if( !sub ) {
				self.create('subMenu', Menu, {
					'trigger': elm,
					'width': C.width,
					'height': C.height,
					'space': C.space,
					'line_space': C.line_space,
					'key': C.key,
					'name': C.name,
					'skey': C.skey,
					'options': self.$subArr[idx],
					'option_render': C.option_render,
					'search': C.search,
					'sub_dir': C.sub_dir,
					'z': ++C.z
				});
			}
		},

		/**
		 * [setSubMenuPosition 设置子菜单的具体弹出位置]
		 * @param  {[type]} elm [父级菜单]
		 */
		setSubMenuPosition: function( elm ) {
			var self = this;
			var C = self.getConfig();
			var pos = self.getSrcPosition( elm );
			var size = self.getSrcSize( elm );
			var mLeft = 0, mTop = 0;
			// 菜单总高度
			var subHeight = self.$itemSum * C.height + self.$lineSum * ( C.line_space * 2 + 1 ) + 2;
			var ih = document[document.compatMode === "CSS1Compat" ? "documentElement" : "body"].clientHeight;
			var iw = document[document.compatMode === "CSS1Compat" ? "documentElement" : "body"].clientWidth;
			var remain = 0;
			// 确定子菜单的展开方向
			if( iw - pos.left - size.width - C.space < C.width || C.sub_dir === 'left' ) {
				self.setConfig('sub_dir', 'left');
				mLeft = pos.left - C.width + C.space;
				mTop = pos.top;
			}
			else {
				self.setConfig('sub_dir', 'right');
				mLeft = pos.left + size.width + C.space;
				mTop = pos.top;
			}
			// 定位
			self.$el.css({'left': mLeft, 'top': mTop});
			// 超出高度滚动处理
			remain = ih - mTop;
			if( subHeight > remain && remain !== 0 ) {
				self.$el.css( 'height', remain );
				self.createAsync('scroll', '@base/common/base.scroller', {
					'target': self.$el,
					'content': self.$doms.options,
					'dir': 'V'
				});
			}
			return this;
		},

		/**
		 * [eventItemSelect 选项选中/点击事件]
		 * @param  {[type]} evt [事件类]
		 * @param  {[type]} elm [事件源]
		 */
		eventItemSelect: function( evt, elm ) {
			evt.preventDefault();
			evt.stopPropagation();
			var self = this;
			var elma = $(elm).find('a');
			var fid = {
				key: elma.attr('data-id'),
				name: elma.text()
			};
			self.fire( 'menuSelected', [fid] );
		},

		/**
		 * [onItemSelected 发消息]
		 */
		onMenuSelected: function( ev ) {
			var self = this;
			var C = self.getConfig();
			// 如果是子模块发的消息
			if( ev.from != self ) {
				ev.param.unshift({
					key: self.$fmod.fid,
					name: self.$fmod.txt
				});
			}
			// 如果配置有回调函数
			if( C.callback && util.isFunc( C.callback ) ) {
				C.callback.call( self, ev.param );
			}
		},

		/**
		 * [eventClickModule 点击模块内部]
		 * @param  {[type]} evt [事件源]
		 */
		eventClickModule: function( evt, elm ) {
			this.$timeStamp = evt.timeStamp;
		},

		/**
		 * [eventClickBlank 点击空白处移除模块]
		 * @param  {[type]} evt [事件源]
		 */
		eventClickBlank: function( evt ) {
			var self = this;
			if( self.$timeStamp != evt.timeStamp ) {
				self.destroy();
			}
		},

		/**
		 * [setZindex 设置Zindex,用于菜单重叠的情况]
		 * @param {[type]} z [值]
		 */
		setZindex: function( z ) {
			this.$el.css( 'z-index', z );
		}
	});
	exports.base = Menu;
});