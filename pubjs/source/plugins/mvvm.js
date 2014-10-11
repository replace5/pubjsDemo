/**
 * MVVM功能模块
 * 生成一个MVVM模块，封装avalon框架
 * 生成了一个全局VM
 *
 */
define(function(require, exports){

	var	pubjs,
		MVVM = null,
		grobalVMConf = require('grobalVMConf'),
		avalon = require('../libs/avalon/avalon.min.js');

	function initMVVM() {
		MVVM = {
			define : function(id, factory) {
				return avalon.define(id, factory);
			},
			scan : function(elem, vmodel) {
				return avalon.scan(elem, vmodel);
			},
			grobalVMDefineName : "grobal_view_model"
		};
		return MVVM;
	}
	function defineGrobalVM(grobalVM){
		pubjs.GrobalVM = avalon.define(MVVM.grobalVMDefineName, function(vm){
			if ( grobalVM ) {
				for (var i in grobalVM){
					if (grobalVM.hasOwnProperty(i)){
						vm[i] = grobalVM[i];
					}
				}
			}
		});
	}

	exports.plugin_init = function(context, callback){
		if (!MVVM) {
			pubjs = context;

			pubjs.MVVM = initMVVM();
			defineGrobalVM(grobalVMConf);
			callback();
		}
	}
});