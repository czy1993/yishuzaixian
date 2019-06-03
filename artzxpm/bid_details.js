// 初始化代理提示
var loseralert = 0;
var endDowntimer;
$(function(){
    if(endStatus==0){
        // 初始化拍卖记录状态
        $("#bid_record tr:eq(1)").addClass('lingxian');
        $("#bid_jlall tr:eq(1)").addClass('lingxian');
    }else if(endStatus==1){
        $("#bid_record tr:eq(1)").addClass('chengjiao');
        $("#bid_jlall tr:eq(1)").addClass('chengjiao');
    }
    // 加减步长【
    $('.change_step').click(function(){
        var changObj = $(this).parents('.plus-minus-operation').find('#bidprice');
        var originalPric = Number(changObj.val());
        if($(this).attr('act')=='minus'){
            if((originalPric-Number(steplin)).toFixed(2)*100/100>(Number(nowPrice)+Number(steplin)).toFixed(2)*100/100){
                changObj.val((originalPric-Number(steplin)).toFixed(2)*100/100);
            }else{
                popup.alert('不能再少了！');
                setTimeout(function(){
                    popup.close("asyncbox_alert");
                },2000);
            }
            
        }else if($(this).attr('act')=='add'){
            changObj.val((originalPric+Number(steplin)).toFixed(2)*100/100);
        }
    });
    // 加减步长】
    // 关注操作【
    $('.hright').on('mouseenter','#gz',function(){
        if($(this).attr('st')=='1'){
            $(this).children('.txt').html('取消关注');
        }
    });
    $('.hright').on('mouseout','#gz',function(){
        if($(this).attr('st')=='1'){
            $(this).children('.txt').html('已关注');
        }
    });
    if($('#gz').attr('st')==1){
        $('#gz').addClass('on');
    }
    $('#gz').click(function(){
        var thisbj=$(this);
        var st = $(this).attr('st');
        $.post(setAttentionUrl,{'pid':ws_room_id,'uid':ws_my_uid,'st':st},function(data){
            if (data.status) {
                if(st==0){
                    thisbj.children('.txt').html('已关注');
                    thisbj.attr('st',1);
                    popup.success(data.msg);
                    thisbj.addClass('on');
                    setTimeout(function(){
                        popup.close("asyncbox_success");
                    },2000);
                }else{
                    thisbj.children('.txt').html('关注');
                    thisbj.attr('st',0);
                    popup.success(data.msg);
                    thisbj.removeClass('on');
                    setTimeout(function(){
                        popup.close("asyncbox_success");
                    },2000);
                }
                
            } else {
                popup.alert(data.msg);
            }
        },'json');
    });
    // 关注操作】
    // 如果是拍卖会提示是否进入正在拍卖的拍品
    if(ws_room_id!=mtnowpid && mtstatus=='ing'){
        asyncbox.confirm('拍卖会<strong>《'+mname+'》</strong>正在进行中！<br>是否进入拍卖会？','跳转提示',function(buttonResult){
            if(buttonResult == "ok"){
                document.location.href = mtnowUrl;
                return false;
            }
        });
    }else if(mtstatus=='end'){
        asyncbox.confirm('该拍品所属<strong>《'+mname+'》</strong>拍卖会已结束！<br>是否查看拍卖结论书？','跳转提示',function(buttonResult){
            if(buttonResult == "ok"){
                document.location.href = conclusion;
                return false
            }
        });
    }
    // 手动出价
    $('#manual_but').click(function(){
        postbid(ws_room_id,ws_my_uid,'sd',$('#bidprice').val());
		//alert('操作成功');
		//location.reload();
    });
    // 手动和自动切换
    $('#robot_but').click(function(){
        $(this).parents('#manual').css('display','none');
        $('#auto').css('display','block');
    });
    // 取消代理出价
    $('#manual_tab').click(function(){
        $(this).parents('#auto').css('display','none');
        $('#manual').css('display','block');
    });
    // 启动和关闭代理出价
    $('#isbegin').click(function(){
        var thisbegin = $(this);
        $.post(bidUrl,{'pid':ws_room_id,'uid':ws_my_uid,'bidType':'zd','bidPric':$('#robotprice').val()},function(data){
            if (data.status) {
                // 有权限进行设置出价
                if(data.status==1){
                    // 设置代理出价后操作
                    if(data.opt == 'setup'){
                        thisbegin.html('停止');
                        thisbegin.removeClass('startBtn');
                        thisbegin.addClass('stopBtn');
                        $('#robotprice').attr("disabled", 'disabled'); 
                        if(data.biddata){
                            postbid(ws_room_id,ws_my_uid,'sd',data.biddata.bidPric);
                        }
                    }
                    // 取消代理出价后操作
                    if(data.opt == 'cancel'){
                        thisbegin.html('启动');
                        thisbegin.removeClass('stopBtn');
                        thisbegin.addClass('startBtn');
                        $('#robotprice').removeAttr("disabled");
                    }
                    popup.success(data.msg);
                // 出价小于阶梯价
                }else if(data.status==2){
                    $('#robotprice').removeAttr("disabled");
                    popup.alert(data.msg);
                // 保证金缴纳提醒
                }else if(data.status==3){
                    asyncbox.confirm(data.msg,'缴纳保证金',function(buttonResult){
                        if(buttonResult == "ok"){
                            $.post(bidUrl,{'pid':ws_room_id,'uid':ws_my_uid,'bidType':'zd','bidPric':$('#robotprice').val(),'agr':1},function(data){
                                if (data.status) {
                                    if(data.status==1){
                                        popup.success(data.msg);
                                    }else if(data.status==2){
                                        $('#robotprice').removeAttr("disabled");
                                        popup.alert(data.msg);
                                    }
                                }
                            },'json');
                        }else{
                            $('#robotprice').removeAttr("disabled");
                        }
                    });
                }
            } else {
                alert(data.msg);
            }
        },'json'); 
    });
    // 内容选项卡
    $('#extcon_menu').on('click','li',function(){
          $(this).addClass("on").siblings().removeClass("on");
          var div_index = $(this).index();

          $("#extcon_content>div").eq(div_index).show().siblings().hide();

    });
    // 测试
    $('#test').on('click','a',function(){
        clearInterval(endDowntimer);
    });

});
// web_socket【
    // ajax出价
    function postbid(postpid,postuid,posttype,postprice){
        $('#bidprice').attr("disabled", 'disabled');
        $.post(bidUrl,{'pid':postpid,'uid':postuid,'bidType':posttype,'bidPric':postprice},function(data){
            if (data.status) {
                if(data.status==1){
                    ws.send(JSON.stringify({"type":"bid","thisS":data.thisS}));
                // 出价小于阶梯价
                }else if(data.status==2){
                    $('#bidprice').removeAttr("disabled");
                    popup.alert(data.msg);
                // 保证金缴纳提醒
                }else if(data.status==3){
                    asyncbox.confirm(data.msg,'缴纳保证金',function(buttonResult){
                        if(buttonResult == "ok"){
                            $.post(bidUrl,{'pid':ws_room_id,'uid':postuid,'bidType':'sd','bidPric':$('#bidprice').val(),'agr':1},function(data){
                                if (data.status) {
                                    if(data.status==1){
                                        ws.send(JSON.stringify({"type":"bid","thisS":data.thisS}));
                                    }else if(data.status==2){
                                        $('#bidprice').removeAttr("disabled");
                                        popup.alert(data.msg);
                                    }
                                }
                            },'json');
                        }else{
                            $('#bidprice').removeAttr("disabled");
                        }
                    });
                }
            } else {
                alert(data.msg);
            }
        },'json'); 
    }
    // 建立连接
    function inits() {
        // 等待提示框【
        popStatus(3, '正在建立连接.....', 0,'',true);
        // 等待提示框】
        // 创建websocket
        ws = new WebSocket("ws://"+document.domain+":7272");
        // 当socket连接打开时，输入用户名
        ws.onopen = function() {
            timeid && window.clearInterval(timeid);
            if(reconnect == false){
                // 登录
                var login_data = JSON.stringify({"type":"login","client_name":ws_my_name,"room_id":ws_room_id});
                // 移除等待提示【
                popStatusOff();
                // 移除等待提示】
                // console.log("握手成功，发送登录数据:"+login_data);
                ws.send(login_data);
                reconnect = true;
            }else{
                // 断线重连
                var relogin_data = JSON.stringify({"type":"re_login","client_name":ws_my_name,"room_id":ws_room_id});
                // console.log("握手成功，发送重连数据:"+relogin_data);
                ws.send(relogin_data);
            }
        };
        // 当有消息时根据消息类型显示不同信息
        ws.onmessage = function(e) {
            // console.log(e.data);
            var data = JSON.parse(e.data);
            switch(data['type']){
                // 服务端ping客户端
                case 'ping':
                    ws.send(JSON.stringify({"type":"pong"}));
                    break;;
                // 登录 更新用户列表
                case 'login':
                    //{"type":"login","client_id":xxx,"client_name":"xxx","client_list":"[...]","time":"xxx"}
                    say(data['client_id'], data['client_name'], data['client_name']+' 进入拍场', data['time']);
                    // 更新用户列表
                    flush_client_list(data['client_list']);
                    // console.log(ws_my_name+"登录成功");
                    break;
                // 断线重连，只更新用户列表
                case 're_login':
                    //{"type":"re_login","client_id":xxx,"client_name":"xxx","client_list":"[...]","time":"xxx"}
                    flush_client_list(data['client_list']);
                    // console.log(ws_my_name+"重连成功");
                    break;
                // 发言
                case 'say':
                    //{"type":"say","from_client_id":xxx,"to_client_id":"all/client_id","content":"xxx","time":"xxx"}
                    say(data['from_client_id'], data['from_client_name'], data['content'], data['time']);
                    break;
                // 出价
                case 'bid':
                    bidChange(data.thisS)
                    break;
                // 用户退出 更新用户列表
                case 'logout':
                    //{"type":"logout","client_id":xxx,"time":"xxx"}
                    say(data['from_client_id'], data['from_client_name'], data['from_client_name']+' 退出了', data['time']);
                    flush_client_list(data['client_list']);
            }
        };
        ws.onclose = function() {
            console.log("连接关闭，定时重连");
            // 定时重连
            window.clearInterval(timeid);
            timeid = window.setInterval(init, 3000);
        };
        ws.onerror = function() {
            popStatus(4, '出现错误,请联系网站管理员！', 0,'',true);
            console.log("出现错误");
        };
    }

    // 提交对话
    function onSubmit() {
      var input = document.getElementById("textarea");
      var to_client_id = $("#client_list option:selected").attr("value");
      var to_client_name = $("#client_list option:selected").text();
      ws.send(JSON.stringify({"type":"say","to_client_id":to_client_id,"to_client_name":to_client_name,"content":input.value}));
      input.value = "";
      input.focus();
    }

    // 刷新用户列表框
    function flush_client_list(client_list){
        var userlist_window = $("#userlist ul");
        var client_list_slelect = $("#client_list");
        userlist_window.empty();
        client_list_slelect.empty();
        client_list_slelect.append('<option value="all" id="cli_all">所有人</option>');
        for(var p in client_list){
            userlist_window.append('<li id="'+client_list[p]['client_id']+'">'+client_list[p]['client_name']+'</li>');
            client_list_slelect.append('<option value="'+client_list[p]['client_id']+'">'+client_list[p]['client_name']+'</option>');
        }
        $("#client_list").val(select_client_id);
    }

    // 发言
    function say(from_client_id, from_client_name, content, time){
        $("#dialog").append('<div class="speech_item"><div class="item_head clearfix"><img src="http://lorempixel.com/38/38/?'+from_client_id+'" class="user_icon" /> <div class="head_con">'+from_client_name+' <span class="tm">'+time+'</span></div></div><p class="triangle-isosceles"><img src="'+ltnr+'" class="ltnr" />'+content+'</p> </div>');
        var speed=200;//滑动的速度
        $('.caption_box').animate({ scrollTop: $('#dialog').height()}, speed);
        
    }
    $(function(){
        select_client_id = 'all';
        $("#client_list").change(function(){
             select_client_id = $("#client_list option:selected").attr("value");
        });
    });
