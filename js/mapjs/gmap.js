var select_vehicle = null;
var toolType = TOOL_TYPE_DEFAULT;
var current_marker = null;
var current_infowin = null;
var current_retangle = null;
if (typeof (BMap) != "undefined") {
    var baidumap = new BMap.Map("container");
}

//document.write('<script type="text/javascript" src="http://ditu.google.cn/maps/api/js?v=3&amp;sensor=false"></script>');
//document.write('<script type="text/javascript" src="/Scripts/MapJs/markerwithlabel.js"></script>');
//document.write('<script type="text/javascript" src="/Scripts/MapJs/markerclusterer.js"></script>');

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


function gmap(div_map, center_point, zoom) {
    this.map = new google.maps.Map(div_map, {
        zoom: zoom,
        center: center_point,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapMaker: false,
        noClear: true
    });
    this.geocoder = new google.maps.Geocoder();
    this.vehicles = [];
    this.pois = [];
    this.geos = [];
    this.markers = [];
    this.poi_markers = [];
    this.markerClusterer = null;
    this.showLocation = null;
    this.mapClick = null;
}

gmap.prototype.setCenter = function (lon, lat) {
    point = new google.maps.LatLng(lat, lon);
    this.map.setCenter(point);
};

bmap.prototype.getCenter = function(){
    var lon = this.map.center.lng();
    var lat = this.map.center.lat();
    return {
        lon: lon,
        lat: lat
    }
};

// 获取地址后的函数处理
gmap.prototype.setShowLocation = function (fun) {
    this.showLocation = fun;
}

function vehicleMarker(vehicle, if_track, if_show_line) {
    this.obj_id = vehicle.obj_id;
    this.obj_name = vehicle.obj_name;
    this.lon = vehicle.active_gps_data.lon;
    this.lat = vehicle.active_gps_data.lat;
    this.rev_lon = vehicle.active_gps_data.rev_lon;
    this.rev_lat = vehicle.active_gps_data.rev_lat;
    this.speed = vehicle.active_gps_data.speed;
    this.direct = vehicle.active_gps_data.direct;
    this.if_track = if_track;
    this.if_show_line = if_show_line;
    this.track_line = null;
    this.track_lines = [];
    this.content = "";
    this.marker_ = null;
    this.infowin_ = null;
}

function poiMarker(poi) {
    this.poi_id = poi.poi_id;
    this.poi_name = poi.poi_name;
    this.poi_type = poi.poi_type;
    this.lon = poi.lon;
    this.lat = poi.lat;
    this.rev_lon = poi.rev_lon;
    this.rev_lat = poi.rev_lat;
    this.remark = poi.remark;
    this.marker_ = null;
}

gmap.prototype.addVehicles = function (vehicles) {
    var v = null;
    var latLng = null;
    var icon = "";
    var title = "";
    for (var i = 0; i < vehicles.length; i++) {
        if (vehicles[0] != null) {
            var v = this.vehicles[vehicles[i].obj_id];
            // 判断车辆是否存在，存在则更新数据，不存在则添加
            if (v != null) {
                this.updateVehicle(vehicles[i], false, false, false, '#FF0000', 3, false);
            } else {
                //                if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
                //                    latLng = new google.maps.LatLng(vehicles[i].active_gps_data.lat, vehicles[i].active_gps_data.lon);
                //                } else {
                latLng = new google.maps.LatLng(vehicles[i].active_gps_data.rev_lat, vehicles[i].active_gps_data.rev_lon);
                //                }
                v = new vehicleMarker(vehicles[i], false, false);
                icon = getIcon(vehicles[i], MAP_TYPE_GOOGLE);
                title = vehicles[i].obj_name + "（" + getStatusDesc(vehicles[i], 2) + "）";
                v.marker_ = new MarkerWithLabel({
                    title: title,
                    position: latLng,
                    icon: icon,
                    draggable: false,
                    raiseOnDrag: false,
                    //map: this.map,
                    labelContent: vehicles[i].obj_name,
                    labelAnchor: new google.maps.Point(0, 20),
                    labelClass: "labels", // the CSS class for the label
                    labelStyle: { opacity: 0.75 }
                });
                content = getMapContent(vehicles[i]);
                //打开该车辆的信息窗体
                var infowin = new google.maps.InfoWindow({
                    content: content,
                    disableAutoPan: true
                });
                v.infowin_ = infowin;

                var fn = markerClickFunction(v);
                google.maps.event.addListener(v.marker_, "click", fn);

                google.maps.event.addListener(this.map, "click", function (e) {
                    if (select_vehicle) {
                        select_vehicle.infowin_.close();
                    }
                });
                this.vehicles[vehicles[i].obj_id] = v;
                this.markers.push(v.marker_);
            }
        }
    }

    if (this.markerClusterer == null) {
        //        this.markerClusterer = new MarkerClusterer(this.map, this.markers);
        this.markerClusterer = new MarkerClusterer(this.map, this.markers, { maxZoom: 14 });
    } else {
        this.markerClusterer.addMarkers(this.markers);
    }

}

