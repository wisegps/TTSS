var select_vehicle = null;
var toolType = TOOL_TYPE_DEFAULT;
var current_marker = null;
var current_infowin = null;
var current_retangle = null;
var current_retangle_label = null;
var baidumap;
var geocoder;
var loc_marker = null;
var start_marker = null;
var end_marker = null;
var circle = null;

//document.write('<script src="http://api.map.baidu.com/api?v=1.4" type="text/javascript"></script>');

var EARTH_RADIUS = 6378.137; //地球半径，单位为公里
function rad(d) {   //计算弧度
    return d * Math.PI / 180.0;
}

function calDistance(lat1, lng1, lat2, lng2) {     //计算两个经纬度坐标之间的距离，返回单位为公里的数值
    var radLat1 = rad(lat1);
    var radLat2 = rad(lat2);
    var a = radLat1 - radLat2;
    var b = rad(lng1) - rad(lng2);
    var s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
    s = s * EARTH_RADIUS;
    s = Math.round(s * 10000) / 10000;
    return s;
}

var refreshLabel = function (map, vehicles) {
    return function () {
        //alert("hello");
        var v = null;
        for (var i = 0; i < vehicles.length; i++) {
            v = vehicles[i];
            v.marker_.setLabel(new BMap.Label(vehicles[i].obj_name, {offset: new BMap.Size(15, -20)}));
        }
    }
}

function bmap(div_map, center_point, zoom, opt, panorama_map) {
	this.div_map = div_map;
	this.panorama_map = document.getElementById(panorama_map);
    this.map = new BMap.Map(div_map);
    _this = this;
    this.map.addEventListener("dragend", function(){    
	 	var center = _this.map.getCenter();    
	 	if(_this.panorama){
	 		_this.panorama.setPosition(center);
	 	}
//	 	alert("地图中心点变更为：" + center.lng + ", " + center.lat);    
		
	});
    this.height = div_map.clientHeight;
    console.log('map height: ' + this.height);
//  this.panorama = new BMap.Panorama(panorama_map); 
    console.log(opt);
    this.opt = opt || {
    		traffic: true,
    		panorama: true,
    		trace: false,
    		myPos: false,
    		refresh: false,
    		lock: {show: false, stat: false},
    		stand:  {show: false, stat: false}
    };
    baidumap = this.map;
    this.map.centerAndZoom(center_point, zoom);
//  this.panorama.setPosition(center_point);
    if(this.map.enableScrollWheelZoom != undefined){
        this.map.enableScrollWheelZoom(true);
    }
    if(BMap.NavigationControl != undefined){
        this.map.addControl(new BMap.NavigationControl());
        this.map.addControl(new BMap.OverviewMapControl());
        this.map.addControl(new BMap.MapTypeControl());
    }
    
//  var stCtrl = new BMap.PanoramaControl();  
//	stCtrl.setOffset(new BMap.Size(55, 40));  
//	this.map.addControl(stCtrl);
//  this.map.addControl(new BMap.ScaleControl());
    	// 创建路况控件
    	var _this = this;
    	if(this.opt.traffic){
    	    	var trafficOn = false;
 		var trafficLayer;
		var trafficCtrl = new ZoomControl(BMAP_ANCHOR_TOP_RIGHT, new BMap.Size(10, 40), '路况', './images/traffic_off.png', function(e){
			trafficOn = !trafficOn;
			var target = e.target.localName == 'img' ? e.target: e.target.querySelector('img');
			target.src = trafficOn ? './images/traffic_on.png': './images/traffic_off.png';
			if(trafficOn){
				trafficLayer = new BMap.TrafficLayer();
				_this.map.addTileLayer(trafficLayer);
			}else{
				_this.map.removeTileLayer(trafficLayer);
			}
		});	
		this.map.addControl(trafficCtrl);
    }
 	// 添加全景按钮
	if(this.opt.panorama){
    	    	var panoramaOn = false;
		var panoramaCtrl = new ZoomControl(BMAP_ANCHOR_TOP_RIGHT, new BMap.Size(10, 85), '全景', './images/panorama_off.png', function(e){
			panoramaOn = !panoramaOn;
			var target = e.target.localName == 'img' ? e.target: e.target.querySelector('img');
			target.src = panoramaOn ? './images/panorama_on.png': './images/panorama_off.png';
			if(panoramaOn){
				console.log('panoramaOn');
				_this.panorama = new BMap.Panorama(_this.panorama_map); 
				_this.panorama.setPosition(new BMap.Point(_this.map.getCenter().lng, _this.map.getCenter().lat));
				_this.div_map.style.height = _this.height / 2 + 'px';
				_this.panorama_map.style.height = _this.height / 2 + 'px';
			}else{
				console.log('panoramaOff');
//				_this.panorama_map.innerHTML = '';
				_this.div_map.style.height = _this.height + 'px';
//				_this.panorama_map.style.height = '0px';
			}
//			if(_this.onPanoramaClick){
//				_this.onPanoramaClick(target);
//			}
		});	
		this.map.addControl(panoramaCtrl);	
	}   	
	// 添加跟踪按钮
//	if(this.opt.trace){
//		var traceOn = false;
//		var traceCtrl = new ZoomControl(BMAP_ANCHOR_TOP_RIGHT, new BMap.Size(10, 130), '跟踪车辆', './images/locate_off.png', function(e){
////			traceOn = !traceOn;
//			var target = e.target.localName == 'img' ? e.target: e.target.querySelector('img');
//			target.stat = traceOn;
//			target.on = function(){
//				traceOn = true;
//				target.src = './images/locate_on.png';
//			};
//			target.off = function(){
//				traceOn = false;
//				target.src = './images/locate_off.png';
//			};
//			if(_this.onTraceClick){
//				_this.onTraceClick(target);
//			}
//		});
//		this.map.addControl(traceCtrl);		
//	}
	// 添加我的位置
	if(this.opt.myPos){
		var myPosCtrl = new ZoomControl(BMAP_ANCHOR_TOP_RIGHT, new BMap.Size(10, 130), '个人', './images/person.png', function(e){
			var target = e.target.localName == 'img' ? e.target: e.target.querySelector('img');
			if(_this.onMyPosClick){
				_this.onMyPosClick(target);
			}
		});
		this.map.addControl(myPosCtrl);		
	}
	// 添加刷新按钮
	if(this.opt.refresh){
		var refreshCtrl = new ZoomControl(BMAP_ANCHOR_TOP_RIGHT, new BMap.Size(10, 175), '车辆', './images/refresh.png', function(e){
			var target = e.target.localName == 'img' ? e.target: e.target.querySelector('img');
			if(_this.onRefreshClick){
				_this.onRefreshClick(target);
			}
		});
		this.map.addControl(refreshCtrl);		
	}
	// 添加锁车按钮
	if(this.opt.lock.show){
	   	var lockOn = this.opt.lock.stat || false;
	   	var src = lockOn ? './images/lock_on.png': './images/lock_off.png';
		var width = document.body.clientWidth == 0 ? app.getSettings().width : document.body.clientWidth;
		var lockCtrl = new CircleControl(BMAP_ANCHOR_BOTTOM_LEFT, new BMap.Size(width/2 - 50 - 50, 30), '一键锁车', src, function(e){
			lockOn = !lockOn;
			var target = e.target.localName == 'img' ? e.target: e.target.querySelector('img');
			target.stat = lockOn;
			target.on = function(){
				traceOn = true;
				target.src = './images/lock_on.png';
			};
			target.off = function(){
				traceOn = false;
				target.src = './images/lock_off.png';
			};
			if(_this.onLockClick){
				_this.onLockClick(target);
			}
		});
		this.map.addControl(lockCtrl); 		
	}
	// 添加设防按钮
	if(this.opt.stand.show){
		var standOn = this.opt.stand.stat || false;
		var src = standOn ? './images/stand_on.png': './images/stand_off.png';
		var standCtrl = new CircleControl(BMAP_ANCHOR_BOTTOM_LEFT, new BMap.Size(width/2 - 50 + 50, 30), '一键设防', src, function(e){
			standOn = !standOn;
			var target = e.target.localName == 'img' ? e.target: e.target.querySelector('img');
			target.stat = standOn;
			target.on = function(){
				traceOn = true;
				target.src = './images/stand_on.png';
			};
			target.off = function(){
				traceOn = false;
				target.src = './images/stand_off.png';
			};
			if(_this.onStandClick){
				_this.onStandClick(target);
			}
		});
		this.map.addControl(standCtrl);		
	}
	
    this.geocoder = new BMap.Geocoder();
    geocoder = this.geocoder;
    this.vehicles = [];
    this.pois = [];
    this.geos = [];
    this.markers = [];
    this.poi_markers = [];
    this.stop_markers = [];
    this.markerClusterer = null;
    this.showLocation = null;
    this.mapClick = null;
    //    fn = refreshLabel(this.map, this.vehicles);
    //    this.map.addEventListener("dragend", fn);
}