// web_socket】

// 更新页面信息
function bidChange(data){
    // 竞拍出价
    if(bidtype == 0){
        bidCount=data.bidcount;
        steplin = data.stepsize;
        nowPrice = data.nowprice;
        nowUid = data.uid;
        $('#nowprice').html('<span class="prcl1">'+data.nowprice+'<span class="unit">元</span></span>');
        $('#bidprice').removeAttr("disabled");
        $('#bidprice').val(Number(data.nowprice)+Number(data.stepsize));
        $('#stped').html(Number(data.nowprice)+Number(data.stepsize));
        $('#steps').html(data.stepsize);
        $('#bidcount').html(data.bidcount);
        $('.nobody').remove();
        $('tr.lingxian').removeClass('lingxian');
        var bid_item = '';
        var bid_itemall = '';
        $.each(data.recordList,function(drk,drv){
            bid_item += '<tr  title="'+drv.time+'" uid="'+drv.uid+'"><td><div class="bidlistico"></div></td><td><span class="on_over" style="width: 60px;">'+drv.nickname+'</span></td><td align="right">';
            if(drv.type=='代理'){
                bid_item += '<span title="代理出价" class="agency_ico"></span>'
            }
            bid_item += drv.money+'</td><td align="right">'+drv.bided+'</td></tr>';
            bid_itemall += '<tr uid="'+drv.uid+'"><td><div class="bidlistico"></div></td><td><span class="on_over" style="width: 60px;">'+drv.nickname+'</span></td><td align="left">';
            if(drv.type=='代理'){
                bid_itemall += '<span title="代理出价" class="agency_ico"></span>'
            }
            bid_itemall += drv.type+'出价</td><td align="right">'+drv.money+'</td><td align="right">'+drv.bided+'</td><td align="center">'+drv.time+'</td></tr>';
            // 我的出价
            if(drv.uid==ws_my_uid){
                var my_item='<tr title="'+drv.time+'" uid="'+drv.uid+'"><td align="center">'+drv.type+'</td><td align="right">'+drv.money+'</td><td align="right"><span class="red1 fb">'+drv.bided+'</span></td></tr>';
                $('#my_record .th').after(my_item);
                if($('#my_record tr').size()>11){
                    $('#my_record tr:last-child').remove();
                }
                $('#mycount').html(parseInt($('#mycount').html())+1);
            } 
        });
        $('#bid_record .th').after(bid_item);
        if($('#bid_record tr').size()>10){
            $('#bid_record tr').eq(10).nextAll().remove();
        }
        // 全部出价
        $('#bid_jlall .th').after(bid_itemall);
        // 设置领先样式
        $('#bid_record tr').eq(1).addClass('lingxian');
        $('#bid_jlall tr').eq(1).addClass('lingxian');

        
        // 更新结束时间
        calibrationEndtime(data.endtime,data.nowtime);
    // 竞标出价
    }else if(bidtype == 1){
        bidCount=data.bidcount;
        $('#bidcount').html(data.bidcount);
        $('.nobody').remove();
        // 全部部分出价
        var bid_item='<tr uid="'+data.uid+'"><td><span class="on_over" style="width: 60px;">竞标保密</span></td><td align="center">'+data.type+'</td><td align="right"><span class="red1 fb">竞标保密</span></td><td align="center">'+data.time+'</td></tr>';
        $('#bid_record .th').after(bid_item);
        if($('#bid_record tr').size()>11){
            $('#bid_record tr:last-child').remove();
        }
        // 全部出价
        $('#bid_jlall .th').after(bid_item);
        // 我的出价
        if(data.uid==ws_my_uid){
            var my_item='<tr uid="'+data.uid+'"><td align="center">'+data.type+'</td><td align="right"><span class="red1 fb">'+data.money+'</span></td><td align="center">'+data.time+'</td></tr>';
            $('#my_record .th').after(my_item);
            if($('#my_record tr').size()>11){
                $('#my_record tr:last-child').remove();
            }
            $('#mycount').html(parseInt($('#mycount').html())+1);
        }
    }
}


