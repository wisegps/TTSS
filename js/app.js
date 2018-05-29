/**
 * 演示程序当前的 “注册/登录” 等操作，是基于 “本地存储” 完成的
 * 当您要参考这个演示程序进行相关 app 的开发时，
 * 请注意将相关方法调整成 “基于服务端Service” 的实现。
 **/
(function($, owner) {
	/**
	 * 获取本级及上级有内容管理权限的id作为adminUser, 如果没有则使用应用的adminUser
	 */
	owner.updateTime = new Date(0)
	owner.getAdminUser = function(uid, parentId, callback){
		if(uid === 0){
			callback(0);
		}else{
			var state = owner.getState();
			// 目前支持两级
			console.log('role from uid:' + uid);
			var query_json = {
				users: uid.toString()
			};
			wistorm_api._sysGet('role', query_json, 'objectId', state.token, function(role){
				console.log('role:' + JSON.stringify(role));
				if(role.status_code === 0 && role.data != null){
	                query_json = {
	                    ACL: 'role:' + role.data.objectId,
	                    objectId: 829901053905473500
	                };
	                wistorm_api._sysGet('page', query_json, 'objectId', state.token, function(page){
	                		console.log('page:' + JSON.stringify(page));
	                		if(page.status_code === 0 && page.data != null){
	                			callback(uid);
	                		}else{
	                			owner.getAdminUser(parentId, 0, callback);
	                		}
	                });
	            }else{
	            		callback(0);
	            }
			});	
		}
	}
	/**
	 * 用户登录
	 **/
	owner.login = function(loginInfo, callback) {
		callback = callback || $.noop;
		loginInfo = loginInfo || {};
		loginInfo.account = loginInfo.account || '';
		loginInfo.password = hex_md5(loginInfo.password) || '';
		var ret = owner.checkValidAccount(loginInfo.account);
		if (!ret.flag) {
			return callback(ret.message);
		}
		if (loginInfo.password.length < 6) {
			return callback('密码最短为6个字符');
		}
		wistorm_api.login(loginInfo.account, loginInfo.password, function(obj){
			console.log(JSON.stringify(obj));
			if(obj.status_code == 0){
				var state = owner.getState();
				state.account = loginInfo.account;
				state.password = loginInfo.password;
				// 加入子账号支持
				state.uid = obj.user_type === 11 ? obj.pid : obj.uid;
				state.adminUser = obj.adminUser || 0;
				state.copyright = obj.copyright || '';
				state.token = obj.access_token;
				state.expire_in = new Date(obj.expire_in);
				owner.setState(state);
				var query_json = {
					uid: obj.uid
				};
				wistorm_api._get('customer', query_json, 'logo,name,other,parentId', state.token, function(customer){
					if(customer && customer.data){
						state.logo = customer.data.logo || 'images/default.png';
						state.name = customer.data.name || loginInfo.account;
						if(customer.data.other && customer.data.other.copyright){
							state.copyright = customer.data.other.copyright || '';
						}
						owner.setState(state);
						owner.getAdminUser(obj.uid, customer.data.parentId[0], function(uid){
							if(uid > 0){
								state.adminUser = uid;
							}
							owner.setState(state);
						});
					}else{
						state.logo = 'images/default.png';
						state.name = loginInfo.account;
						owner.setState(state);
						// 更新一下customer, 以保证注册创建对应的customer
						owner.updateCustomer({name: loginInfo.account, custType: 7}, function(obj){
							console.log('update customer: ' + obj);
						});
					}
					console.log(JSON.stringify(owner.getState()));
					return callback();
				});
				// 设置clientid
				var query = {
					objectId: obj.uid
				};
//				var info = plus.push.getClientInfo();
				var update = {
					'authData.os': plus.os.name,
//					'authData.pushCid': info.clientid,
//					"authData.pushToken": info.token
				};
				wistorm_api.update(query, update, state.token, function(obj){
					if(obj.status_code == 0){
					}else{
						console.log('保存推送参数出错，请稍后重试');
					}
				});
			}else{
				return callback('用户名或密码错误');
			}
		});
	};

	/*
	 * 判断token是否过期，并获取新的token
	*/
	owner.updateToken = function(callback){
		var state = owner.getState();
		var now = new Date();
		var expire_in = new Date(state.expire_in);
		if(expire_in < now){
			wistorm_api.getToken(state.account, state.password, 1, function(obj){
				state.token = obj.access_token;
				state.expire_in = new Date(obj.expire_in);
				owner.setState(state);
				return callback();
			});
		}else{
			return callback();
		}
	}
	
	/*
	 * 获取最新token
	 */
	owner.getToken = function(){
		var state = owner.getState();
		return state.token;
	}

	owner.createState = function(name, callback) {
		var state = owner.getState();
		state.account = name;
		state.token = "token123456789";
		owner.setState(state);
		return callback();
	};
	
	/*
	 * 检测手机号码是否合法
	 */
	owner.checkValidPhone = function(mobile) {
		var flag = false;
		var message = "";
		var myreg = /^(((13[0-9]{1})|(14[0-9]{1})|(17[0]{1})|(15[0-3]{1})|(15[5-9]{1})|(18[0-9]{1}))+\d{8})$/;
		if(mobile == '') {
			message = "手机号码不能为空";
		} else if(mobile.length != 11) {
			message = "请输入有效的手机号码";
		} else if(!myreg.test(mobile)) {
			message = "请输入有效的手机号码";
		} else {
			flag = true;
		}
		return {
			flag: flag,
			message: message
		};
	}
	
	/*
	 * 检测账号是否合法
	 */
	owner.checkValidAccount = function(mobile) {
		var flag = false;
		var message = "";
		if(mobile == '') {
			message = "账号不能为空";
		} else if(mobile.length < 4) {
			message = "请输入有效的账号";
		} else {
			flag = true;
		}
		return {
			flag: flag,
			message: message
		};
	}	
	
	/*
	 * 判断手机号码是否已被注册
	 */
	owner.checkPhoneIsExist = function(mobile, callback){
		var query_json = {
		      mobile: mobile
		};
		wistorm_api.exists(query_json, 'uid', function (obj) {
		      return callback(obj.exist);
		});
	}
	
	/*
	 * 发送短信验证码
	 */
	owner.sendSMS = function(mobile, callback){
		wistorm_api.sendSMS(mobile, 1, "", 0, function(obj){
			console.log(JSON.stringify(obj));
			if(obj.status_code == 0){
				return callback(true, '短信验证码已发送');
			}else{
				return callback(false, '短信验证码发送失败，请重试');
			}
		});
	};
	
	/*
	 * 校验验证码是否正确
	*/
	owner.checkValidCode =  function(mobile, validCode, callback){
		wistorm_api.validCode(mobile, '', 1, validCode, function(obj){
			console.log(JSON.stringify(obj));
			return callback(obj.valid);
		});
	}
	
	/*
	 * 检测设备id是否正确
	 */
	owner.checkDeviceId = function(deviceId, callback){
		var result = {
			flag: false,
			message: '',
			parentId: 0
		};
		if(deviceId == '') {
			result.message = "设备ID不能为空";
			return callback(result);
		} else if(deviceId.length < 10) {
			result.message = "请输入有效的设备ID";
			return callback(result);
		} 	
		//判断设备ID是否存在
		var query = {
			did: deviceId
		};
		wistorm_api._get('_iotDevice', query, 'binded,uid,activedIn', owner.getToken(), function(dev){
			//判断设备ID是否已被其他用户绑定
			if(dev.status_code == 0 && dev.data == null){
				result.message = "设备ID不存在";
				return callback(result);
			}else{
//				if(obj.data.binded){
//					result.message = "设备ID已被其他用户绑定，请更换重试";
//				}else{
//					result.flag = true;
//				}
				wistorm_api._get('vehicle', query, 'did', owner.getToken(), function(vehicle){
					console.log(JSON.stringify(vehicle));
					if(vehicle.data){
						result.message = "设备ID已被其他车辆绑定，请更换重试";
					}else{
						result.parentId = dev.data.uid;
						result.activedIn = dev.data.activedIn ? new Date(dev.data.activedIn) : new Date();
						result.flag = true;
					}
					return callback(result);		
				});
			}
		});
	}

	/**
	 * 新用户注册
	 **/
	owner.reg = function(regInfo, callback) {
		callback = callback || $.noop;
		regInfo = regInfo || {};
		regInfo.account = regInfo.account || '';
		regInfo.password = regInfo.password || '';
		regInfo.validCode = regInfo.validCode || '';
		if (regInfo.account.length < 11) {
			return callback('手机最短需要11个字符');
		}
		if (regInfo.password.length < 6) {
			return callback('密码最短需要6个字符');
		}
		owner.checkPhoneIsExist(regInfo.account, function(exist){
			if(exist){
				return callback('手机已被注册，请更换手机号');
			}else{
				wistorm_api.register(regInfo.account, '', '', hex_md5(regInfo.password), 7, regInfo.validCode, function(obj){
					if(obj.status_code == 0){
						return callback();
					}else{
						return callback('注册失败，请重新注册');
					}
				});
			}
		});
//		var users = JSON.parse(localStorage.getItem('$users') || '[]');
//		users.push(regInfo);
//		localStorage.setItem('$users', JSON.stringify(users));
	};
	
	/*
	 * 获取账号信息
	 */
	owner.getUser = function(callback){
		var state = owner.getState();
		if(state){
			var query = {
				objectId: state.uid
			};
			wistorm_api.get(query, 'username,mobile,mobileVerified,email,emailVerified,authData', state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj);
				}else{
					return callback('获取账号信息失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};
	
	/*
	 * 保存账号信息
	 */
	owner.updateUser = function(update, callback){
		var state = owner.getState();
		if(state){
			var query = {
				objectId: state.uid
			};
			wistorm_api.update(query, update, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback();
				}else{
					return callback('保存账号信息失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};
	
	/*
	 * 保存报警设置选项
	 */
	owner.updateAlertOptions = function(options, callback){
		var state = owner.getState();
		if(state){
			var query = {
				objectId: state.uid
			};
			var update = {
				'authData.alertOptions': options
			};
			wistorm_api.update(query, update, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback();
				}else{
					return callback('保存报警设置失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};	
	
	/*
	 * 获取客户信息
	 */
	owner.getCustomer = function(callback){
		var state = owner.getState();
		if(state){
			var query = {
				uid: state.uid
			};
			wistorm_api._get('customer', query, 'logo,name,sex,province,city,area,address,contact,tel,custType,custTypeId', state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj);
				}else{
					return callback('获取客户信息失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};
	
	/*
	 * 保存客户信息
	 */
	owner.updateCustomer = function(update, callback){
		var state = owner.getState();
		if(state){
			var query = {
				uid: state.uid
			};
			wistorm_api._get('customer', query, 'uid', state.token, function(customer){
				if(customer.status_code == 0 && customer.data){
					wistorm_api._update('customer', query, update, state.token, function(obj){
						console.log(JSON.stringify(obj));
						if(obj.status_code == 0){
							return callback();
						}else{
							return callback('保存客户信息失败，请稍后重试');
						}
					});
				}else{
					var createJson = update;
					createJson.uid = state.uid;
					wistorm_api._create('customer', createJson, state.token, function(obj){
						console.log(JSON.stringify(obj));
						if(obj.status_code == 0){
							return callback();
						}else{
							return callback('保存客户信息失败，请稍后重试');
						}
					});
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};	

	/**
	 * 获取当前状态
	 **/
	owner.getState = function() {
		var stateText = localStorage.getItem('$state') || "{}";
		return JSON.parse(stateText);
	};

	/**
	 * 设置当前状态
	 **/
	owner.setState = function(state) {
		state = state || {};
		localStorage.setItem('$state', JSON.stringify(state));
	};

	var checkEmail = function(email) {
		email = email || '';
		return (email.length > 3 && email.indexOf('@') > -1);
	};

	/**
	 * 找回密码
	 **/
	owner.forgetPassword = function(regInfo, callback) {
		callback = callback || $.noop;
		regInfo = regInfo || {};
		regInfo.account = regInfo.account || '';
		regInfo.password = regInfo.password || '';
		regInfo.validCode = regInfo.validCode || '';
//		if (!checkEmail(email)) {
//			return callback('邮箱地址不合法');
//		}
//		return callback(null, '新的随机密码已经发送到您的邮箱，请查收邮件。');
		wistorm_api.resetPassword(regInfo.account, hex_md5(regInfo.password), 1, regInfo.validCode, function(obj){
			console.log(obj);
			if(obj.status_code == 0){
				return callback();
			}else{
				return callback('修改密码失败，请重试');
			}
		});
	};
	
	/*
	 * 更新设备信息
	 */
	owner.updateDevice = function(did, update, callback) {
		var query = {
			did: did
		};
		wistorm_api._update('_iotDevice', query, update, owner.getToken(), function(obj) {
			return callback(obj);
		});
	};
	
	/*
	 * 添加车辆
	 */
	owner.addVehicle = function(did, plate, brand, battery, buyDate, color, parentId, activedIn, callback){
		var state = owner.getState();
		if(state){
			var serviceRegDate = new Date(activedIn);
			var serviceExpireIn = new Date(activedIn.setYear(activedIn.getFullYear() + 1));
			var create = {
				uid: state.uid,
				did: did,
				name: plate,
				brand: brand,
				battery: battery,
				buyDate: buyDate,
				color: color,
				serviceRegDate: serviceRegDate.format('yyyy-MM-dd'),
				serviceExpireIn: serviceExpireIn.format('yyyy-MM-dd')
			};
			wistorm_api._create('vehicle', create, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(null, obj.objectId);
					// 将设备的管理用户加入本用户的上级用户组中
					if(parentId != 0){
						// 更新用户的升级用户
						var query = {
							uid: state.uid	
						};
						var update = {
							parentId: '%2B' + parentId.join('|')
						}
						wistorm_api._update('customer', query, update, state.token, function(customer){
							if(customer.status_code == 0){
							}else{
								console.log('更新用户上级失败，请稍后重试');
							}
						});
						// 更新设备的激活时间
						var update = {
							activedIn: activedIn.format('yyyy-MM-dd'),
							vehicleId: obj.objectId,
							vehicleName: plate,
							uid: '%2B' + state.uid
						};
						owner.updateDevice(did, update, function(dev){
							if(dev.status_code == 0){
							}else{
								console.log('更新设备信息失败，请稍后重试');
							}							
						});
//						wistorm_api._update('_iotDevice', query, update, state.token, function(dev){
//							if(dev.status_code == 0){
//							}else{
//								console.log('更新设备激活时间失败，请稍后重试');
//							}
//						});
					}else{
						return callback(null, obj.objectId);
					}
				}else{
					return callback('添加车辆失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};

	/*
	 * 保存车辆
	 */
	owner.updateVehicle = function(objectId, did, plate, brand, battery, buyDate, color, callback){
		var state = owner.getState();
		if(state){
			var query = {
				objectId: parseInt(objectId)
			};
			var update = {
				did: did,
				name: plate,
				brand: brand,
				battery: battery,
				buyDate: buyDate,
				color: color
			};
			wistorm_api._update('vehicle', query, update, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					update = {
						vehicleId: objectId,
						vehicleName: plate,
						uid: '%2B' + state.uid
					};
					owner.updateDevice(did, update, function(dev){
						if(dev.status_code == 0){
						}else{
							console.log('更新设备信息失败，请稍后重试');
						}							
					});
					return callback();
				}else{
					return callback('保存车辆失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};
	
	/*
	 * 修复车辆绑定设备
	 */
	owner.fixVehicle = function(vehicle){
		var state = owner.getState();
		if(state){
			if(vehicle.did && vehicle.did !== ''){
				// 更新设备的激活时间
				var update = {
					vehicleId: vehicle.objectId,
					vehicleName: vehicle.name,
					uid: '%2B' + state.uid
				};
				owner.updateDevice(vehicle.did, update, function(dev) {
					if(dev.status_code == 0) {} else {
						console.log('修复车辆绑定设备失败，请稍后重试');
					}
				});
			}
		}
	};
	
	/*
	 * 获取用户列表
	 */
	owner.listCustomer = function(callback){
		var state = owner.getState();
		if(state){
			var query = {
				parentId: state.uid
			};
			wistorm_api._list('customer', query, 'uid,name', '-name', '-name', 0, 0, 1, -1, state.token, function(obj){
//				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					// 把本级id也加入
					obj.data.splice(0, 0, {
						uid: state.uid,
						name: state.name
					}); 
					return callback(obj);
				}else{
					return callback('获取用户列表失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};	

	/*
	 * 获取车辆列表
	*/
	owner.listVehicle = function(uids, callback){
		var state = owner.getState();
		if(state){
			var query = {
				uid: uids.join('|')
			};	
			wistorm_api._list('vehicle', query, 'objectId,name,did,uid', 'uid,name', 'uid', 0, 0, 1, -1, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj);
				}else{
					return callback('获取车辆列表失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};	
	
	/*
	 * 车辆油耗数据统计
	 * 
	 */
	owner.vehicleOilData = function(did, dates, mode, nextMonth, callback) {
		var state = owner.getState();
		var query_json;
		var group;
		var sort;
		if(state) {
			switch(mode) {
				case 1:
					query_json = {
						did: did,
						endTime: dates + ' 00:00:00' + "@" + dates + ' 23:59:59',
						isDelete: 0,
						distance: '>0'
					};
					group = {
						_id: "$did",
						distance: {
							$sum: '$distance'
						},
						fuel: {
							$sum: '$fuel'
						},
						t0: {
							$sum: '$idleRange.time'
						},
						s1: {
							$sum: '$s1Range.fuel'
						},
						d1: {
							$sum: '$s1Range.distance'
						},
						s2: {
							$sum: '$s2Range.fuel'
						},
						d2: {
							$sum: '$s2Range.distance'
						},
						s3: {
							$sum: '$s3Range.fuel'
						},
						d3: {
							$sum: '$s3Range.distance'
						},
						s4: {
							$sum: '$s4Range.fuel'
						},
						d4: {
							$sum: '$s4Range.distance'
						}
					};
					sort = '_id.did';
					break;
				case 2:
					query_json = {
						did: did,
						isDelete: 0,
						endTime: dates + '-01' + ' 00:00:00' + "@" + nextMonth + '-01' + ' 00:00:00',
					}
					group = {
						_id: {
							year: "$year",
							month: "$month",
							day: "$day"
						},
						distance: {
							$sum: '$distance'
						},
						fuel: {
							$sum: '$fuel'
						},
						t0: {
							$sum: '$idleRange.time'
						},
						s1: {
							$sum: '$s1Range.fuel'
						},
						d1: {
							$sum: '$s1Range.distance'
						},
						s2: {
							$sum: '$s2Range.fuel'
						},
						d2: {
							$sum: '$s2Range.distance'
						},
						s3: {
							$sum: '$s3Range.fuel'
						},
						d3: {
							$sum: '$s3Range.distance'
						},
						s4: {
							$sum: '$s4Range.fuel'
						},
						d4: {
							$sum: '$s4Range.distance'
						}
					}
					sort = '_id.year,_id.month,_id.day';
					break;
					case 3:
						query_json = {
						did: did,
						endTime: dates + ' 00:00:00' + "@" + dates + ' 23:59:59',
						isDelete: 0,
						distance: '>0'
					};
					sort = 'startTime';
					break;
			}
			wistorm_api._aggr("_iotTrip", query_json, group, sort, 1, -1, state.token, function(obj) {
				console.log(JSON.stringify(obj));
				callback(obj)
			});
			//              startLon, startLat 起点位置
			//				endLon, endLat 终点位置
			//				startTime: 开始时间
			//				endTime: 结束时间
			//				distance: 行驶距离(km)
			//				fuel: 油耗(L)
			//				duration: 行驶时间(s)
			var data = 'startLon,startLat,endLon,endLat,startTime,endTime,distance,fuel,duration';
			wistorm_api._list('_iotTrip', query_json, data, sort, 0, 0, 0, 1, -1, state.token, function(obj) {
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0) {
					return callback(obj);
				} else {
					return callback('获取车辆列表失败，请稍后重试');
				}
			});
		}
	}
	
	/*
	 * 获取设备数据列表
	*/
	owner.listDevices = function(uids, callback){
		var state = owner.getState();
		if(state){
			var startTime = owner.updateTime.format("yyyy-MM-dd hh:mm:ss");
			var query = {
				uid: uids.join('|'),
				map: 'BAIDU',
				'activeGpsData.rcvTime': startTime + '@2100-01-01'
			};	
			wistorm_api._list('_iotDevice', query, 'vehicleId,vehicleName,did,accOffTime,activeGpsData,params,workType', '-activeGpsData.rcvTime', '-activeGpsData.rcvTime', 0, 0, 1, -1, state.token, function(obj){
//				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					if(obj.data.length > 0){
			            owner.updateTime = new Date(obj.data[0].activeGpsData.rcvTime);
			            owner.updateTime.setSeconds(owner.updateTime.getSeconds() + 1);
			        }
					return callback(obj);
				}else{
					return callback('获取设备列表失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};	

	/*
	 * 删除车辆
	 */
	owner.deleteVehicle = function(objectId, callback){
		var state = owner.getState();
		if(state){
			var query = {
				objectId: parseInt(objectId)
			};
			wistorm_api._delete('vehicle', query, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback();
				}else{
					return callback('删除车辆失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};	
	
	/*
	 * 获取车辆信息
	*/
	owner.getVehicle = function(objectId, callback){
		var state = owner.getState();
		if(state){
			var query = {
				objectId: parseInt(objectId)
			};
			wistorm_api._get('vehicle', query, 'objectId,name,did,brand,battery,buyDate,color,serviceRegDate,serviceExpireIn', state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj.data);
				}else{
					return callback();
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};	
	
	/*
	 * 获取设备信息
	*/
	owner.getDevice= function(did, callback){
		var state = owner.getState();
		if(state){
			var query = {
				did: did,
				map: 'BAIDU'
			};
			wistorm_api._get('_iotDevice', query, 'activeGpsData,params', state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj.data);
				}else{
					return callback();
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};	
	
	/*
	 * 保存电子栅栏大小
	 */
	owner.setGeofenceWidth = function(did, width, callback){
		var state = owner.getState();
		if(state){
			var query = {
				did: did
			};
			var update = {
				'params.geofenceWidth': width
			};
			wistorm_api._update('_iotDevice', query, update, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback();
				}else{
					return callback('保存电子栅栏参数失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};	
	
	/*
	 * 保存电子栅栏中心点
	 */
	owner.setGeofence = function(did, lon, lat, callback){
		var state = owner.getState();
		if(state){
			var query = {
				did: did
			};
			var update = {
				'params.geofenceLon': lon,
				'params.geofenceLat': lat
			};
//			console.log(JSON.stringify(update));
			wistorm_api._update('_iotDevice', query, update, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback();
				}else{
					return callback('设置电子栅栏失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};	
	
	/*
	 * 发送指令
	 */
	owner.sendCommand = function(did, cmdType, params, callback){
		var state = owner.getState();
		if(state){
			wistorm_api.createCommand(did, cmdType, params, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback();
				}else if(obj.status_code == 0x0006){
					return callback('设备离线，请检查设备后重试');
				}else if(obj.status_code == 0x900A){
					return callback('发送指令超时，请稍后重试');
				}else{
					return callback('发送指令失败，请稍后重试');
				}
			})
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};	
	
     /*
	 * 获取报警历史记录
	 */
	owner.listAlert = function(did, alertType, minId, maxId, callback){
		var state = owner.getState();
		if(state){
			var query = {did: did};
			if(alertType != 0){
				var query = {
					did: did,
					alertType: alertType
				};
			}
			wistorm_api._list('_iotAlert', query, 'objectId,did,alertType,lon,lat,speed,direct,status,createdAt', '-createdAt', 'createdAt', minId, maxId, 0, 10, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj);
				}else{
					return callback('获取报警列表失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};	
	
	/*
	 * 获取实时报警
	 */
	owner.listRealAlert = function(alertType, minId, maxId, callback){
		var state = owner.getState();
		if(state){
			var query = {uid: state.uid, alertUndeal: true};
			wistorm_api._list('_iotDevice', query, 'objectId,did,activeGpsData,vehicleName,alertUndeal,updatedAt', '-updatedAt', 'updatedAt', 0, 0, 0, -1, state.token, function(obj){
				console.log('alerts: ' + JSON.stringify(obj));
				if(obj.status_code == 0){
					if(alertType != 0){
						var _obj = {
							status_code: 0,
							total: 0,
							data: []
						};
						for(var i = 0; i < obj.data.length; i++){
							if(obj.data[i].activeGpsData.alerts.indexOf(alertType) > -1 || (alertType === '12295|12296' && (obj.data[i].activeGpsData.alerts.indexOf(12295) > -1 || obj.data[i].activeGpsData.alerts.indexOf(12296) > -1))){
								_obj.data.push(obj.data[i]);
							}
						}
						_obj.total = _obj.data.length;
						console.log('alerts2: ' + JSON.stringify(_obj));
						return callback(_obj);
					}else{
						return callback(obj);
					}
				}else{
					return callback('获取实时报警失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};	
	
	/*
	 * 获取未处理报警计数
	 */
	owner.undealAlert = function(did, callback){
		var state = owner.getState();
		if(state){
		    var query = {
		        uid: state.uid.toString(),
		        alertUndeal: true
		    };
			wistorm_api._count('_iotDevice', query, state.token, function(obj){
				console.log(JSON.stringify(obj));
				var count = obj.status_code == 0 ? obj.count: 0;
				callback(count);
			});
		}else{
			return callback(0);
		}
	};
	
	/*
	 * 保存报警状态
	 */
	owner.updateAlert = function(objectId, status, callback){
		var state = owner.getState();
		if(state){
			var query = {
				objectId: parseInt(objectId)
			};
			var update = {
				status: status
			};
			wistorm_api._update('_iotAlert', query, update, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback();
				}else{
					return callback('修改报警状态失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};
	
	/*
	 * 处理所有报警状态
	 */
	owner.updateAllAlert = function(did, status, callback){
		var state = owner.getState();
		if(state){
			var query = {
				did: did,
				status: 0
			};
			var update = {
				status: status
			};
			wistorm_api._update('_iotAlert', query, update, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback();
				}else{
					return callback('修改报警状态失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};	
	
	/*
	 * 处理所有实时报警状态
	 */
	owner.updateAllRealAlert = function(callback){
		var state = owner.getState();
		if(state){
			var query = {
				uid: state.uid.toString(),
				alertUndeal: true
			};
			var update = {
				alertUndeal: false
			};
			wistorm_api._update('_iotDevice', query, update, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback();
				}else{
					return callback('修改报警状态失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};
	
	/*
	 * 获取轨迹列表
	 */
	owner.listGpsData = function(did, startTime, endTime, callback){
		var state = owner.getState();
		if(state){
			var query = {
				did: did,
				gpsTime: startTime + '@' + endTime,
				map: 'BAIDU'
			};
			wistorm_api._list('_iotGpsData', query, 'lon,lat,speed,direct,status,gpsTime', 'gpsTime', 'gpsTime', 0, 0, 0, -1, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj);
				}else{
					return callback('获取轨迹数据失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};
	
	/*
	 * 获取冲击量和斜面倾角
	 */
	owner.deviceSxData = function(did, startTime, endTime, callback){
		var state = owner.getState();
		if(state){
			var query = {
				did: did,
				getTime: startTime + '@' + endTime
			};
			wistorm_api._list('_iotSxData', query, 'did,data,getTime', 'gpsTime', 'gpsTime', 0, 0, 0, -1, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj);
				}else{
					return callback('获取冲击量数据失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};
	/*
	 * 设置当前选中车辆
	 */
	owner.setCurrentVehicle = function(vehicle){
		var state = owner.getState();
		state.vehicle = vehicle;
		if(!state.vehicles){
			state.vehicles = {};
		}
		if(vehicle){
			state.vehicles[vehicle.did] = vehicle;			
		}
		owner.setState(state);
	};
	
	/*
	 * 获取广告记录
	 */
	owner.getAD = function(){
		var state = owner.getState();
		return state.ad;
	};
	
	/*
	 * 保存广告记录
	 */
	owner.setAD = function(ad){
		var state = owner.getState();
		state.ad = ad;
		owner.setState(state);
	};
	
	/*
	 * 获取当前选中车辆
	 */
	owner.getCurrentVehicle = function(){
		var state = owner.getState();
		return state.vehicle;
	};
	
	/*
	 * 获取指定车辆
	 */
	owner.getLocalVehicle = function(did){
		var state = owner.getState();
		return state.vehicles[did];		
	}
	
	/*
	 * 添加预约
	 */
	owner.addBooking = function(name, mobile, city, sex, callback){
		var state = owner.getState();
		if(state){
			var create = {
				uid: state.adminUser,
				name: name,
				mobile: mobile,
				city: city,
				sex: sex
			};
			wistorm_api._create('booking', create, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(null, obj.objectId);
				}else{
					return callback('预约失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};	
	
	/*
	 * 获取服务网点
	 */
	owner.listBranch = function(city, min_id, max_id, callback){
		var state = owner.getState();
		if(state){
			var query = {
				objectId: '>0',
				uid: state.adminUser
			};
			if(city != ''){
				query.city = city;
			}
			wistorm_api._list('branch', query, 'objectId,name,contact,tel,mobile,city,address,lon,lat,createdAt', '-createdAt', 'createdAt', min_id, max_id, 0, -1, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj);
				}else{
					return callback('获取服务网点数据失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}	
	};
	
	/*
	 * 获取文章
	 */
	owner.listArticle = function(type, minId, maxId, limit, callback){
		var state = owner.getState();
		if(state){
			var query = {
				type: type,
				uid: state.adminUser
			};
			wistorm_api._list('article', query, 'objectId,title,summary,author,img,createdAt', '-createdAt', 'createdAt', minId, maxId, 0, limit, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj);
				}else{
					return callback('获取文章数据失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}	
	};	
	
	/*
	 * 添加预约
	 */
	owner.addFeedback = function(account, name, contact, content, score, deviceInfo, callback){
		var state = owner.getState();
		if(state){
			var create = {
				account: account,
				name: name,
				contact: contact,
				content: content,
				score: score,
				deviceInfo: deviceInfo,
				status: 0
			};
			wistorm_api._create('feedback', create, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(null, obj.objectId);
				}else{
					return callback('反馈失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};	

	/**
	 * 获取应用本地配置
	 **/
	owner.setSettings = function(settings) {
		settings = settings || {};
		localStorage.setItem('$settings', JSON.stringify(settings));
	}

	/**
	 * 设置应用本地配置
	 **/
	owner.getSettings = function() {
			var settingsText = localStorage.getItem('$settings') || "{}";
			return JSON.parse(settingsText);
		}
		/**
		 * 获取本地是否安装客户端
		 **/
	owner.isInstalled = function(id) {
		if (id === 'qihoo' && mui.os.plus) {
			return true;
		}
		if (mui.os.android) {
			var main = plus.android.runtimeMainActivity();
			var packageManager = main.getPackageManager();
			var PackageManager = plus.android.importClass(packageManager)
			var packageName = {
				"qq": "com.tencent.mobileqq",
				"weixin": "com.tencent.mm",
				"sinaweibo": "com.sina.weibo"
			}
			try {
				return packageManager.getPackageInfo(packageName[id], PackageManager.GET_ACTIVITIES);
			} catch (e) {}
		} else {
			switch (id) {
				case "qq":
					var TencentOAuth = plus.ios.import("TencentOAuth");
					return TencentOAuth.iphoneQQInstalled();
				case "weixin":
					var WXApi = plus.ios.import("WXApi");
					return WXApi.isWXAppInstalled()
				case "sinaweibo":
					var SinaAPI = plus.ios.import("WeiboSDK");
					return SinaAPI.isWeiboAppInstalled()
				default:
					break;
			}
		}
	}
	owner.online = true;
}(mui, window.app = {}));