bmap.prototype.setCenter = function (lon, lat) {
    point = new BMap.Point(lon, lat);
    this.map.panTo(point);
};

bmap.prototype.getCenter = function () {
    var lon = this.map.getCenter().lng;
    var lat = this.map.getCenter().lat;
    return {
        lon: lon,
        lat: lat
    }
};

// 设置地图缩放比例
bmap.prototype.setZoom = function (level) {
    this.map.setZoom(level);
};

// 获取地址后的函数处理
bmap.prototype.setShowLocation = function (fun) {
    this.showLocation = fun;
};

function vehicleMarker(vehicle, if_track, if_show_line) {
    this.obj_id = vehicle.did;
    this.obj_name = vehicle.vehicleName;
    this.lon = vehicle.activeGpsData.lon;
    this.lat = vehicle.activeGpsData.lat;
//  this.b_lon = vehicle.active_gps_data.b_lon;
//  this.b_lat = vehicle.active_gps_data.b_lat;
//  this.speed = vehicle.active_gps_data.speed;
//  this.direct = vehicle.active_gps_data.direct;s
    this.if_track = if_track;
    this.if_show_line = if_show_line;
    this.track_line = null;
    this.track_line_points = null;
    this.track_lines = [];
    this.content = "";
    this.marker_ = null;
    this.label_ = null;
    this.infowin_ = null;
}

function poiMarker(poi) {
    this.objectId = poi.objectId;
    this.name = poi.name;
    this.address = poi.address;
    this.lon = poi.lon;
    this.lat = poi.lat;
    this.contact = poi.contact;
    this.tel = poi.tel;
    this.marker_ = null;
    this.infowin_ = null;
}

bmap.prototype.addStopMarker = function (lon, lat, stop_content, p) {
//    icon = getIcon(vehicles[i], MAP_TYPE_BAIDU);
//    title = vehicles[i].obj_name + "（" + getStatusDesc(vehicles[i], 2) + "）";
    var icon = new BMap.Icon("../../stylesheets/MapImages/location.png", new BMap.Size(21, 27));
    icon.anchor = new BMap.Size(11, 27);
    var latLng = new BMap.Point(lon, lat);
    stop_marker = new BMap.Marker(latLng, {icon: icon});
    //打开该车辆的信息窗体
    var infowin = new BMap.InfoWindow(stop_content);
    var latLng = new BMap.Point(lon, lat);
    var fn = stopMarkerClickFunction(stop_marker, infowin, latLng, p);
    stop_marker.addEventListener("click", fn);
    this.stop_markers.push(stop_marker);
    this.map.addOverlay(stop_marker);
};

bmap.prototype.addStopMarker2 = function (lon, lat, stop_content, p) {
//    icon = getIcon(vehicles[i], MAP_TYPE_BAIDU);
//    title = vehicles[i].obj_name + "（" + getStatusDesc(vehicles[i], 2) + "）";
    var icon = new BMap.Icon("../../stylesheets/MapImages/location_green.png");
    icon.anchor = new BMap.Size(0, 0);
    var latLng = new BMap.Point(lon, lat);
    stop_marker = new BMap.Marker(latLng, {icon: icon});
    //打开该车辆的信息窗体
    var infowin = new BMap.InfoWindow(stop_content);
    var latLng = new BMap.Point(lon, lat);
    var fn = stopMarkerClickFunction(stop_marker, infowin, latLng, p);
    stop_marker.addEventListener("click", fn);
    this.stop_markers.push(stop_marker);
    this.map.addOverlay(stop_marker);
};

var startMarkerClickFunction = function (p) {
	var _p = p;
    return function (e) {
	    _p.openInfoWindow(_p.infowin_);
		console.log("marker click");
    };
};

bmap.prototype.addLocMarker = function (lon, lat, title, content) {
    if (loc_marker) {
        this.map.removeOverlay(loc_marker);
    }
    var icon = new BMap.Icon("images/myicon.png", new BMap.Size(24, 31));
	var latLng = new BMap.Point(lon, lat);
    loc_marker = new BMap.Marker(latLng, {icon: icon});
//  start_marker.setLabel(new BMap.Label(title, {offset: new BMap.Size(30, 0)}));
//  start_marker.getLabel().setStyle({border: "0px solid red", color: "#666666", backgroundColor: "transparent", fontWeight: "bold", fontFamily: "PingFang SC", fontSize: "14px", textShadow: "#fff 1px 0 0,#fff 0 1px 0,#fff -1px 0 0,#fff 0 -1px 0"});
//  start_marker.setTitle = title;   
    this.map.addOverlay(loc_marker); 
	//打开该车辆的信息窗体
//  var opts = {
//  		width: 200, // 信息窗口宽度
//      	title: title // 信息窗口标题
//  }
//  var infowin = new BMap.InfoWindow(content, opts);
//  start_marker.infowin_ = infowin;
//  var fn = startMarkerClickFunction(start_marker);
//  start_marker.addEventListener("click", fn);
};

bmap.prototype.toggleVehicle = function(id){
    var v = this.vehicles[id];
    if(v){
    		if(!v.if_track){
    			//删除其他跟踪的车辆
    			for(key in this.vehicles){
    				this.vehicles[key].if_track = false;
    			}
    		}
    		v.if_track = !v.if_track;
    		return v.if_track;
    }
}

bmap.prototype.addStartMarker = function (lon, lat, title, content) {
    if (start_marker) {
        this.map.removeOverlay(start_marker);
    }
    var icon = new BMap.Icon("images/vicon.png", new BMap.Size(24, 31));
	var latLng = new BMap.Point(lon, lat);
    start_marker = new BMap.Marker(latLng, {icon: icon, offset: new BMap.Size(0, -15)});
    start_marker.setLabel(new BMap.Label(title, {offset: new BMap.Size(30, 0)}));
    start_marker.getLabel().setStyle({border: "0px solid red", color: "#666666", backgroundColor: "transparent", fontWeight: "bold", fontFamily: "PingFang SC", fontSize: "14px", textShadow: "#fff 1px 0 0,#fff 0 1px 0,#fff -1px 0 0,#fff 0 -1px 0"});
    start_marker.setTitle = title;   
    this.map.addOverlay(start_marker); 
	//打开该车辆的信息窗体
    var opts = {
    		width: 200, // 信息窗口宽度
        	title: title, // 信息窗口标题
        	enableAutoPan: false
    }
    var infowin = new BMap.InfoWindow(content, opts);
    start_marker.infowin_ = infowin;
    var fn = startMarkerClickFunction(start_marker);
    start_marker.addEventListener("click", fn);
};

