define(function(require, exports){

	exports.onMain = function(controller, data, app){
		var cont = app.getContainer('scenes=login&title=' + LANG('登录'));
		cont.addClass('appScenesLoginMain');

		var login = app.core.get('SYS_USER_LOGIN');
		if (!login){
			cont.addClass('loading');
			app.core.createAsync(
				'SYS_USER_LOGIN',
				'pages/user.login',
				{
					'success': function(user){
						app.setUser(user);
						app.core.cast('sysUserLogin', app.getUser());
						controller.afterLogin();
						app.specialTimeWarning();
					},
					'target': cont.getDOM()
				}
			);
		}else {
			login.reset();
		}
	}

	// 用户退出登录
	exports.onLogout = function(controller, data, app){
		// 请求服务器退出登录接口
		app.data.get('/user/logout', function(err, data){
			if (err){
				if (err.message){
					app.alert(err.message);
				}
				app.error(err);
				// 退出失败, 返回上一步地址
				controller.navigate(-1);
			}else {
				// 退出登录成功, 跳转到登陆接口
				var last_user = app.getUser();
				app.core.cast('sysUserLogout', last_user);
				app.setUser(null);
				controller.navigate(app.config('site_base'));
			}
		});
	}

	// 忘记密码
	exports.onForgot = function(controller, data, app){
		var cont = app.getContainer({
			scenes:'main',
			full:true,
			title:'忘记密码'
		});
		if (controller.load_template('login')){
			app.template.setTo(cont.getDOM(), 'forgot');
		}
	}
});