var markerClickFunction = function (v) {
    return function (e) {
        if (select_vehicle) {
            select_vehicle.infowin_.close();
        }

        v.infowin_.open(this.map, this);
        // 设置该车辆为选中车辆
        select_vehicle = v;
    };
};

// 设置地图缩放比例
gmap.prototype.setZoom = function (level) {
    this.map.setZoom(level);
};

// 更新车辆显示
gmap.prototype.updateVehicle = function (vehicle, if_track, if_show_line, if_open_win, color, width, if_playback) {
    var v = this.vehicles[vehicle.obj_id];
    var content = "";
    if (v != null) {
        var oldlatLng;
        var oldGpsTime;
//        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
//            oldlatLng = new google.maps.LatLng(v.lat, v.lon);
//        } else {
            oldlatLng = new google.maps.LatLng(v.rev_lat, v.rev_lon);
//        }
        oldGpsTime = v.gps_time;
        v.lon = vehicle.active_gps_data.lon;
        v.lat = vehicle.active_gps_data.lat;
        v.rev_lon = vehicle.active_gps_data.rev_lon;
        v.rev_lat = vehicle.active_gps_data.rev_lat;
        v.gps_time = vehicle.active_gps_data.gps_time;
        v.speed = vehicle.active_gps_data.speed;
        v.direct = vehicle.active_gps_data.direct;

        var latLng;
//        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
//            latLng = new google.maps.LatLng(vehicle.active_gps_data.lat, vehicle.active_gps_data.lon);
//        } else {
            latLng = new google.maps.LatLng(vehicle.active_gps_data.rev_lat, vehicle.active_gps_data.rev_lon);
//        }

        var distance;
        if (if_show_line) {
            distance = calDistance(oldlatLng.lng(), oldlatLng.lat(), latLng.lng(), latLng.lat());
            //            var duration = dateDiff(NewDate(oldGpsTime), NewDate(v.gps_time), "mm")
            if (distance < 2) {
                if (!v.track_line) {
                    var polyOptions = {
                        strokeColor: color,
                        strokeOpacity: 1.0,
                        strokeWeight: width
                    }
                    v.track_line = new google.maps.Polyline(polyOptions);
                    v.track_line.setMap(this.map);
                    var path = v.track_line.getPath();
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


        var icon = getIcon(vehicle, MAP_TYPE_GOOGLE);
        v.marker_.setPosition(latLng);
        v.marker_.setIcon(icon);
        v.marker_.setVisible(true);
        content = getMapContent(vehicle, if_playback);
        v.infowin_.setContent(content);

        if (if_track) {
            var bounds = this.map.getBounds();
            if (v.rev_lon < bounds.getSouthWest().lng() || v.rev_lon > bounds.getNorthEast().lng() ||
                v.rev_lat < bounds.getSouthWest().lat() || v.rev_lat > bounds.getNorthEast().lat()) {
                this.map.setCenter(latLng);
            }
        }


        if (if_open_win) {
            v.infowin_.open(this.map, v.marker_);
        }
    }
}

gmap.prototype.findVehicle = function (obj_id, if_track, if_open_win) {
    var v = this.vehicles[obj_id];
    var content = "";
    if (v != null) {
        var latLng;
//        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
//            latLng = new google.maps.LatLng(v.lat, v.lon);
//        } else {
            latLng = new google.maps.LatLng(v.rev_lat, v.rev_lon);
//        }
        if (if_track) {
            this.map.setZoom(15);
            this.map.setCenter(latLng);
        }
        if (if_open_win) {
            if (select_vehicle) {
                select_vehicle.infowin_.close();
            }
            v.infowin_.open(this.map, v.marker_);
            select_vehicle = v;
        }
        // 获取地址
        //        this.geocoder.geocode({ 'latLng': new google.maps.LatLng(v.rev_lat, v.rev_lon) }, function (results, status) {
        //            if (status == google.maps.GeocoderStatus.OK) {
        //                if (results[1]) {
        //                    if (this.showLocation) {
        //                        this.showLocation(results[0].formatted_address);
        //                    }
        //                }
        //            } else {
        //                //alert("Geocoder failed due to: " + status);
        //            }
        //        });
        var pt = new BMap.Point(v.rev_lon, v.rev_lat);
        if (typeof (BMap.Convertor) != "undefined") {
            BMap.Convertor.translate(pt, 2, function (point) {
                var gc = new BMap.Geocoder();
                gc.getLocation(point, function (rs) {
                    var di = 2000;
                    var shortpoint = -1;
                    for (i = 0; i < rs.surroundingPois.length; i++) {
                        var d = baidumap.getDistance(rs.surroundingPois[i].point, point);
                        if (d < di) {
                            shortpoint = i;
                            di = d;
                        }
                    }

                    if (shortpoint >= 0) {
                        getAddAddress = rs.address + '，离' + rs.surroundingPois[shortpoint].title + di.toFixed(0) + '米';
                    } else {
                        getAddAddress = rs.address;
                    }

                    if (showLocation) {
                        this.showLocation(getAddAddress);
                    }
                }, { "poiRadius": "500", "numPois": "10" });
            });
        }
        return v;
    }

}

gmap.prototype.deleteVehicle = function (obj_id) {
    var v = this.vehicles[obj_id];
    if (v != null) {
        // 从数组中删除对象
        this.vehicles[obj_id] = null;
        this.markers.pop(v.marker_);
        this.markerClusterer.removeMarker(v.marker_);
        if (v.track_lines) {
            for (var i = 0; i < v.track_lines.length; i++) {
                v.track_lines[i].setMap(null);
            }
        }
    }
}

gmap.prototype.clearVehicle = function () {
    this.vehicles = [];
    this.markers = [];
    this.markerClusterer.clearMarkers();
}


gmap.prototype.addTrackLine = function (vehicle, gps_datas, color, width) {
    var v = this.vehicles[vehicle.obj_id];
    var content = "";
    if (v == null) {
        v = new vehicleMarker(vehicle, false, false);
        this.vehicles[vehicle.obj_id] = v;
    }
    var points = [];
    var latLng;
    for (var i = 0; i < gps_datas.length; i++) {
        //        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
        //            latLng = new google.maps.LatLng(gps_datas[i].lat, gps_datas[i].lon);
        //        } else {
        latLng = new google.maps.LatLng(gps_datas[i].rev_lat, gps_datas[i].rev_lon);
        //        }
        points.push(latLng);
    }

    var polyOptions = {
        path: points,
        strokeColor: color,
        strokeOpacity: 1.0,
        strokeWeight: width
    }
    if (v.track_line) {
        v.track_line.setMap(null);
    };
    v.track_line = new google.maps.Polyline(polyOptions);
    v.track_line.setMap(this.map);
}

gmap.prototype.removeTrackLine = function (vehicle) {
    var v = this.vehicles[vehicle.obj_id];
    var content = "";
    if (v != null && v.track_lines != null) {
        for (var i = 0; i < v.track_lines.length; i++) {
            v.track_lines[i].setMap(null);
        }
        v.track_line = null;
    }
}

gmap.prototype.moveTrackPoint = function (vehicle, gps_data, if_open_win) {
    var v = vehicle;
    v.active_gps_data.lon = gps_data.lon;
    v.active_gps_data.lat = gps_data.lat;
    v.active_gps_data.rev_lon = gps_data.rev_lon;
    v.active_gps_data.rev_lat = gps_data.rev_lat;
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

gmap.prototype.openAddGeoTool = function () {
    google.maps.event.addListener(this.map, 'click', function (event) {
        //alert(event.latLng);
        var lon = parseInt(event.latLng.lat() * 600000);
        var lat = parseInt(event.latLng.lng() * 600000);
        lon = strPad(lon.toString(16).toUpperCase());
        lat = strPad(lat.toString(16).toUpperCase());
        alert(lat + "," + lon);
    });
}

var onMapClick = function (map, title, div_content) {
    return function (event) {
        switch (toolType) {
            case TOOL_TYPE_POI:
                //alert("兴趣点：" + event.latLng);
                if (current_infowin) {
                    current_infowin.close();
                }
                current_infowin = new google.maps.InfoWindow({
                    content: div_content,
                    disableAutoPan: true
                });
                if (current_marker) {
                    current_marker.setMap(null);
                }
                current_marker = new google.maps.Marker({
                    position: event.latLng,
                    map: map,
                    title: title
                });
                current_infowin.open(map, current_marker);
                break;
            case TOOL_TYPE_GEO:
                //alert("矩形围栏：" + event.latLng);
                if (current_infowin) {
                    current_infowin.close();
                }
                current_infowin = new google.maps.InfoWindow({
                    content: div_content,
                    disableAutoPan: true,
                    position: event.latLng
                });
                if (current_retangle) {
                    current_retangle.setMap(null);
                }
                current_retangle = new google.maps.Rectangle({
                    strokeColor: "#FF0000",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: "#FF0000",
                    fillOpacity: 0.35,
                    map: map,
                    bounds: getRectangle(event.latLng.lng(), event.latLng.lat(), 100)
                });
                current_infowin.open(map);
                break;
            case TOOL_TYPE_POLY:
                alert("多边形围栏：" + event.latLng);
                break;
            case TOOL_TYPE_ROUTE:
                alert("线路：" + event.latLng);
                break;
        }
    }
}

gmap.prototype.setTool = function (tool_type, title, div_content, callback) {
    toolType = tool_type;
    switch (tool_type) {
        case TOOL_TYPE_DEFAULT:
            google.maps.event.removeListener(this.mapClick);
            if (current_infowin) {
                current_infowin.close();
            }
            if (current_marker) {
                current_marker.setMap(null);
            }
            break;
        case TOOL_TYPE_POI:
        case TOOL_TYPE_GEO:
        case TOOL_TYPE_POLY:
        case TOOL_TYPE_ROUTE:
            fn = onMapClick(this.map, title, div_content);
            this.mapClick = google.maps.event.addListener(this.map, 'click', fn);
            break;
    }
}

gmap.prototype.addPois = function (pois) {
    var p = null;
    var latLng = null;
    var icon = "";
    var title = "";
    for (var i = 0; i < pois.length; i++) {
        this.addPoi(pois[i]);
    }
}

gmap.prototype.addPoi = function (poi) {
    var p = null;
    var latLng = null;
    var icon = "";
    var title = "";
    var p = this.pois[poi.poi_id];
    // 判断兴趣点是否存在，存在则更新数据，不存在则添加
    if (p != null) {
        this.updatePoi(poi);
    } else {
        //        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
        //            latLng = new google.maps.LatLng(poi.lat, poi.lon);
        //        } else {
        latLng = new google.maps.LatLng(poi.rev_lat, poi.rev_lon);
        //        }
        p = new poiMarker(poi);
        icon = getPoiIcon(poi, MAP_TYPE_GOOGLE);
        title = poi.poi_name;
        p.marker_ = new MarkerWithLabel({
            title: title,
            position: latLng,
            icon: icon,
            map: this.map,
            draggable: false,
            raiseOnDrag: false,
            labelContent: poi.poi_name,
            labelAnchor: new google.maps.Point(50, -10),
            labelClass: "labels", // the CSS class for the label
            labelStyle: { opacity: 0.75 }
        });
        this.pois[poi.poi_id] = p;
        this.poi_markers.push(p.marker_);
    }

}

gmap.prototype.findPoi = function (poi_id) {
    var p = this.pois[poi_id];
    var content = "";
    if (p != null) {
        var latLng;
        //        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
        //            latLng = new google.maps.LatLng(p.lat, p.lon);
        //        } else {
        latLng = new google.maps.LatLng(p.rev_lat, p.rev_lon);
        //        }
        this.map.setZoom(10);
        this.map.setCenter(latLng);
        return p;
    }

}

gmap.prototype.editPoi = function (div_content, poi_id, callback) {
    //找到对应的poi
    var p = this.pois[poi_id];
    if (p) {
        var latLng;
        //        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
        //            latLng = new google.maps.LatLng(p.lat, p.lon);
        //        } else {
        latLng = new google.maps.LatLng(p.rev_lat, p.rev_lon);
        //        }
        this.map.setZoom(10);
        this.map.setCenter(latLng);
        current_infowin = new google.maps.InfoWindow({
            content: div_content,
            disableAutoPan: true
        });
        if (current_marker) {
            current_marker.setMap(null);
        }
        current_marker = new google.maps.Marker({
            position: p.marker_.position,
            map: this.map,
            title: p.poi_name
        });
        current_infowin.open(this.map, current_marker);
        //current_marker = p.marker_;
        this.setTool(TOOL_TYPE_POI, p.poi_name, div_content, callback);
    }
}

gmap.prototype.updatePoi = function (poi) {
    var p = this.pois[poi.poi_id];
    var content = "";
    if (p != null) {
        //        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
        //            latLng = new google.maps.LatLng(poi.lat, poi.lon);
        //        } else {
        latLng = new google.maps.LatLng(poi.rev_lat, poi.rev_lon);
        //        }
        p.poi_name = poi.poi_name;
        p.poi_type = poi.poi_type;
        p.lon = poi.lon;
        p.lat = poi.lat;
        p.rev_lon = poi.rev_lon;
        p.rev_lat = poi.rev_lat;
        p.remark = poi.remark;
        var icon = getPoiIcon(poi, MAP_TYPE_GOOGLE);
        p.marker_.setIcon(icon);
        var latLng;
        //        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
        //            latLng = new google.maps.LatLng(poi.lat, poi.lon);
        //        } else {
        latLng = new google.maps.LatLng(poi.rev_lat, poi.rev_lon);
        //        }
        p.marker_.setPosition(latLng);
        p.marker_.label.marker_.labelContent = poi.poi_name;
        p.marker_.label.setContent();
        p.marker_.label.marker_.labelAnchor = new google.maps.Point(50, -10),
        p.marker_.label.setAnchor();
    }
}

gmap.prototype.deletePoi = function (poi_id) {
    var p = this.pois[poi_id];
    if (p != null) {
        // 从数组中删除对象
        this.pois[poi_id] = null;
        if (p.marker_) {
            p.marker_.setMap(null);
        }
    }
}

gmap.prototype.clearPoi = function () {
    for (var i = 0; i < this.poi_markers.length; i++) {
        var m = this.poi_markers[i];
        if (m) {
            m.setMap(null);
        }
    }
    this.poi_markers = [];
    this.pois = [];
}

//lon,lat: 中心点经纬度
//meter: 半径，单位(米)
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
    return new google.maps.LatLngBounds(
        new google.maps.LatLng(lat - rany, lon - ranx),
        new google.maps.LatLng(lat + rany, lon + ranx)
        );
}

gmap.prototype.showGeo = function (poi) {
    var latLng;
    //    if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
    //        latLng = new google.maps.LatLng(poi.lat, poi.lon);
    //    } else {
    latLng = new google.maps.LatLng(poi.rev_lat, poi.rev_lon);
    //    }
    this.map.setZoom(15);
    this.map.setCenter(latLng);
    if (current_retangle) {
        current_retangle.setMap(null);
    }
    current_retangle = new google.maps.Rectangle({
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.35,
        map: this.map,
        bounds: getRectangle(latLng.lng(), latLng.lat(), poi.width)
    });
}

gmap.prototype.deleteGeo = function () {
    if (current_retangle) {
        current_retangle.setMap(null);
    }
}

//更改电子围栏宽度
gmap.prototype.changeGeoWidth = function (width) {
    if (current_retangle) {
        var bounds = getRectangle(current_retangle.getBounds().getCenter().lng(), current_retangle.getBounds().getCenter().lat(), width);
        current_retangle.setBounds(bounds);
    }
}

gmap.prototype.editGeo = function (div_content, poi, callback) {
    //找到对应的poi
    var p = poi;
    if (poi) {
        var latLng;
        //        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
        //            latLng = new google.maps.LatLng(p.lat, p.lon);
        //        } else {
        latLng = new google.maps.LatLng(p.rev_lat, p.rev_lon);
        //        }
        this.map.setZoom(15);
        this.map.setCenter(latLng);
        current_infowin = new google.maps.InfoWindow({
            content: div_content,
            disableAutoPan: true,
            position: latLng
        });
        if (current_retangle) {
            current_retangle.setMap(null);
        }
        current_retangle = new google.maps.Rectangle({
            strokeColor: "#FF0000",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#FF0000",
            fillOpacity: 0.35,
            map: this.map,
            bounds: getRectangle(latLng.lng(), latLng.lat(), p.width)
        });
        current_infowin.open(this.map);

        this.setTool(TOOL_TYPE_GEO, p.poi_name, div_content, callback);
    }
}