bmap.prototype.addMarker = function (lon, lat, content) {
    var latLng = new BMap.Point(lon, lat);
    marker = new BMap.Marker(latLng);
    marker.setLabel(new BMap.Label(content, {offset: new BMap.Size(15, 0)}));
    marker.getLabel().setStyle({border: "1px solid red"});
    marker.setTitle = content;
    this.map.addOverlay(marker);
};

bmap.prototype.addEndMarker = function (lon, lat, content) {
    if (end_marker) {
        this.map.removeOverlay(end_marker);
    }
    var latLng = new BMap.Point(lon, lat);
    end_marker = new BMap.Marker(latLng);
    end_marker.setLabel(new BMap.Label(content, {offset: new BMap.Size(15, 0)}));
    end_marker.getLabel().setStyle({border: "1px solid red"});
    end_marker.setTitle = content;
    this.map.addOverlay(end_marker);
};

bmap.prototype.addCenterMarker = function(lon, lat){
	var latLng = new BMap.Point(lon, lat);
	var icon = new BMap.Icon("images/center.png", new BMap.Size(24, 24));
    var center_marker = new BMap.Marker(latLng, {icon: icon});
    this.map.addOverlay(center_marker);
}

bmap.prototype.clearLocalMarker = function () {
    this.map.removeOverlay(start_marker);
    this.map.removeOverlay(end_marker);
};

bmap.prototype.clearStopMakers = function () {
    for (var i = 0; i < this.stop_markers.length; i++) {
        var m = this.stop_markers[i];
        if (m) {
            this.map.removeOverlay(m);
        }
    }
    this.stop_markers = [];
};

var workTypeDesc = ['（有线）', '（无线）'];

bmap.prototype.addVehicles = function (vehicles, is_infowin, is_playback) {
    var v = null;
    var latLng = null;
    var icon = "";
    var title = "";
    console.log(JSON.stringify(vehicles));
    for (var i = 0; i < vehicles.length; i++) {
        var v = this.vehicles[vehicles[i].did];
        // 判断车辆是否存在，存在则更新数据，不存在则添加
        if (v != null) {
            this.updateVehicle(vehicles[i], false, false, false, '#FF0000', 3, is_playback);
        } else {
            latLng = new BMap.Point(vehicles[i].activeGpsData.lon, vehicles[i].activeGpsData.lat);
            v = new vehicleMarker(vehicles[i], false, false);
            icon = getIcon(vehicles[i], MAP_TYPE_BAIDU, is_playback);
            title = vehicles[i].vehicleName + workTypeDesc[vehicles[i].workType||0];
            v.marker_ = new BMap.Marker(latLng, {icon: icon});
            v.marker_.setRotation(vehicles[i].activeGpsData.direct);
            v.marker_.setLabel(new BMap.Label(vehicles[i].vehicleName, {offset: new BMap.Size(30, 0)}));
            v.marker_.getLabel().setStyle({border: "0px solid red", backgroundColor: "transparent", fontWeight: "bold", fontFamily: "PingFang SC", fontSize: "13px", textShadow: "#fff 1px 0 0,#fff 0 1px 0,#fff -1px 0 0,#fff 0 -1px 0"});
            v.marker_.setTitle = title;
	        vehicles[i].name = vehicles[i].vehicleName;
	        content = getVehicleContent(vehicles[i]);
//	        console.log(content);
	        //打开该车辆的信息窗体
	        var opts = {
			    width: 200, // 信息窗口宽度
			    title: title, // 信息窗口标题
			    enableAutoPan: false
			}
	    		var infowin = new BMap.InfoWindow(content, opts);
	        v.infowin_ = infowin;
	        	var fn = markerClickFunction(v);    
            if(is_infowin){       
                v.marker_.addEventListener("click", fn);
            }

            this.vehicles[vehicles[i].did] = v;
            this.markers.push(v.marker_);
//          var markerClusterer = new BMapLib.MarkerClusterer(this.map, {markers: this.markers});
            this.map.addOverlay(v.marker_);
//
//          var obj_id = vehicles[i].obj_id;
//
//          var geoFn = geoFunction(obj_id);
//          this.geocoder.getLocation(latLng, geoFn, {"poiRadius": "500", "numPois": "10"});
        }
    }
};

var markerClickFunction = function (v) {
	var _v = v;
    return function (e) {
        _v.marker_.openInfoWindow(_v.infowin_);
        var latLng = new BMap.Point(_v.lon, _v.lat);
        var geoFn = geoFunction(v.obj_id, latLng);
        geocoder.getLocation(latLng, geoFn, {"poiRadius": "500", "numPois": "10"});
        select_vehicle = _v;
		console.log("marker click, obj_id = " + _v.obj_id);
    };
};

var stopMarkerClickFunction = function (stop_marker, infowin, latLng, p) {
    return function (e) {
        stop_marker.openInfoWindow(infowin);
        var geoFn = stopGeoFunction(p, latLng);
        geocoder.getLocation(latLng, geoFn, {"poiRadius": "500", "numPois": "10"});
    };
};

bmap.prototype.getDistance = function (lon1, lat1, lon2, lat2) {
    var start = new BMap.Point(lon1, lat1);
    var end = new BMap.Point(lon2, lat2);
    var d = baidumap.getDistance(start, end);
    return d;
};

var geoFunction = function (obj_id, latLng) {
    return function (rs) {
        var di = 2000;
        var shortpoint = -1;
        for (i = 0; i < rs.surroundingPois.length; i++) {
            var d = baidumap.getDistance(rs.surroundingPois[i].point, latLng);
            if (d < di) {
                shortpoint = i;
                di = d;
            }
        }

        var getAddAddress = "";
        if (shortpoint >= 0) {
            getAddAddress = rs.addressComponents.city + rs.addressComponents.district + rs.addressComponents.street + rs.addressComponents.streetNumber + '，离' + rs.surroundingPois[shortpoint].title + di.toFixed(0) + '米';
         } else {
            getAddAddress = rs.address;
        }

        if (getAddAddress != "") {
//          $("#location" + obj_id).html(getAddAddress);
			if (this.showLocation) {
                this.showLocation(getAddAddress);
            }
        }
    };
};

var stopGeoFunction = function (p, latLng) {
    return function (rs) {
        var di = 2000;
        var shortpoint = -1;
        for (i = 0; i < rs.surroundingPois.length; i++) {
            var d = baidumap.getDistance(rs.surroundingPois[i].point, latLng);
            if (d < di) {
                shortpoint = i;
                di = d;
            }
        }

        var getAddAddress = "";
        if (shortpoint >= 0) {
            getAddAddress = rs.address + '，离' + rs.surroundingPois[shortpoint].title + di.toFixed(0) + '米';
        } else {
            getAddAddress = rs.address;
        }

        if (getAddAddress != "") {
            $("#location" + p).html(getAddAddress);
        }
    };
};

