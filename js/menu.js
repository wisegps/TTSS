(function($, w, d) {
	var ws=null,wc=null;
	var loaded = false;

	//plusReady事件后，自动创建menu窗口；
	$.plusReady(function() {
		ws=plus.webview.currentWebview();
		// 用户点击后
		ws.addEventListener("maskClick",function(){
			closeMenu();
		},false);
		createMenu();
	});
	
	/**
	 * 创建菜单
	 */
	function createMenu(){
		// 创建侧滑页面
		wc = plus.webview.create("vehicle-list.html", "vehicle-list", {
			right: "20%",
			width: "80%",
			popGesture: "none"
		});
		// 侧滑页面关闭后关闭遮罩
		wc.addEventListener('hide', function() {
			ws.setStyle({
				mask: "none"
			});
//			wc = null;
		}, false);
		// 侧滑页面加载后显示（避免白屏）
		wc.addEventListener("loaded", function() {
//			wc.show("slide-in-left", 200);		
			loaded = true;
		}, false);		
	}
	
	/**
	 * 显示菜单菜单
	*/
	function openMenu() {
		// 防止快速点击可能导致多次创建
//		console.log("show menu");
		if(wc && loaded) {
			wc.show("slide-in-left", 200);	
			// 开启遮罩
			ws.setStyle({
				mask: "rgba(0,0,0,0.5)"
			});
			return;
		}
//		// 开启遮罩
//		ws.setStyle({
//			mask: "rgba(0,0,0,0.5)"
//		});
	}
	/**
	 * 关闭侧滑菜单
	 */
	function closeMenu() {
//		wc.close("auto");			
		wc.hide("auto");
	}

	//点击左上角图标，打开侧滑菜单；
	d.querySelector('.mui-icon-bars').addEventListener('tap', openMenu);		
	//在android4.4中的swipe事件，需要preventDefault一下，否则触发不正常
	//故，在dragleft，dragright中preventDefault
	w.addEventListener('dragright', function(e) {
		e.detail.gesture.preventDefault();
	});
	w.addEventListener('dragleft', function(e) {
		e.detail.gesture.preventDefault();
	});
	//主界面向右滑动，若菜单未显示，则显示菜单；否则不做任何操作；
	w.addEventListener("swiperight", openMenu);
	//主界面向左滑动，若菜单已显示，则关闭菜单；否则，不做任何操作；
	w.addEventListener("swipeleft", closeMenu);
	//menu页面向左滑动，关闭菜单；
	w.addEventListener("menu:swipeleft", closeMenu);

	//重写mui.menu方法，Android版本menu按键按下可自动打开、关闭侧滑菜单；
	$.menu = function() {
		if(wc) {
			closeMenu();
		} else {
			openMenu();
		}
	}
})(mui, window, document);