// 结束倒计时
function endDown(etime,ntime,boxobj,day_elem,hour_elem,minute_elem,second_elem,msec_elem){
    var now_time = new Date(ntime*1000);
    var end_time = new Date(etime*1000);
    var native_time = new Date().getTime(); //本地时间
    var now_cha = now_time - native_time; //服务器和本地时间差
    var native_end_time = end_time - now_cha; //本地结束时间
    var sys_second = 0;
    endDowntimer = setInterval(function(){
        // 检查本地时间是否更改
        if(Math.abs(native_time - new Date().getTime())>5000){
            $.post(ajaxGetTime, {'pid':ws_room_id},function(data){
                calibrationEndtime(data.endtime,data.nowtime);
            });
        }
        sys_second = (native_end_time - new Date().getTime())/100; //本地结束剩余时间
        if (sys_second > 0) {
            sys_second -= 1;
            var day = Math.floor((sys_second / 36000) / 24);
            var hour = Math.floor((sys_second / 36000) % 24);
            var minute = Math.floor((sys_second / 600) % 60);
            var second = Math.floor((sys_second/10) % 60);
            var msec = Math.floor(sys_second % 10); //毫秒
            day_elem && $(day_elem).text(day);//计算天
            $(hour_elem).text(hour<10?"0"+hour:hour);//计算小时
            $(minute_elem).text(minute<10?"0"+minute:minute);//计算分
            $(second_elem).text(second<10?"0"+second:second);// 计算秒
            $(msec_elem).text(msec);// 计算秒的1/10
            native_time = new Date().getTime();
        } else { 
            // 本地时间结束提交服务器验证是否结束
            $.post(ajaxCheckSucc, {'pid':ws_room_id},function(data){
                if(data.status==0){
                    calibrationEndtime(data.end_time,data.now_time);
                }else{
                    clearInterval(endDowntimer);
                    if(data.status==1){
                        $('#bidTimeStatus').remove();
                        $(boxobj).parents('.onBidTbox').html('<div class="into">拍卖已结束...</div>');
                        var user = data.nickname;
                        if(data.uid==ws_my_uid){user ='您';}
                        var msg = '恭喜'+user+'以'+data.money+'元，拍到《'+data.pname+'》';
                    }else if (data.status==2){
                        var msg = '《'+data.pname+'》未达到保留价，流拍！'
                    }else if (data.status==3){
                        $('#bidTimeStatus').remove();
                        $(boxobj).html('<div class="into">拍品已撤拍...</div>');
                        var msg = '《'+data.pname+'》管理员撤拍！<br/>如果您缴纳过保证金，现在已退还到您的账户。请注意查收'
                    }
                    // 判断当前拍品归属执行操作
                    // 拍卖会操作
                    if(mid!=0){
                        // 显示结束信息
                        if(mtnextPid!=''){
                            var msgtz = '<br/>即将开始下一件拍品！'; 
                        }else{
                            var msgtz = '<br/>正在生成结论书！'; 
                        }
                        popup.success(msg+msgtz);
                        setTimeout(function(){
                            popup.close("asyncbox_success");
                            if(mtnextPid!=''){
                                document.location.href = mtnextUrl;
                            }else{
                                document.location.href = conclusion;
                            }
                        },2000);
                        // 如果下一件拍品存在则跳转到链接地址 否则生成结论书
                        
                    // 普通拍品操作
                    }else{
                        popup.success(msg,'结束提示',function(action){
                    　　　//success 返回两个 action 值，分别是 'ok' 和 'close'。
                            if(action == 'ok'){
                                window.top.location.reload();
                            }
                            if(action == 'close'){
                                window.top.location.reload();
                            }
                        });
                    } 
                }
            });
        }
    }, 100);
}
// 开始时间倒计时
function startDown(stime,ntime,boxobj,day_elem,hour_elem,minute_elem,second_elem,msec_elem){
    var now_time = new Date(ntime*1000);
    var end_time = new Date(stime*1000);
    var native_time = new Date().getTime(); //本地时间
    var now_cha = now_time - native_time; //服务器和本地时间差
    var native_end_time = end_time - now_cha; //本地结束时间
    var sys_second = 0;
    startDowntimer = setInterval(function(){
        if(Math.abs(native_time - new Date().getTime())>1000){
            clearInterval(startDowntimer);
            $.post(ajaxGetTime, {'pid':ws_room_id},function(data){
                calibrationStarttime(data.starttime,data.nowtime);
            });
        }
        sys_second = (native_end_time - new Date().getTime())/100; //本地结束剩余时间
        if (sys_second > 0) {
            sys_second -= 1;
            var day = Math.floor((sys_second / 36000) / 24);
            var hour = Math.floor((sys_second / 36000) % 24);
            var minute = Math.floor((sys_second / 600) % 60);
            var second = Math.floor((sys_second/10) % 60);
            var msec = Math.floor(sys_second % 10); //毫秒
            day_elem && $(day_elem).text(day);//计算天
            $(hour_elem).text(hour<10?"0"+hour:hour);//计算小时
            $(minute_elem).text(minute<10?"0"+minute:minute);//计算分
            $(second_elem).text(second<10?"0"+second:second);// 计算秒
            $(msec_elem).text(msec);// 计算秒的1/10
            native_time = new Date().getTime();
        } else { 
            $('http://www.artzxpm.com/views/default/js/.noStartBidTbox .th').html('拍卖已开始');
            $(boxobj).html('<div class="into">正在进入拍卖...</div>');
            window.top.location.reload();
        }
    }, 100);
}
// 校准结束时间
function calibrationEndtime(etime,ntime){
    clearInterval(endDowntimer);
    endDown(etime,ntime,".onBidtime","http://www.artzxpm.com/views/default/js/.onBidtime .day","http://www.artzxpm.com/views/default/js/.onBidtime .hour",".onBidtime .minute",".onBidtime .second","http://www.artzxpm.com/views/default/js/.onBidtime .msec");
}
// 校准开始时间
function calibrationStarttime(stime,ntime){
    clearInterval(startDowntimer);
    startDown(stime,ntime,".noStartTime","http://www.artzxpm.com/views/default/js/.noStartTime .day","http://www.artzxpm.com/views/default/js/.noStartTime .hour",".noStartTime .minute",".noStartTime .second","http://www.artzxpm.com/views/default/js/.noStartTime .msec");
}
