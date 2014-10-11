define(function(require, exports){
	var $ = require('jquery');

	/**
	 * 拖动控制模块
	 * @description 只传入dom参数, 可以取消绑定
	 * @param {jQuery}   dom      绑定触发拖拽的jQuery对象
	 * @param {Object}   data     <可选> 回调事件参数
	 * @param {Function} callback 回调函数
	 * @param {Object}   context  <可选> 回调函数调用域
	 */
	function Drag(dom, data, callback, context){
		if (!dom){
			return false;
		}
		if (!dom.jquery){
			dom = $(dom);
		}
		if (arguments.length == 1){
			dom.unbind('mousedown.drag', DragEvent);
		}else {
			if (data instanceof Function){
				context = callback;
				callback = data;
				data = null;
			}
			dom.bind('mousedown.drag', {
				cb: callback,
				ct: context || window,
				data: data
			}, DragEvent);
		}
		return false;
	}
	/**
	 * 拖拽DOM事件处理封装函数
	 * @param {Event} evt jQuery事件对象
	 */
	function DragEvent(evt){
		var ev = evt.data;
		var X = evt.pageX, Y = evt.pageY;
		ev.type = 'moveDrag';
		switch (evt.type){
			case 'mouseup':
				$(document).unbind('mouseup.drag', DragEvent);
				$(document).unbind('mousemove.drag', DragEvent);
				ev.type = 'endDrag';
			/* falls through */
			case 'mousemove':
				ev.dx = X - ev.x;
				ev.dy = Y - ev.y;
				ev.cdx = X - ev.cx;
				ev.cdy = Y - ev.cy;
				ev.cx = X;
				ev.cy = Y;
				ev.cb.call(ev.ct, ev, evt);
			break;
			case 'mousedown':
				if (evt.button == 2){
					return;
				}
				ev.cx = ev.x = X;
				ev.cy = ev.y = Y;
				ev.dx = ev.cdx = 0;
				ev.dy = ev.cdy = 0;
				ev.type = 'startDrag';
				if (ev.cb.call(ev.ct, ev, evt)){
					$(this.ownerDocument)
						.bind('mouseup.drag', ev, DragEvent)
						.bind('mousemove.drag', ev, DragEvent);
				}else {
					return;
				}
			break;
		}
		return false;
	}
	exports.drag = Drag;

	exports.plugin_init = function(pubjs, callback){
		pubjs.drag = Drag;
		callback();
	}
})