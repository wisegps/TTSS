//方向数据装换文字描述函数
function formatDirect(theta)
{
    var Result = '';
    if (((theta >= 0) && (theta < 22.5)) || ((theta >= 337.5) && (theta <= 360)))
        Result = '正北'; //'正北'
    else if ((theta >= 22.5) && (theta < 67.5))
        Result = '东北'; //'东北'
    else if ((theta >= 67.5) && (theta < 112.5))
        Result = '正东'; //'正东'
    else if ((theta >= 112.5) && (theta < 157.5))
        Result = '东南'; //'东南'
    else if ((theta >= 157.5) && (theta < 202.5))
        Result = '正南'; //'正南'
    else if ((theta >= 202.5) && (theta < 247.5))
        Result = '西南'; //'西南'
    else if ((theta >= 247.5) && (theta < 292.5))
        Result = '正西'; //'正西'
    else if ((theta >= 292.5) && (theta < 337.5))
        Result = '西北'; //'西北';

    return theta + ' (' + Result + ')';
}
//信息窗体
function getVehicleContent(vehicle){
	vehicle.gpsTime = new Date(vehicle.activeGpsData.gpsTime).format("yyyy-MM-dd hh:mm:ss");
	vehicle.rcvTime = new Date(vehicle.activeGpsData.rcvTime).format("yyyy-MM-dd hh:mm:ss");
	vehicle.status = getStatusDesc(vehicle.activeGpsData);
	vehicle.direct = formatDirect(vehicle.activeGpsData.direct);
	vehicle.speed = vehicle.activeGpsData.speed.toFixed(0);
	vehicle.trace = if_track? "不追踪": "追踪"; 
	vehicle.color = if_track? "#EC971F": "#007aff";
	var content = '' +
		'<div class="info-window">' +
//			'<div class="mui-row">' +
//				'<h5>{{vehicleName}}</h5>' +
//			'</div>' +
			'<div class="mui-row">' +
				'<span>接收时间: {{rcvTime}}</span>' +
			'</div>' +
			'<div class="mui-row">' +
				'<span>定位时间: {{gpsTime}}</span>' +
			'</div>' +
			'<div class="mui-row">' +
				'<span>ACC状态: {{status}}</span>' + 
			'</div>' +
			'<div class="mui-row">' +
				'<span>速度: {{speed}} km/h</span>' +
			'</div>' +
			'<div class="mui-row">' +
				'<span>方向: {{direct}}</span>' +
			'</div>' +			 
			'<div class="mui-row">' +
				'<button class="mui-btn mui-btn-primary" style="background-color: {{color}}; border-color: {{color}}" onclick="trace(\'{{did}}\', this);">{{trace}}</button>' +
				'<button class="mui-btn mui-btn-primary" onclick="playback(\'{{did}}\', \'{{vehicleName}}\');">回放</button>'
			'</div>' +
		'</div>';
	return content.format(vehicle); 
}