// 更新车辆显示
bmap.prototype.updateVehicle = function (vehicle, if_track, if_show_line, if_open_win, color, width, if_playback) {
    var v = this.vehicles[vehicle.did];
    var content = "";
    if (v != null) {
        var oldlatLng;
        oldlatLng = new BMap.Point(v.lon, v.lat);
        v.lon = vehicle.activeGpsData.lon;
        v.lat = vehicle.activeGpsData.lat;
//      v.gps_time = vehicle.active_gps_data.gps_time;
//      v.speed = vehicle.active_gps_data.speed;
//      v.direct = vehicle.active_gps_data.direct;
        var icon = getIcon(vehicle, MAP_TYPE_BAIDU, if_playback);
        var latLng;
        latLng = new BMap.Point(vehicle.activeGpsData.lon, vehicle.activeGpsData.lat);

        if (v.if_track || if_show_line) {
            distance = calDistance(oldlatLng.lng, oldlatLng.lat, latLng.lng, latLng.lat);
            if (distance < 5) {
                if (!v.track_line) {
                    var polyOptions = {
                        strokeColor: color,
                        strokeOpacity: 1.0,
                        strokeWeight: width
                    };
                    v.track_line = new BMap.Polyline([], polyOptions);
                    var path = v.track_line.getPath();
                    this.map.addOverlay(v.track_line);
                    path.push(oldlatLng);
                    v.track_lines.push(v.track_line);
                }
                var path = v.track_line.getPath();
                path.push(latLng);
                v.track_line.setPath(path);
            } else {
                v.track_line = null;
            }
        }

        v.marker_.getLabel().setContent(vehicle.vehicleName);
        v.marker_.setPosition(latLng);
        v.marker_.setIcon(icon);
        v.marker_.setRotation(vehicle.activeGpsData.direct);
		vehicle.name = vehicle.vehicleName;
        content = getVehicleContent(vehicle, if_playback, v.if_track);
        var title = vehicle.vehicleName + workTypeDesc[vehicle.workType||0];
        v.infowin_.setTitle(title);
        v.infowin_.setContent(content);

        if (v.if_track || if_track) {
            // 加入视野判断，如果超过地图范围才进行置中操作
            var bounds = this.map.getBounds();
            if (v.lon < bounds.getSouthWest().lng || v.lon > bounds.getNorthEast().lng ||
                v.lat < bounds.getSouthWest().lat || v.lat > bounds.getNorthEast().lat) {
                this.map.setCenter(latLng);
            }
        }
        
        if(this.panorama){
	    		this.panorama.setPosition(latLng);
	    }

//      this.geocoder.getLocation(latLng, function (rs) {
//          var di = 2000;
//          var shortpoint = -1;
//          for (i = 0; i < rs.surroundingPois.length; i++) {
//              var d = baidumap.getDistance(rs.surroundingPois[i].point, latLng);
//              if (d < di) {
//                  shortpoint = i;
//                  di = d;
//              }
//          }
//
//          if (shortpoint >= 0) {
//              getAddAddress = rs.address + '，离' + rs.surroundingPois[shortpoint].title + di.toFixed(0) + '米';
//          } else {
//              getAddAddress = rs.address;
//          }
//
//          if (getAddAddress != "") {
//              $("#location" + vehicle.obj_id).html(getAddAddress);
//          }
//      }, {"poiRadius": "500", "numPois": "10"});

        if (if_open_win) {
            this.map.openInfoWindow(v.infowin_, latLng);
        }
    }
}

bmap.prototype.findVehicle = function (obj_id, if_track, if_open_win) {
    var v = this.vehicles[obj_id];
    var content = "";
    if (v != null) {
        var latLng;
        latLng = new BMap.Point(v.lon, v.lat);

        if (if_track) {
            this.map.setZoom(18);
            this.map.setCenter(latLng);
            if(this.panorama){
            	   this.panorama.setPosition(latLng);
            }
        }
        if (if_open_win) {
            if (select_vehicle) {
                select_vehicle.marker_.closeInfoWindow();
            }
            v.marker_.openInfoWindow(v.infowin_);
            select_vehicle = v;
        }
        // 获取地址
//        this.geocoder.getLocation(latLng, function (rs) {
//            if (rs) {
//                var addComp = rs.addressComponents;
//                var addr = addComp.province + addComp.city + addComp.district + addComp.street + addComp.streetNumber;
//                if (this.showLocation) {
//                    this.showLocation(addr);
//                }
//            }
        //        });
        this.geocoder.getLocation(latLng, function (rs) {
            var di = 2000;
            var shortpoint = -1;
            console.log(JSON.stringify(rs));
            for (i = 0; i < rs.surroundingPois.length; i++) {
                var d = baidumap.getDistance(rs.surroundingPois[i].point, latLng);
                if (d < di) {
                    shortpoint = i;
                    di = d;
                }
            }

            if (shortpoint >= 0) {
                getAddAddress = rs.addressComponents.city + rs.addressComponents.district + rs.addressComponents.street + rs.addressComponents.streetNumber + '，离' + rs.surroundingPois[shortpoint].title + di.toFixed(0) + '米';
            } else {
                getAddAddress = rs.address;
            }

            if (getAddAddress != "") {
//              $("#location" + obj_id).html(getAddAddress);
				if (this.showLocation) {
                     this.showLocation(getAddAddress);
                 }
            }
        }, {"poiRadius": "500", "numPois": "10"});
        return v;
    }
};

bmap.prototype.deleteVehicle = function (obj_id) {
    var v = this.vehicles[obj_id];
    if (v != null) {
        // 从数组中删除对象
        this.vehicles[obj_id] = null;
        this.markers.pop(v.marker_);
        //this.markerClusterer.removeMarker(v.marker_);
        if (v.marker_) {
            this.map.removeOverlay(v.marker_);
        }
        if (v.track_lines) {
            for (var i = 0; i < v.track_lines.length; i++) {
                this.map.removeOverlay(v.track_lines[i]);
            }
        }
        if (v.track_line) {
        		this.map.removeOverlay(v.track_line);
        		v.track_line = null;
        }
    }
}

bmap.prototype.clearVehicle = function () {
    for(var i = 0; i < this.markers.length; i++){
    		this.map.removeOverlay(this.markers[i]);
    }
    for(key in this.vehicles){
    		if(this.vehicles[key].track_line){
    			this.map.removeOverlay(this.vehicles[key].track_line);   			
    		}
    }
    this.vehicles = [];
    this.markers = [];
    //this.markerClusterer.clearMarkers();
}

bmap.prototype.addTrackLine = function (vehicle, gps_datas, color, width, centerAndZoom) {
    var v = this.vehicles[vehicle.obj_id];
    var content = "";
    if (v == null) {
        v = new vehicleMarker(vehicle, false, false);
        this.vehicles[vehicle.obj_id] = v;
    }
    var points = [];
    var latLng;
    for (var i = 0; i < gps_datas.length; i++) {
        latLng = new BMap.Point(gps_datas[i].lon, gps_datas[i].lat);
        points.push(latLng);
    }

    var polyOptions = {
        strokeColor: color,
        strokeOpacity: 0.5,
        strokeWeight: width
    };
    //if (v.track_line) {
    //    this.map.removeOverlay(v.track_line);
    //};
    v.track_line_points = points;
    v.track_line = new BMap.Polyline(points, polyOptions);
    this.map.addOverlay(v.track_line);
    if(centerAndZoom){
    		var vp = this.map.getViewport(points, {
    			margins: [10, 10, 10, 10]
    		});
    		this.map.centerAndZoom(vp.center, vp.zoom);
    }
};

