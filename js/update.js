/**
 * 参考文档：http://ask.dcloud.net.cn/article/431
 * 升级文件为JSON格式数据，如下：
 * 
 * 需升级
 {
	"status":1,
	"version": "2.6.0",
	"title": "Hello MUI版本更新",
	"note": "修复“选项卡+下拉刷新”示例中，某个选项卡滚动到底时，会触发所有选项卡上拉加载事件的bug；\n修复Android4.4.4版本部分手机上，软键盘弹出时影响图片轮播组件，导致自动轮播停止的bug；",
	"url": "http://www.dcloud.io/hellomui/HelloMUI.apk"
}
*
* 无需升级
{"status":0}
 */
var server = "https://wop-api.chease.cn/check/update"; //获取升级描述文件服务器地址

function update() {
	console.log('check update');
	mui.getJSON(server, {
		"appid": plus.runtime.appid,
		"version": plus.runtime.version,
		"imei": plus.device.imei,
		"platform": plus.os.name
	}, function(data) {
		console.log(JSON.stringify(data));
		if(data.status) {
			plus.ui.confirm(data.note, function(i) {
				if(0 == i) {
					plus.runtime.openURL(data.url);
				}
			}, data.title, ["立即更新", "取　　消"]);
		} else {
//			mui.toast('目前已是最新版本')
		}
	});
}

mui.os.plus && !mui.os.stream && mui.plusReady(update);