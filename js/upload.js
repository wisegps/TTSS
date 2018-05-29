	// 上传文件
	var uploadFile = function(f, callback) {
		console.log('upload');
		if(!f) {
			plus.nativeUI.toast("请选择图像文件！");
			return;
		}
		//	var wt=plus.nativeUI.showWaiting();
		var path = wistorm_api.upload();
		console.log(path);
		var task = plus.uploader.createUpload(path, { method: "POST" },
			function(t, status) { //上传完成
				if(status == 200) {
					console.log(t.responseText);
					//				wt.close();
					return callback();
				} else {
					plus.nativeUI.toast("上传文件失败！");
					//				wt.close();
					return callback();
				}
			}
		);
		task.addFile(f.path, { image: f.name });
		task.start();
	};