bmap.prototype.addAllTrackLine = function (vehicle, all_gps_datas, color, width) {
    var v = this.vehicles[vehicle.obj_id];
    var content = "";
    if (v == null) {
        v = new vehicleMarker(vehicle, false, false);
        this.vehicles[vehicle.obj_id] = v;
    }
    var points = [];
    var latLng;
    for (var i = 0; i < all_gps_datas.length; i++) {
        if (all_gps_datas.data[i].pi != undefined) {
            for (var j = 0; j < all_gps_datas.data[i].pi.length / 2; j++) {
                latLng = new BMap.Point(all_gps_datas.data[i].pi[j], all_gps_datas.data[i].pi[j + 1]);
                points.push(latLng);
            }
        }
    }

    var polyOptions = {
        strokeColor: color,
        strokeOpacity: 1.0,
        strokeWeight: width
    };
    v.track_line = new BMap.Polyline(points, polyOptions);
    this.map.addOverlay(v.track_line);
};

bmap.prototype.removeTrackLine = function (vehicle) {
    var v = this.vehicles[vehicle.obj_id];
    var content = "";
    if (v != null && v.track_line != null) {
        for (var i = 0; i < v.track_lines.length; i++) {
            this.map.removeOverlay(v.track_lines[i]);
        }
        this.map.removeOverlay(v.track_line);
        v.track_line = null;
    }
}

bmap.prototype.moveTrackPoint = function (vehicle, gps_data, if_open_win) {
    var v = vehicle;
    v.active_gps_data.lon = gps_data.lon;
    v.active_gps_data.lat = gps_data.lat;
    v.active_gps_data.b_lon = gps_data.b_lon;
    v.active_gps_data.b_lat = gps_data.b_lat;
    v.active_gps_data.speed = gps_data.speed;
    v.active_gps_data.direct = gps_data.direct;
    v.active_gps_data.gps_time = gps_data.gps_time;
    v.active_gps_data.uni_status = gps_data.uni_status;
    v.active_gps_data.uni_alerts = gps_data.uni_alerts;
    this.updateVehicle(v, true, true, if_open_win, 'green', 3, true);
}

function strPad(hex) {
    var zero = '00000000';
    var tmp = 8 - hex.length;
    return zero.substr(0, tmp) + hex;
}

bmap.prototype.openAddGeoTool = function () {
    google.maps.event.addListener(this.map, 'click', function (event) {
        //alert(event.latLng);
        var lon = parseInt(event.latLng.lat() * 600000);
        var lat = parseInt(event.latLng.lng() * 600000);
        lon = strPad(lon.toString(16).toUpperCase());
        lat = strPad(lat.toString(16).toUpperCase());
        alert(lat + "," + lon);
    });
}

bmap.prototype.addCircle = function (center, width) {
	if(circle){
		this.map.removeOverlay(circle);
		circle = null;
	}
	var latLng = new BMap.Point(center.lon, center.lat);
	var opt = {
    		strokeWeight: 1,
    		strokeOpacity: 1,
    		fillOpacity: 0.3
    }
    circle = new BMap.Circle(latLng, width, opt);
	this.map.addOverlay(circle);    
}

bmap.prototype.removeCircle = function () {
	if(circle){
		this.map.removeOverlay(circle);    
		circle = null;
	}
}

var onMapClick = function (map, title, div_content) {
    return function (event) {
        switch (toolType) {
            case TOOL_TYPE_POI:
//                alert("兴趣点：" + event.point.lng);
                current_infowin = new BMap.InfoWindow(div_content);
                if (current_marker) {
                    current_marker.closeInfoWindow();
                    map.removeOverlay(current_marker);
                }
                current_marker = new BMap.Marker(event.point);
                map.addOverlay(current_marker);
                current_marker.setTitle = title;
                current_marker.openInfoWindow(current_infowin);
                //兴趣点新增保存
                $("#add_hobbySave").on("click", function () {
                    var addSavehobbyUrl = $.cookie('xmlHost') + "poi/?auth_code=" + $.cookie('Login_auth_code');
                    var poi_name = $("#poi_name").val().trim();
                    if (poi_name == "") {
                        return;
                    }
                    _adSaveDate = {
                        poi_name: poi_name,
                        cust_id: $.cookie('Login_cust_id'),
                        poi_type: $("#poi_type option:selected").val(),
                        remark: $("#remark").val().trim(),
                        lon: current_marker.getPosition().lng, lat: current_marker.getPosition().lat,
                        is_geo: 0, width: 0
                    };
                    var addSavehobbyObj = {
                        type: "POST",
                        url: addSavehobbyUrl,
                        data: _adSaveDate,
                        success: addSavehobby_success,
                        error: OnError
                    };
                    ajax_function(addSavehobbyObj);
                });
                $("#add_hobbyClose").on("click", function () {
                    if (current_marker) {
                        current_marker.closeInfoWindow();
                        map.removeOverlay(current_marker);
                    }
                });

                //兴趣点编辑保存
                $("#edit_hobbySave").on("click", function () {
                    var poi_name = $("#poi_name").val().trim();
                    var poi_type = $("#poi_type option:selected").val();
                    var remark = $("#remark").val().trim();
                    var addSavehobbyUrl = $.cookie('xmlHost') + "poi/" + hobbyeditArry.poi_id + "?auth_code=" + $.cookie('Login_auth_code');
                    if (poi_name == "") {
                        return;
                    }
                    var adSaveDate = {
                        poi_name: poi_name,
                        cust_id: $.cookie('Login_cust_id'),
                        poi_type: poi_type,
                        remark: remark,
                        lon: current_marker.getPosition().lng, lat: current_marker.getPosition().lat,
                        is_geo: 0, width: 0
                    };
                    var addSavehobbyObj = {
                        type: "PUT",
                        url: addSavehobbyUrl,
                        data: adSaveDate,
                        success: editSavehobby_success,
                        error: OnError
                    };
                    updatePoi_name = poi_name;
                    updateType = poi_type;
                    updateRemark = remark;
                    ajax_function(addSavehobbyObj);
                });
                $("#edit_hobbyClose").on("click", function () {
                    if (current_marker) {
                        current_marker.closeInfoWindow();
                        map.removeOverlay(current_marker);
                    }
                });
                break;
            case TOOL_TYPE_GEO:
                //alert("矩形围栏：" + event.latLng);
                current_infowin = new BMap.InfoWindow(div_content);
                if (current_retangle) {
                    current_retangle.closeInfoWindow();
                    map.removeOverlay(current_retangle);
                }
                var rect = getRectangle(event.point.lng, event.point.lat, 100);
                current_retangle = new BMap.Polygon([
                    new BMap.Point(rect.x1, rect.y1),
                    new BMap.Point(rect.x2, rect.y1),
                    new BMap.Point(rect.x2, rect.y2),
                    new BMap.Point(rect.x1, rect.y2)
                ], {strokeColor: "#FF0000", strokeWeight: 2, strokeOpacity: 0.8});
                map.addOverlay(current_retangle);
                map.openInfoWindow(current_infowin, event.point);

                //围栏新增保存
                $("#add_fenceSave").on("click", function () {
                    var addSavefenceUrl = $.cookie('xmlHost') + "poi/?auth_code=" + $.cookie('Login_auth_code');
                    var width = $("#width").val().trim();
                    var poi_name = $("#poi_name").val().trim();
                    if (width == "") {
                        return;
                    } else if (poi_name == "") {
                        return;
                    }
                    //大于0的数
                    if (/^\d+(\.\d+)?$/.test(width)) {

                    } else {
                        alert("只能输入大于0的数字");
                        return;
                    }
                    var adSaveDate = {
                        poi_name: poi_name,
                        cust_id: $.cookie('Login_cust_id'),
                        poi_type: $("#poi_type option:selected").val(),
                        remark: $("#remark").val().trim(),
                        lon: current_retangle.getBounds().getCenter().lng,
                        lat: current_retangle.getBounds().getCenter().lat,
                        is_geo: 1,
                        width: width
                    };
                    var addSavefenceObj = {
                        type: "POST",
                        url: addSavefenceUrl,
                        data: adSaveDate,
                        success: addSavefence_success,
                        error: OnError
                    };
                    ajax_function(addSavefenceObj);

                });

                //围栏编辑保存
                $("#edit_fenceSave").on("click", function () {
                    var addSavefenceUrl = $.cookie('xmlHost') + "poi/" + fenceditArry.poi_id + "?auth_code=" + $.cookie('Login_auth_code');
                    var width = $("#width").val().trim();
                    var poi_name = $("#poi_name").val().trim();
                    if (width == "") {
                        return;
                    } else if (poi_name == "") {
                        return;
                    }
                    //大于0的数
                    if (/^\d+(\.\d+)?$/.test(width)) {
                    } else {
                        alert("只能输入大于0的数字");
                        return;
                    }
                    var adSaveDate = {
                        poi_name: poi_name,
                        cust_id: $.cookie('Login_cust_id'),
                        poi_type: $("#poi_type option:selected").val(),
                        remark: $("#remark").val().trim(),
                        lon: current_retangle.getBounds().getCenter().lng,
                        lat: current_retangle.getBounds().getCenter().lat,
                        is_geo: 1,
                        width: width
                    };
                    var addSavefenceObj = {
                        type: "PUT",
                        url: addSavefenceUrl,
                        data: adSaveDate,
                        success: editSavefence_success,
                        error: OnError
                    };
                    ajax_function(addSavefenceObj);
                });

                //关闭窗口
                $("#edit_fenceColse,#add_fenceColse").on("click", function () {
                    if (current_retangle) {
                        map.closeInfoWindow();
                        map.removeOverlay(current_retangle);
                        map.removeOverlay(current_retangle_label);
                    }
                });

                $("#width").on("keyup", function () {
                    var thisValue = $(this).val().trim();
                    if (/^\d+(\.\d+)?$/.test(thisValue)) {
                        wimap.changeGeoWidth(thisValue);
                    } else {
                    }
                });
                break;
            case TOOL_TYPE_POLY:
                alert("多边形围栏：" + event.latLng);
                break;
            case TOOL_TYPE_ROUTE:
                alert("线路：" + event.latLng);
                break;
            case TOOL_TYPE_START_POINT:
//                alert("请在地图上选择起点");
                $("#drive_start_input").val(event.point.lng.toFixed(6) + "," + event.point.lat.toFixed(6));
                drive_first_input = $("#drive_start_input").val();
                if (searchVehicleByPoint != undefined) {
                    searchVehicleByPoint(event.point.lng, event.point.lat, 5000);
                }
                this.setTool(TOOL_TYPE_DEFAULT);
                break;
            case TOOL_TYPE_END_POINT:
//                alert("请在地图上选择终点");
                $("#drive_end_input").val(event.point.lng.toFixed(6) + "," + event.point.lat.toFixed(6));
                this.setTool(TOOL_TYPE_DEFAULT);
                break;
        }
    }
};

