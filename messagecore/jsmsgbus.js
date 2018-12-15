 "use strict";

var  msgBusCore = {};

//消息通道
var oChannels = {};
//对象
var msgBusCore = {};
//消息
var msgs = {};

var rMsgFuncPattern = new RegExp("^_ONMSG_");
var rMsgFuncAttrPattern = new RegExp("_ATTR_$");
var rMsgFuncDemoPattern = new RegExp("_DEMO_$");

function innerSubscribe(sChannelName, sMsgType, oController, fCallback, bAsync) {
    if (!sMsgType)
        return;

    if (!oController)
        return;

    if (!fCallback)
        return;

    sChannelName = sChannelName || "default";
    if (sChannelName === "*")
        sChannelName = "default";


    //获取通道
    var oChannel = oChannels[sChannelName];
    if (oChannel === undefined) {
        oChannels[sChannelName] = {};
        oChannel = oChannels[sChannelName];
    }

    if (oChannel[sMsgType] === undefined) {
        oChannel[sMsgType] = [];
    }

    if (fCallback) {
        oChannel[sMsgType].push({
            "controller": oController,
            "callback": fCallback,
            "async":bAsync
        });

        //console.log("subscribe, MsgType:" + sMsgType + " ChannelName:" + sChannelName);
    }

}
function innerPost(oMsg, sMsgType, sChannelName, bAsync) {
    if (!sMsgType)
        return msgBusCore;

    if (!msgs[sMsgType])
        msgs[sMsgType] = oMsg;

    //异步调用
    if (bAsync) {
        //console.log(bAsync);

        setTimeout(function () {
            innerPost(oMsg, sMsgType, sChannelName, false);
        },0);
        return msgBusCore;
    }

    //所有异步发送的控制器
    var aAsyncControllers = [];
    var postedNum = 0;

    if (sChannelName === undefined || sChannelName === "*" || sChannelName === "") {
        //发送至所有通道
        for (var sEveryChannelName in oChannels) {
            postedNum += innerPostToChannel(oMsg, sMsgType, sEveryChannelName, bAsync, oChannels[sEveryChannelName], aAsyncControllers);
        }
    }
    else if (oChannels[sChannelName]) {
        //发送至特定通道
        postedNum += innerPostToChannel(oMsg, sMsgType, sChannelName, bAsync, oChannels[sChannelName], aAsyncControllers);
    }

    if (postedNum == 0) {
        console.log("Warning:Msg Not Any Listener(Sync)." + sMsgType);
        //debugger;
    }

    if (aAsyncControllers.length > 0) {
        //异步
        setTimeout(function () {
            var asyncsLength = aAsyncControllers.length;
            for (var i = 0; i < asyncsLength; i++) {
                if (!aAsyncControllers[i])
                    continue;

                try {
                    aAsyncControllers[i]["callback"].call(aAsyncControllers[i]["controller"], oMsg);
                }
                catch (error) {
                    console.error("Post Msg Error.", error);
                }
            }
            checkPosted(oMsg);
        });
    }
    else
        checkPosted(oMsg);

    return msgBusCore;
}
function checkPosted(msg) {
    if (msg.Posted && typeof (msg.Posted) === "function") {
        msg.Posted.apply(msg.Poster ? msg.Poster : null);
    }
}
function innerPostToChannel(oMsg, sMsgType, sChannelName, bAsync, oChannel, aAsyncControllers) {
    if (!sMsgType)
        return 0;

    if (!oChannel)
        return 0;

    if (!oChannel[sMsgType]) {
        return 0;
    }

    var hited = 0;
    var controllersLength = oChannel[sMsgType].length;
    if (controllersLength == 0) {
        console.log("消息控制器订阅列表数量："+controllersLength+" "+sMsgType);
    }

    for (var i = 0; i < controllersLength; i++) {
        if (!oChannel[sMsgType][i])
            continue;

        if (oChannel[sMsgType][i]["async"]) {
            aAsyncControllers.push(oChannel[sMsgType][i]);
            hited++;
        }
        else {
            try {
                oChannel[sMsgType][i]["callback"].call(oChannel[sMsgType][i]["controller"], oMsg);
            }
            catch (error) {
                console.error("Post Msg Error.", error);
            }
            hited++;
        }
    }

    if (hited == 0) {
        console.log("消息控制器订阅列表数量(Hitted)：" + hited + " " + sMsgType);
    }

    return hited;
}


