define(function(require, exports){
	// 读写本地存储设置
	// IE UserData 兼容设置
	function UserData(name){
		var self = this,
			data = null,
			file = name || location.hostname;

		var init = function(){
			if (data === null) {
				try {
					data = document.createElement('INPUT');
					data.id = 'IE_USERDATA_HOLDER';
					data.type = "hidden";
					data.style.display = "none";
					data.addBehavior ("#default#userData");
					document.body.appendChild(data);
					var expires = new Date();
					expires.setDate(expires.getDate()+365);
					data.expires = expires.toUTCString();
				} catch(e) {
					data = false;
					return false;
				}
			}
			return data;
		}

		self.setItem = function(key, value) {
			 if(init()){
				data.load(file);
				data.setAttribute(key, value);
				data.save(file);
			}
		}

		self.getItem = function(key) {
			if(init()){
				data.load(file);
				return data.getAttribute(key)
			}
		}

		self.removeItem = function(key) {
			if(init()){
				data.load(file);
				data.removeAttribute(key);
				data.save(file);
			}
		}
	}

	var localStore = window.localStorage || new UserData();
	function storage(name, value){
		if (!localStore){
			return;
		}
		if (arguments.length == 1){
			value = localStore.getItem(name);
			return (value === undefined) ? null : value;
		}else {
			if (value === null){
				localStore.removeItem(name);
			}else {
				localStore.setItem(name, value);
			}
			return value;
		}
	}

	exports.plugin_init = function(pubjs, callback){
		pubjs.storage = storage;
		callback();
	}
});