bmap.prototype.setTool = function (tool_type, title, div_content, callback) {
    toolType = tool_type;
    switch (tool_type) {
        case TOOL_TYPE_DEFAULT:
            fn = onMapClick(this.map, title, div_content);
            this.map.removeEventListener("click", fn);
            if (current_marker) {
                current_marker.closeInfoWindow();
                this.map.removeOverlay(current_marker);
            }
            if (current_retangle) {
                this.map.closeInfoWindow();
                this.map.removeOverlay(current_retangle);
                this.map.removeOverlay(current_retangle_label);
            }
            break;
        case TOOL_TYPE_POI:
        case TOOL_TYPE_GEO:
        case TOOL_TYPE_POLY:
        case TOOL_TYPE_ROUTE:
        case TOOL_TYPE_START_POINT:
        case TOOL_TYPE_END_POINT:
            fn = onMapClick(this.map, title, div_content);
//            this.mapClick = google.maps.event.addListener(this.map, 'click', fn);
            this.mapClick = this.map.addEventListener("click", fn);
            break;
    }
}

bmap.prototype.addPois = function (pois) {
    var p = null;
    var latLng = null;
    var icon = "";
    var title = "";
    for (var i = 0; i < pois.length; i++) {
        this.addPoi(pois[i]);
    }
};

var poiClickFunction = function (p) {
	var _p = p;
    return function (e) {
	    _p.marker_.openInfoWindow(_p.infowin_);
		console.log("poi click, objectId = " + _p.objectId);
    };
};

bmap.prototype.addPoi = function (poi) {
    var p = null;
    var latLng = null;
    var icon = "";
    var title = "";
    var p = this.pois[poi.objectId];
    // 判断兴趣点是否存在，存在则更新数据，不存在则添加
    if (p != null) {
        this.updatePoi(poi);
    } else {
        latLng = new BMap.Point(poi.lon, poi.lat);
        p = new poiMarker(poi);
//      icon = getPoiIcon(poi, MAP_TYPE_BAIDU);
        title = poi.name;
        p.marker_ = new BMap.Marker(latLng);
        p.marker_.setLabel(new BMap.Label(poi.name, {offset: new BMap.Size(20, 0)}));
        p.marker_.getLabel().setStyle({border: "0px solid red", color: "#666666", backgroundColor: "transparent", fontWeight: "bold", fontFamily: "PingFang SC", fontSize: "12px", textShadow: "#fff 1px 0 0,#fff 0 1px 0,#fff -1px 0 0,#fff 0 -1px 0"});
        this.map.addOverlay(p.marker_);
        this.pois[poi.objectId] = p;
        this.poi_markers.push(p.marker_);
        var content = getBranchContent(poi);
        //打开该车辆的信息窗体
        var opts = {
		  width : 200,      // 信息窗口宽度
//		  height: 100,     // 信息窗口高度
		  title : poi.name , // 信息窗口标题
		  enableMessage:true,//设置允许信息窗发送短息
		  message:"亲耐滴，晚上一起吃个饭吧？戳下面的链接看下地址喔~"
		}
        var infowin = new BMap.InfoWindow(content, opts);
        p.infowin_ = infowin;
        var fn = poiClickFunction(p);
        p.marker_.addEventListener("click", fn);
    }

};

bmap.prototype.findPoi = function (objectId) {
    var p = this.pois[objectId];
    var content = "";
    if (p != null) {
        var latLng;
        latLng = new BMap.Point(p.lon, p.lat);
        this.map.setZoom(16);
        this.map.setCenter(latLng);
		p.marker_.openInfoWindow(p.infowin_);        
        return p;
    }
};

