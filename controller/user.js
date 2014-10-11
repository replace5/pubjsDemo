define(function(require, exports){
	/**
	 * 密码修改界面
	 */
	exports.onPassword = function(controller, data, app){
		var cont = app.getContainer('scenes=login');
		// cont.addClass('appScenesLoginMain');

		var pass = app.core.get('SYS_USER_PASSWORD');
		if (!pass){
			// cont.addClass('loading');
			app.core.createAsync(
				'SYS_USER_PASSWORD',
				'pages/user.password',
				{
					target: cont.getDOM()
				}
			);
		}else {
			pass.reset();
		}
	}
});