//消息订阅
msgBusCore.subscribe = function (oController, sChannelName) {

    var attrFuncName = "";
    var demoFuncName = "";
    var funcAttr = null;
    var msgDemo = null;
    var channel = "";
    var msgType = "";
    var async = false;

    if (!oController)
        return msgBusCore;

    if (typeof (oController) !== "object")
        return msgBusCore;

    //提供了控制器，未提供callBack, 遍历所有的字段，注册开放的方法
    for (var f in oController) {
        if (f === undefined)
            continue;

        //自有方法
        if (!oController.hasOwnProperty(f))
            continue;

        if (typeof( oController[f]) !== "function")
            continue;

        //消息头标志, 消息属性标志
        
        if (rMsgFuncPattern.test(f)) {

            if (!rMsgFuncAttrPattern.test(f) && !rMsgFuncDemoPattern.test(f)) {

                channel = "default";
                if (sChannelName)
                    channel = sChannelName;
                async = false;
                msgType = f.substring(7);

                attrFuncName = f + "_ATTR_";

                if (oController[attrFuncName]) {
                    funcAttr = oController[attrFuncName];
                    if (typeof (funcAttr) === "function")
                        funcAttr = funcAttr();
                    if (funcAttr) {
                        if (funcAttr["channel"])
                            channel = funcAttr["channel"];
                        if (funcAttr["msgtype"])
                            msgType = funcAttr["msgtype"];
                        if (funcAttr["async"])
                            async = funcAttr["async"];
                    }
                }

                demoFuncName = f + "_DEMO_";
                if (oController[demoFuncName]) {
                    msgDemo = oController[demoFuncName];
                    if (typeof (msgDemo) === "function")
                        msgDemo = msgDemo();
                    if (msgDemo) {
                        if (!msgs[msgType])
                            msgs[msgType] = msgDemo;
                    }
                }

                innerSubscribe(channel, msgType, oController, oController[f], async);
            } else {
                //console.log("SKIP a method:"+f);
            }
        }
    }

    return msgBusCore;
}
msgBusCore.subscribeCallback = function (sChannelName, sMsgType, oController, fCallback, bAsync) {
    innerSubscribe(sChannelName, sMsgType, oController, fCallback, bAsync);
    return msgBusCore;
}
msgBusCore.unSubscribe = function (oController) {
    if (!oController)
        return msgBusCore;

    for (var sChannelName in oChannels) {
        for (var strMsgTypeName in oChannels[sChannelName]) {
            if (oChannels[sChannelName][strMsgTypeName].length) {

                var ary = oChannels[sChannelName][strMsgTypeName];
                for (var i = ary.length - 1; i >= 0; i--) {
                    var obj = ary[i];
                    if (obj === oController) {
                        ary.splice(i,1);
                    }
                }

                //oChannels[sChannelName][strMsgTypeName] = _.reject(oChannels[sChannelName][strMsgTypeName], function (obj) {
                //    return obj.oController === oController;
                //});
            }
        }
    }

    return msgBusCore;
}
msgBusCore.postAsync = function (oMsg, sMsgType, sChannelName) {
    return innerPost(oMsg, sMsgType, sChannelName, true);
}
msgBusCore.post = function (oMsg, sMsgType, sChannelName) {
    return innerPost(oMsg, sMsgType, sChannelName, false);
}
msgBusCore.lastMsg = function (sMsgType) {
    if (!sMsgType)
        return undefined;

    return msgs[sMsgType];
}
msgBusCore.channel = function (sMsgType) {
    if (!sMsgType)
        return "";

    var matchedChannels = "";
    for (var c in oChannels) {
        //console.log(oChannels[c][sMsgType]);
        if (oChannels[c][sMsgType] != undefined) {
            matchedChannels = matchedChannels + c + ",";
            //console.log(matchedChannels);
        }
    }

    return matchedChannels;
}

msgBusCore.demo = function(){
    console.debug("demo");
}


module.exports = msgBusCore;