bmap.prototype.editPoi = function (div_content, poi_id, callback) {
    //找到对应的poi
    var p = this.pois[poi_id];
    if (p) {
        var latLng;
        latLng = new BMap.Point(p.lon, p.lat);
//        this.map.setZoom(10);
        this.map.setCenter(p.lon, p.lat);
//        current_infowin.open(this.map, current_marker);
        current_infowin = new BMap.InfoWindow(div_content);
        if (current_marker) {
            current_marker.closeInfoWindow();
            this.map.removeOverlay(current_marker);
        }
        current_marker = new BMap.Marker(latLng);
        this.map.addOverlay(current_marker);
        current_marker.openInfoWindow(current_infowin);

        //current_marker = p.marker_;
        //兴趣点编辑保存
        $("#edit_hobbySave").on("click", function () {
            var poi_name = $("#poi_name").val().trim();
            var poi_type = $("#poi_type option:selected").val();
            var remark = $("#remark").val().trim();
            var addSavehobbyUrl = $.cookie('xmlHost') + "poi/" + hobbyeditArry.poi_id + "?auth_code=" + $.cookie('Login_auth_code');
            if (poi_name == "") {
                return;
            }
            var adSaveDate = {
                poi_name: poi_name,
                cust_id: $.cookie('Login_cust_id'),
                poi_type: poi_type,
                remark: remark,
                lon: current_marker.getPosition().lng, lat: current_marker.getPosition().lat,
                is_geo: 0,
                width: 0,
                points: JSON.stringify([{lat: 0, lon: 0}])
            };
            var addSavehobbyObj = {
                type: "PUT",
                url: addSavehobbyUrl,
                data: adSaveDate,
                success: editSavehobby_success,
                error: OnError
            };
            updatePoi_name = poi_name;
            updateType = poi_type;
            updateRemark = remark;
            ajax_function(addSavehobbyObj);
        });
        $("#edit_hobbyClose").on("click", function () {
            if (current_marker) {
                current_marker.closeInfoWindow();
                wimap.map.removeOverlay(current_marker);
            }
        });
        this.setTool(TOOL_TYPE_POI, p.poi_name, div_content, callback);
    }
}

bmap.prototype.updatePoi = function (poi) {
    var p = this.pois[poi.objectId];
    var content = "";
    if (p != null) {
        p.name = poi.name;
        p.lon = poi.lon;
        p.lat = poi.lat;
        p.contact = poi.contact;
        p.tel = poi.tel;
//      var icon = getPoiIcon(poi, MAP_TYPE_BAIDU);
//      p.marker_.setIcon(icon);
        var latLng;
        latLng = new BMap.Point(poi.lon, poi.lat);
        p.marker_.setPosition(latLng);
        p.marker_.getLabel().setContent(poi.name);
    }
}

bmap.prototype.deletePoi = function (objectId) {
    var p = this.pois[objectId];
    if (p != null) {
        // 从数组中删除对象
        this.pois[objectId] = null;
        if (p.marker_) {
            this.map.removeOverlay(p.marker_);
        }
    }
}

bmap.prototype.clearPoi = function () {
    for (var i = 0; i < this.poi_markers.length; i++) {
        var m = this.poi_markers[i];
        if (m) {
            this.map.removeOverlay(m);
        }
    }
    this.poi_markers = [];
    this.pois = [];
}

////lon,lat: 中心点经纬度
////meter: 半径，单位(米)
var getRectangle = function (lon, lat, meter) {
    var pi = 3.1415926535897932;
    var ranx, rany;
    var x, y;
    y = lat;
    x = 90 - y;
    x = Math.sin(x * pi / 180);
    x = 40075.38 * x;
    x = x / 360;
    x = x * 1000;
    ranx = meter / x;
    rany = meter / 110940;
    return {
        x1: lon - ranx,
        y1: lat - rany,
        x2: lon + ranx,
        y2: lat + rany
    };
}

bmap.prototype.showGeo = function (poi) {
    // var latLng;
    // latLng = new BMap.Point(poi.lon, poi.lat);
    // this.map.setZoom(15);
    // this.map.setCenter(latLng);
    if (current_retangle) {
        this.map.removeOverlay(current_retangle);
        this.map.removeOverlay(current_retangle_label);
    }
    // var rect = getRectangle(poi.lon, poi.lat, poi.width);
    var bps = [];
    for(var i = 0; i < poi.points.length; i++){
        var bp = new BMap.Point(poi.points[i].lon, poi.points[i].lat);
        bps.push(bp);
    }
    current_retangle = new BMap.Polygon(bps, {strokeColor: "#FF0000", strokeWeight: 2, strokeOpacity: 0.8});
    this.map.addOverlay(current_retangle);
    var latLng;
    latLng = current_retangle.getBounds().getCenter();
    this.map.setZoom(15);
    this.map.setCenter(latLng);
    var opts = {
        position: latLng,    // 指定文本标注所在的地理位置
        offset: new BMap.Size(0, 0)    //设置文本偏移量
    };
    current_retangle_label = new BMap.Label(poi.poi_name, opts);  // 创建文本标注对象
    current_retangle_label.setStyle({
        color: "red",
        fontSize: "12px",
        height: "20px",
        lineHeight: "20px",
        fontFamily: "微软雅黑",
        border: "0px",
        "background-color": "rgba(0,0,0,0)"
    });
    this.map.addOverlay(current_retangle_label);
};

bmap.prototype.deleteGeo = function () {
    if (current_retangle) {
        this.map.removeOverlay(current_retangle);
        this.map.removeOverlay(current_retangle_label);
    }
};

//更改电子围栏宽度
bmap.prototype.changeGeoWidth = function (width) {
    if (current_retangle) {
        var rect = getRectangle(current_retangle.getBounds().getCenter().lng, current_retangle.getBounds().getCenter().lat, width);
        this.map.removeOverlay(current_retangle);
        current_retangle = new BMap.Polygon([
            new BMap.Point(rect.x1, rect.y1),
            new BMap.Point(rect.x2, rect.y1),
            new BMap.Point(rect.x2, rect.y2),
            new BMap.Point(rect.x1, rect.y2)
        ], {strokeColor: "#FF0000", strokeWeight: 2, strokeOpacity: 0.8});
        this.map.addOverlay(current_retangle);
    }
}

