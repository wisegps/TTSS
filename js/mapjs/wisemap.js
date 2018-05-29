var baidumap = new BMap.Map("container");

function wiseMap(map_type, div_map, center_point, zoom, opt, panorama_map) {
    var map = null;
    switch (map_type) {
        case MAP_TYPE_GOOGLE:
            var latLng = new google.maps.LatLng(center_point.lat, center_point.lon);
            map = new gmap(div_map, latLng, zoom, opt);
            break;
        case MAP_TYPE_BAIDU:
            var latLng = new BMap.Point(center_point.lon, center_point.lat);
            map = new bmap(div_map, latLng, zoom, opt, panorama_map);
            break;
    }
    return map;
}

function setLocation(idx, rev_lon, rev_lat, obj, showLocation) {
    var pt = new BMap.Point(rev_lon, rev_lat);
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
                showLocation(obj, getAddAddress);
            }
        }, { "poiRadius": "500", "numPois": "10" });
    });
}

function setLocation2(idx, b_lon, b_lat, obj, showLocation) {
    var pt = new BMap.Point(b_lon, b_lat);
    var gc = new BMap.Geocoder();
    gc.getLocation(pt, function (rs) {
//  		console.log(JSON.stringify(rs));
        var di = 2000;
        var shortpoint = -1;
        var near = '';
        var shortAddr = '';
        
        for (i = 0; i < rs.surroundingPois.length; i++) {
//      		console.log(rs.surroundingPois[i].title);
            var d = baidumap.getDistance(rs.surroundingPois[i].point, pt);
            if (d < di) {
                shortpoint = i;
                di = d;
            }
        }

        if (shortpoint >= 0) {
            shortAddr = rs.addressComponents.district + rs.addressComponents.street + rs.addressComponents.streetNumber;
            near = rs.surroundingPois[shortpoint].title;
        } else {
            shortAddr = rs.addressComponents.district + rs.addressComponents.street + rs.addressComponents.streetNumber;
        }

        if (showLocation) {
            showLocation(obj, rs.address, near, shortAddr);
        }
    }, {"poiRadius": "500", "numPois": "10"});
}

function androidMarket( pname ) {
	plus.runtime.openURL( "market://details?id="+pname );
}
function iosAppstore( url ) {
	plus.runtime.openURL( "itms-apps://"+url );
}

function openBMap(lon, lat, glon, glat, title, address) {
	var url=null,id=null,f=null;
	address = address == ''? title: address;
	switch ( plus.os.name ) {
		case "Android":
		// 规范参考官方网站：http://developer.baidu.com/map/index.php?title=uri/api/android
		url = "baidumap://map/marker?location=" + lat + "," + lon + "&title=" + title + "&content=" + address + "&src=wz";
		f = androidMarket;
		id = "com.baidu.BaiduMap";
		break;
		case "iOS":
		// 规范参考官方网站：http://developer.baidu.com/map/index.php?title=uri/api/ios
//		url = "baidumap://map/marker?location=" + lat.toFixed(6) + "," + lon.toFixed(6) + "&title=" + title + "&content=" + address + "&src=wz";
		url = 'http://maps.apple.com/?q=' + title + '&ll=' + glat.toFixed(6) + "," + glon.toFixed(6) + '&spn=0.008766,0.019441';
//		url = "baidumap://map/marker?location=39.968789,116.347247&title=DCloud&content=%e6%89%93%e9%80%a0HTML5%e6%9c%80%e5%a5%bd%e7%9a%84%e7%a7%bb%e5%8a%a8%e5%bc%80%e5%8f%91%e5%b7%a5%e5%85%b7&src=HelloH5";
		f = iosAppstore;
		id = "itunes.apple.com/cn/app/bai-du-de-tu-yu-yin-dao-hang/id452186370?mt=8";
		break;
		default:
		return;
		break;
	}
	url = encodeURI(url);
	console.log(url);
	plus.runtime.openURL( url, function(e) {
		if(plus.os.name === 'Android'){
			plus.nativeUI.confirm( "检查到您未安装百度地图，是否到商城搜索下载？", function(i){
				if ( i.index == 0 ) {
					f(id);
				}
			} );
		}else{
			plus.nativeUI.alert( "检查到您未安装地图程序\n" );
		}
	} );
}