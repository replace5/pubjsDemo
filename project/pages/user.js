define(function(require, exports){
	var pubjs = require('pubjs');
	var util = require('util');
	var view = require('@base/view');

	// 登录界面
	var Login = view.container.extend({
		init: function(config, parent){
			config = pubjs.conf(config, {
				'url': '/user/login',
				'success': null,
				'tag': 'form',
				'text': '测试表单内容',
				'html': '<input type="submit" value="提交" />',
				'class': 'P-userLoginForm',
				'attr': {
					'action': ROOT('data/fack.html'),
					'method': 'POST',
					'target': '__SYS_USER_LOGIN_FRAME__'
				}
			});
			var target = config.get('/target');
			if (target){
				target.removeClass('loading');
			}
			this.Super('init', arguments);
		},
		build: function(){
			var self = this;
			if (self.$ready){ return self; }
			self.Super('build');

			// 构建界面内容
			var html = [
				'<div class="P-userLoginFormLogo"><img src="'+ pubjs.config('app_logo/big') +'" /></div>',
				'<div class="P-userLoginFormTitle">'+LANG("邮箱")+':</div>',
				'<input class="P-userLoginFormInput" type="text" name="email" id="LoginFormEmail" placeholder="'+LANG("请输入您的邮箱")+'">',
				'<div class="P-userLoginFormError" id="LoginFormEmailError" />',
				'<div class="P-userLoginFormTitle">'+LANG("密码")+':</div>',
				'<input class="P-userLoginFormInput" type="password" name="pass" id="LoginFormPass" placeholder="'+LANG("请输入您的密码")+'">',
				'<div class="P-userLoginFormError" id="LoginFormPassError" />',

				'<div class="layout-row P-userLoginFormOption">',
					'<div class="layout-col-5"><label>',
						'<input type="checkbox" id="LoginFormRemember" /> ',
						LANG("记住邮箱"),
					'</label></div>',
					'<div class="layout-col-4"><label>',
						'<input type="checkbox" id="LoginFormAuto" /> ',
						LANG("自动登录"),
					'</label></div>',
					// '<div class="layout-col-3"><a href="#login/forgot">忘记密码?</a></div>',
				'</div>',
				'<div class="P-userLoginFormButtonBar">',
					'<button class="uk-button uk-button-success">'+LANG("登录")+'</button>',
				'</div>',
				'<iframe name="__SYS_USER_LOGIN_FRAME__" style="display:none;"></iframe>'
			].join('');

			self.html(html);

			self.$doms = {
				userError: self.find('#LoginFormEmailError'),
				passError: self.find('#LoginFormPassError'),
				user: self.find('#LoginFormEmail'),
				pass: self.find('#LoginFormPass'),
				remember: self.find('#LoginFormRemember'),
				auto: self.find('#LoginFormAuto')
			};

			// 绑定事件
			self.uiBind('submit', 'eventSubmit');
			self.uiProxy('.P-userLoginFormInput', 'keypress blur', 'eventKeyPress');

			// 初始化表单
			self.reset();

			return self;
		},
		// 重置表单
		reset: function(){
			var doms = this.$doms;
			var username = util.cookie(pubjs.config('login/user_cookie_name'));

			doms.user.removeClass('P-userLoginFormInvalid').val(username || '');
			doms.pass.removeClass('P-userLoginFormInvalid').val('');
			doms.userError.html('');
			doms.passError.html('');

			doms.remember.prop('checked', Boolean(username));
			doms.auto.prop('checked', false);

			return this;
		},
		// 输入框按键事件
		eventKeyPress: function(evt, elm){
			if (evt.type == 'keypress'){
				if (evt.keyCode == 13 && elm.id == 'LoginFormEmail'){
					this.$doms.pass.focus();
					return false;
				}
			}else {
				this.checkForm(elm.id);
			}
		},
		// 表单提交事件
		eventSubmit: function(evt, elm){
			var data = this.checkForm();
			if (!data){
				// 资料不正确, 不提交
				return false;
			}

			// 发送登录请求到服务器
			var param = {
				email: data.user,
				password: data.pass,
				rememberMe: data.auto ? 1 : 0
			};
			pubjs.data.post(this.getConfig('url'), param, this, 'afterLoad', data);
		},
		// 登录请求响应事件
		afterLoad: function(err, data, param){
			if (err){
				if (err.message){
					pubjs.alert(err.message);
				}
				pubjs.error(err);
				return false;
			}

			// 登录成功
			var cookie_name = pubjs.config('login/user_cookie_name');
			if (param.remember){
				util.cookie(
					cookie_name,
					param.user,
					{expires: pubjs.config('login/cookie_expires')}
				);
			}else {
				util.cookie(cookie_name, null);
			}

			// 重置表单
			this.reset();

			// 登录后续处理
			var callback = this.getConfig('success');
			if (util.isFunc(callback)){
				callback(data);
			}
		},
		// 检查表单并返回表单值
		checkForm: function(field){
			var doms = this.$doms;
			var username = util.trim(doms.user.val());
			var password = doms.pass.val();

			if (!field || field == 'LoginFormPass'){
				doms.pass.toggleClass('P-userLoginFormInvalid', !password);
				if (password){
					doms.passError.text('');
				}else {
					doms.passError.text(LANG('请输入帐号密码!'));
				}
			}

			if (!field || field == 'LoginFormEmail'){
				if (util.isEmail(username)){
					doms.userError.text('');
					doms.user.removeClass('P-userLoginFormInvalid');
				}else {
					doms.userError.text(LANG('请输入一个邮箱地址作为登录用户!'));
					doms.user.addClass('P-userLoginFormInvalid');
					username = false;
				}
			}

			if (!username){
				if (!field){
					doms.user.focus();
				}
			}else if (!password){
				if (!field){
					doms.pass.focus();
				}
			}else {
				return {
					user: username,
					pass: password,
					remember: doms.remember.prop('checked'),
					auto: doms.auto.prop('checked')
				};
			}
			return false;
		}
	});
	exports.login = Login;

	// 修改密码
	var Password = view.container.extend({
		init: function(config, parent){
			config = pubjs.conf(config, {
				'class': 'P-userLoginPassword',
				'labels':[LANG('邮&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;箱：'),LANG('新的密码：'),LANG('确认密码：')]
			});
			this.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			var c = self.getConfig();

			var con = [
				'<div class="uk-form">',
					'<div class="email mb15">',
						'<label class="mr15">'+c.labels[0]+'</label>',
					'</div>',
					'<div class="password mb15">',
						'<label class="mr15">'+c.labels[1]+'</label>',
					'</div>',
					'<div class="verify mb15">',
						'<label class="mr15">'+c.labels[2]+'</label>',
					'</div>',
					'<div class="inputField cl"></div>',
				'</div>'
			].join("");

			self.append(con);

			var doms = self.$doms = {
				email: self.find('.email'),
				password: self.find('.password'),
				verify: self.find('.verify'),
				inputField: self.find('.inputField')
			}

			self.createAsync("email", '@base/common/input.text',{
				'value':pubjs.getUser().email,
				'class': 'mt5 uk-width-1-1',
				"target":doms.email,
				'attr':{
					'disabled':true
				}
			});

			self.createAsync("password", '@base/common/input.text',{
				'value':'',
				'class': 'mt5 uk-width-1-1',
				'type':'password',
				"target":doms.password,
				'attr':{
					'placeholder':LANG('请输入新的密码')
				}
			});

			self.createAsync("verify", '@base/common/input.text',{
				'value':'',
				'class': 'mt5 uk-width-1-1',
				'type':'password',
				"target":doms.verify,
				'attr':{
					'placeholder':LANG('请再次输入新密码')
				}
			});

			self.createAsync('save', '@base/common/input.button', {
				'target': doms.inputField,
				'class': 'uk-button-success mr20 mt15',
				'value': LANG('保存')
			});

			self.createAsync('cancel', '@base/common/input.button', {
				'target': doms.inputField,
				'class': 'uk-button mt15 fr',
				'value': LANG('取消')
			});
		},
		onInputClick: function(ev){
			if (ev.from === this.$.save){
				this.save();
			}
			if (ev.from === this.$.cancel){
				this.back();
			}
			return false;
		},
		save: function(){
			var data = this.getData();
			//表单检测
			if (!data.password||!data.verify){
				pubjs.alert(LANG('请填写密码。'));
				return false;
			}

			if (data.password !== data.verify){
				pubjs.alert(LANG('两次密码输入不一致。'));
				return false;
			}

			pubjs.loading.show();
			pubjs.data.put('/user/setpassword', {
				'Password': data.password
			}, this, 'onSave');
		},
		onSave:function(err,data){
			pubjs.loading.hide();
			if(err){
				pubjs.error(err.message);
				pubjs.alert(err.message);
				return false;
			}
			pubjs.alert(LANG('修改成功'), function() {
				pubjs.controller.navigate('');
			});
		},
		back: function(){
			pubjs.controller.navigate(-1);
		},
		reset: function(){
			this.$.password.setValue('');
			this.$.verify.setValue('');
		},
		getData: function(){
			var data = {
				'password': this.$.password.getValue(),
				'verify': this.$.verify.getValue()
			};
			return data;
		}
	});
	exports.password = Password;
});