bmap.prototype.editGeo = function (div_content, poi, callback) {
    //找到对应的poi
    var p = poi;
    if (poi) {
        var latLng;
        latLng = new BMap.Point(p.lon, p.lat);
//        this.map.setZoom(15);
        this.map.setCenter(latLng);
        current_infowin = new BMap.InfoWindow(div_content);
        if (current_retangle) {
            this.map.removeOverlay(current_retangle);
            this.map.removeOverlay(current_retangle_label);
        }
        var rect = getRectangle(poi.lon, poi.lat, poi.width);
        current_retangle = new BMap.Polygon([
            new BMap.Point(rect.x1, rect.y1),
            new BMap.Point(rect.x2, rect.y1),
            new BMap.Point(rect.x2, rect.y2),
            new BMap.Point(rect.x1, rect.y2)
        ], {strokeColor: "#FF0000", strokeWeight: 2, strokeOpacity: 0.8});
        this.map.addOverlay(current_retangle);
        this.map.openInfoWindow(current_infowin, latLng);

        //围栏新增保存
        $("#add_fenceSave").on("click", function () {
            var addSavefenceUrl = $.cookie('xmlHost') + "poi/?auth_code=" + $.cookie('Login_auth_code');
            var width = $("#width").val().trim();
            var poi_name = $("#poi_name").val().trim();
            if (width == "") {
                return;
            } else if (poi_name == "") {
                return;
            }
            //大于0的数
            if (/^\d+(\.\d+)?$/.test(width)) {

            } else {
                alert("只能输入大于0的数字");
                return;
            }
            var adSaveDate = {
                poi_name: poi_name,
                cust_id: $.cookie('Login_cust_id'),
                poi_type: 0,
                remark: $("#remark").val().trim(),
                lon: current_retangle.getBounds().getCenter().lng, lat: current_retangle.getBounds().getCenter().lat,
                is_geo: 1, width: width, points: [{lon: 0, lat: 0}]
            };
            var addSavefenceObj = {
                type: "POST",
                url: addSavefenceUrl,
                data: adSaveDate,
                success: addSavefence_success,
                error: OnError
            };
            ajax_function(addSavefenceObj);
        });

        //围栏编辑保存
        $("#edit_fenceSave").on("click", function () {
            var addSavefenceUrl = $.cookie('xmlHost') + "poi/" + fenceditArry.poi_id + "?auth_code=" + $.cookie('Login_auth_code');
            var width = $("#width").val().trim();
            var poi_name = $("#poi_name").val().trim();
            if (width == "") {
                return;
            } else if (poi_name == "") {
                return;
            }
            //大于0的数
            if (/^\d+(\.\d+)?$/.test(width)) {
            } else {
                alert("只能输入大于0的数字");
                return;
            }
            var adSaveDate = {
                poi_name: poi_name,
                cust_id: $.cookie('Login_cust_id'),
                poi_type: 0,
                remark: $("#remark").val().trim(),
                lon: current_retangle.getBounds().getCenter().lng, lat: current_retangle.getBounds().getCenter().lat,
                is_geo: 1, width: width, points: [{lon: 0, lat: 0}]
            };
            var addSavefenceObj = {
                type: "PUT",
                url: addSavefenceUrl,
                data: adSaveDate,
                success: editSavefence_success,
                error: OnError
            };
            ajax_function(addSavefenceObj);
        });

        //关闭窗口
        $("#edit_fenceColse,#add_fenceColse").on("click", function () {
            if (current_retangle) {
                wimap.map.closeInfoWindow();
                wimap.map.removeOverlay(current_retangle);
                wimap.map.removeOverlay(current_retangle_label);
            }
        });

        $("#width").on("keyup", function () {
            var thisValue = $(this).val().trim();
            if (/^\d+(\.\d+)?$/.test(thisValue)) {
                wimap.changeGeoWidth(thisValue);
            } else {
            }
        });

        this.setTool(TOOL_TYPE_GEO, p.poi_name, div_content, callback);
    }
};

	// 定义一个控件类,即function
	function ZoomControl(defaultAnchor, defaultOffset, title, buttonImg, onClick) {
		// 默认停靠位置和偏移量
		this.defaultAnchor = defaultAnchor;
		this.defaultOffset = defaultOffset;
		this.buttonImg = buttonImg;
		this.onClick = onClick;
		this.title = title;
	}

	// 通过JavaScript的prototype属性继承于BMap.Control
	ZoomControl.prototype = new BMap.Control();

	// 自定义控件必须实现自己的initialize方法,并且将控件的DOM元素返回
	// 在本方法中创建个div元素作为控件的容器,并将其添加到地图容器中
	ZoomControl.prototype.initialize = function(map) {
		// 创建一个DOM元素
		var div = document.createElement("div");
		// 添加图片
		var img = document.createElement("img");
//		img.src = './images/traffic_off.png';
		img.src = this.buttonImg;
		img.width = 20;
		img.height = 30; 
		var span = document.createElement("span");
		span.innerText = this.title;
		span.style.fontSize = '9px';
		div.appendChild(img);
//		div.appendChild(span);
		// 设置样式
		div.style.cursor = "pointer";
		div.style.border = "1px solid #ccc";
		div.style.backgroundColor = "white";
		div.style.height = '40px';
		div.style.width = '40px';
		div.style.lineHeight = '40px';
		div.style.textAlign = 'center';
		div.style.verticalAlign = 'middle';
		div.style.borderRadius = '5px';
		div.style.paddingTop = '4px';
		div.style.right = '10px';
		div.title = this.title; 
		// 绑定事件,点击一次放大两级
		div.onclick = this.onClick;
		// 添加DOM元素到地图中
		map.getContainer().appendChild(div);
		// 将DOM元素返回
		return div;
	}
	
	// 定义一个控件类,即function
	function CircleControl(defaultAnchor, defaultOffset, title, buttonImg, onClick) {
		// 默认停靠位置和偏移量
		this.defaultAnchor = defaultAnchor;
		this.defaultOffset = defaultOffset;
		this.buttonImg = buttonImg;
		this.onClick = onClick;
		this.title = title;
	}

	// 通过JavaScript的prototype属性继承于BMap.Control
	CircleControl.prototype = new BMap.Control();

	// 自定义控件必须实现自己的initialize方法,并且将控件的DOM元素返回
	// 在本方法中创建个div元素作为控件的容器,并将其添加到地图容器中
	CircleControl.prototype.initialize = function(map) {
		// 创建一个DOM元素
		var div = document.createElement("div");
		// 添加图片
		var img = document.createElement("img");
		img.src = this.buttonImg;
		img.width = 20;
		img.height = 20;
		div.appendChild(img);
		// 添加文字
//		var span = document.createElement("span");
//		span.innerHTML = this.title;
//		div.appendChild(span);
		// 设置样式
		div.style.cursor = "pointer";
		div.style.border = "1px solid #eee";
		div.style.backgroundColor = "white";
		div.style.height = '48px';
		div.style.width = '48px';
		div.style.lineHeight = '48px';
		div.style.textAlign = 'center';
		div.style.verticalAlign = 'middle';
		div.style.borderRadius = '50%';
		div.style.paddingTop = '4px';
		div.title = this.title; 
		// 绑定事件,点击一次放大两级
		div.onclick = this.onClick;
		// 添加DOM元素到地图中
		map.getContainer().appendChild(div);
		// 将DOM元素返回
		return div;
	}	
	
	// 定义一个控件类,即function
	function ImageControl(defaultAnchor, defaultOffset, title, buttonImg, onClick) {
		// 默认停靠位置和偏移量
		this.defaultAnchor = defaultAnchor;
		this.defaultOffset = defaultOffset;
		this.buttonImg = buttonImg;
		this.onClick = onClick;
		this.title = title;
	}

	// 通过JavaScript的prototype属性继承于BMap.Control
	ImageControl.prototype = new BMap.Control();

	// 自定义控件必须实现自己的initialize方法,并且将控件的DOM元素返回
	// 在本方法中创建个div元素作为控件的容器,并将其添加到地图容器中
	ImageControl.prototype.initialize = function(map) {
		// 创建一个DOM元素
		var div = document.createElement("div");
		// 添加图片
		var img = document.createElement("img");
//		img.src = './images/traffic_off.png';
		img.src = this.buttonImg;
		img.width = 24;
		img.height = 24; 
		var span = document.createElement("span");
		span.innerText = this.title;
		span.style.fontSize = '9px';
		div.appendChild(img);
//		div.appendChild(span);
		// 设置样式
		div.style.cursor = "pointer";
		div.style.border = "0px solid #ccc";
		div.style.backgroundColor = "transparent";
		div.style.height = '40px';
		div.style.width = '40px';
		div.style.lineHeight = '40px';
		div.style.textAlign = 'center';
		div.style.verticalAlign = 'middle';
		div.style.borderRadius = '5px';
		div.style.paddingTop = '4px';
		div.style.right = '10px';
		div.title = this.title; 
		// 绑定事件,点击一次放大两级
		div.onclick = this.onClick;
		// 添加DOM元素到地图中
		map.getContainer().appendChild(div);
		// 将DOM元素返回
		return div;
	}	
