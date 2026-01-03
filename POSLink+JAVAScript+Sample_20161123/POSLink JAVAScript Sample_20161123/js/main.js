var relativeJSPath = "./";
require.config({
	baseUrl: "./",
	shim: {
		"jquery":{
            exports: "$"
        },
        "jquery-ui": {
            deps: ["jquery"]
        },
        "jqueryBase64":{
            deps: ["jquery"]
        }
	},
	paths: {
        "jquery" :  "js/lib/jquery-2.1.4.min",
        "jquery-ui": "js/lib/jquery-ui.min",
        "jqueryBase64": "js/lib/jquery.base64",
        "displayHandler": "js/page/displayHandler",
        "hintDialog": "js/page/hintDialog",
        "validate": "js/page/validate",
        "localData": "js/page/localData",
        "domReady": "js/lib/domReady",
        "pax": "js/Pax/pax"
	}
});

require(['domReady','localData'], function (domReady,LocalData) {
  domReady(function () {
    if(window.localStorage){
        LocalData.GetData();
    }
  });
});

require([
	"jquery",
	"displayHandler",
	"hintDialog",
    "validate",
    "pax",
    "localData",
    "jquery-ui"
], function($, DisplayHandler, HintDialog, validate, PAX, LocalData) {
    var PacketageInfo = {
        'Initialize':{},
        'GetSignature':{},
        'DoSignature':{},
        'DoCredit':{}
    }; 
    var timer;
    var amountInformation,accountInformation,traceInformation,avsInformation,cashierInformation,commercialInformation,motoEcommerce,additionalInformation;                      
    var ConfigureFlag = false;
    var pax = PAX;

    $( "#tabs" ).tabs();
    $("#ConfigureTabs li").click(function(){
        HintDialog.DialogPosition();
    });
    $(window).resize(function(){
       HintDialog.DialogPosition();
    }); 
    $("#ConfigureTabs input").focus(function(){
        $(this).removeClass("error");
        $(this).next("span").remove();
    });

    $("#ConfigureTabs input").on("blur",function(){
        var self = $(this);
        validate.Validate(self);

    });
    $("#ConfigureTabs [name!='CardTypeBitmap']").on("keydown",function(evt){
        var self = $(this);
        var value = $(this).val();
        var minLen,maxLen;
        minLen = validate.MinLen(self);
        maxLen = validate.MaxLen(self);
        evt = (evt) ? evt : window.event;
        if((evt.keyCode>=48 && evt.keyCode<=57) || (evt.keyCode>=96 && evt.keyCode<=105)){
            if(minLen == maxLen){
                if(value.length >= minLen)
                    return false;
            }
            else if(value.length<minLen || value.length>maxLen){
                return false;
            }
        }
    });
    $("#ConfigureTabs input[name='CardTypeBitmap']").on("keydown",function(evt){
        var self = this;
        var value = $(this).val();
        var minLen,maxLen;
        minLen = validate.MinLen(self);
        maxLen = validate.MaxLen(self);
        evt = (evt) ? evt : window.event;
        if((evt.keyCode>=48 && evt.keyCode<=49) || (evt.keyCode>=96 && evt.keyCode<=97) || evt.keyCode==8){
            if(value.length >= maxLen)
                    return false;
        }
        else{
            return false;
        }
    });

    

    $("#tabs button").click(function(){
        if(window.localStorage){
            LocalData.StoreData();
        }
        //LocalData.StoreData();
        DisplayHandler.AddLoading();
        DisplayHandler.EmptyResponse();
        switch(this.className.split(" ")[0]){
            case 'Initialize':
                var version;
                version = ($("input[name='Version']").val() == '')? '1.28' : $("input[name='Version']").val();
                pax.Initialize({"command":'A00',"version":version},function(response){
                    if(typeof(response) == 'string'){
                        var $dialog = $("<div id='dialog' title='Info Dialog'>");
                        HintDialog.CreateDialog("Ajax error: "+response,$dialog);
                        DisplayHandler.RemoveLoading();
                        return true;
                    }
                    var i=0;
                    PacketageInfo.Initialize.Status = response[++i];
                    PacketageInfo.Initialize.Command = response[++i];
                    PacketageInfo.Initialize.Version = response[++i];
                    PacketageInfo.Initialize.ResponseCode = response[++i];
                    PacketageInfo.Initialize.ResponseMessage = response[++i];
                    PacketageInfo.Initialize.SN = response[++i];
                    PacketageInfo.Initialize.ModelName = response[++i];
                    PacketageInfo.Initialize.OSVersion = response[++i];
                    PacketageInfo.Initialize.MacAddress = response[++i];
                    PacketageInfo.Initialize.NumberOfLinesPerScreen = response[++i];
                    PacketageInfo.Initialize.NumberOfCharsPerline = response[++i];
                    PacketageInfo.Initialize.AdditionalInformation = (response[++i]!=undefined)?response[i]:'';
                    DisplayHandler.DisplayResponseInfo('Initialize',PacketageInfo.Initialize);
                });
                break;
            case 'GetSignature':
                var version,offset,requestlength;
                version = ($("input[name='Version']").val() == '')? '1.28' : $("input[name='Version']").val();
                offset = ($("input[name='Offset']").val() == '')? '0' : $("input[name='Offset']").val();
                requestlength = ($("input[name='RequestLen']").val() == '')? '90000' : $("input[name='RequestLen']").val();
                pax.GetSignature({"command":'A08',"version":version,"offset":offset,"requestlength":requestlength},function(response){
                    if(typeof(response) == 'string'){
                        var $dialog = $("<div id='dialog' title='Info Dialog'>");
                        HintDialog.CreateDialog("Ajax error: "+response,$dialog);
                        DisplayHandler.RemoveLoading();
                        return true;
                    }
                    var i=0;
                    PacketageInfo.GetSignature.Status = response[++i];
                    PacketageInfo.GetSignature.Command = response[++i];
                    PacketageInfo.GetSignature.Version = response[++i];
                    PacketageInfo.GetSignature.ResponseCode = response[++i];
                    PacketageInfo.GetSignature.ResponseMessage = response[++i];
                    PacketageInfo.GetSignature.TotalLength = (response[++i]!=undefined)?response[i]:'';
                    PacketageInfo.GetSignature.ResponseLength = (response[++i]!=undefined)?response[i]:'';
                    PacketageInfo.GetSignature.Signature = (response[++i]!=undefined)?response[i]:'';
                    DisplayHandler.DisplayResponseInfo('GetSignature',PacketageInfo.GetSignature);
                });
                break;
            case 'DoSignature':
                var version,uploadFlag,edcType,hostReferenceNumber,timeout;
                version = ($("input[name='Version']").val() == '')? '1.28' : $("input[name='Version']").val();
                uploadFlag = $("select[name='UploadFlag']").val();
                timeout = ($("input[name='Timeout']").val() == '')? 0 : $("input[name='Timeout']").val();
                edcType = $("select[name='EdcType']").val();
                hostReferenceNumber = $("input[name='HRefNum']").val();
                if(timeout<15){
                    DisplayHandler.RemoveLoading();
                    var $timeOutDialog = $("<div id='dialog' title='Command Dialog'>");
                    HintDialog.CreateDialog("The value must be more than 15s.",$timeOutDialog);
                }else{
                    //pax.AjaxTimeOut("DoSignature",timeout*1000);
                    pax.DoSignature({"command":'A20',"version":version,"uploadFlag":uploadFlag,"hostReferenceNumber":hostReferenceNumber,"edcType":edcType,"timeout":(timeout*10).toString()},function(response){
                        if(typeof(response) == 'string'){
                            var $dialog = $("<div id='dialog' title='Info Dialog'>");
                            HintDialog.CreateDialog("Ajax error: "+response,$dialog);
                            DisplayHandler.RemoveLoading();
                            return true;
                        }
                        var i=0;
                        PacketageInfo.DoSignature.Status = response[++i];
                        PacketageInfo.DoSignature.Command = response[++i];
                        PacketageInfo.DoSignature.Version = response[++i];
                        PacketageInfo.DoSignature.ResponseCode = response[++i];
                        PacketageInfo.DoSignature.ResponseMessage = response[++i];
                        DisplayHandler.DisplayResponseInfo('DoSignature',PacketageInfo.DoSignature);
                    });
                }
                break;
            case 'DoCredit':
                var version,transactionType;//,accountInformation={},traceInformation,avsInformation,cashierInformation,commercialInformation,motoEcommerce,additionalInformation;
                // if(!ConfigureFlag){
                //  DisplayHandler.RemoveLoading();
                //  var $dialog = $("<div id='dialog' title='Command Dialog'>");
                //  HintDialog.CreateDialog("Configure Data isn't set yet.",$dialog);
                //  return false;
                // }
                version = ($("input[name='Version']").val() == '')? '1.28' : $("input[name='Version']").val();
                transactionType = $("select[name='TransType']").val();
                GetConfigureData();
                DisplayHandler.RemoveLoading();
                $("#ConfigureTabs span").remove();
                configureData = $("#ConfigureTabs input");
                for(var i=0; i<configureData.length; i++){
                    var self = configureData[i];
                    validate.Validate(self);
                }
                if($("#ConfigureTabs input").hasClass("error")){
                    $paramError = $("<div id='dialog' title='Parameter Error Dialog'>");
                    HintDialog.CreateDialog("Wrong parameter input! Pay attention to the format.",$paramError); 
                }else{
                    DisplayHandler.AddLoading();
                    pax.DoCredit({"command":'T00',"version":version,"transactionType":transactionType,"amountInformation":amountInformation,"accountInformation":accountInformation,"traceInformation":traceInformation,"avsInformation":avsInformation,"cashierInformation":cashierInformation,"commercialInformation":commercialInformation,"motoEcommerce":motoEcommerce,"additionalInformation":additionalInformation},function(response){
                        if(typeof(response) == 'string'){
                            var $dialog = $("<div id='dialog' title='Info Dialog'>");
                            HintDialog.CreateDialog("Ajax error: "+response,$dialog);
                            DisplayHandler.RemoveLoading();
                            return true;
                        }
                        var i=0,j=-1;
                        PacketageInfo.DoCredit.Status = response[++i];
                        PacketageInfo.DoCredit.Command = response[++i];
                        PacketageInfo.DoCredit.Version = response[++i];
                        PacketageInfo.DoCredit.ResponseCode = response[++i];
                        PacketageInfo.DoCredit.ResponseMessage = response[++i];

                        
                        PacketageInfo.DoCredit.HostInformation = (response[++i]!=undefined)?response[i]:'';
                        if(PacketageInfo.DoCredit.HostInformation == ''){
                            PacketageInfo.DoCredit.HostInformation = {};
                            PacketageInfo.DoCredit.HostInformation.HostResponseCode = '';
                            PacketageInfo.DoCredit.HostInformation.HostResponseMessage = '';
                            PacketageInfo.DoCredit.HostInformation.AuthCode = '';
                            PacketageInfo.DoCredit.HostInformation.HostReferenceNumber = '';
                            PacketageInfo.DoCredit.HostInformation.TraceNumber = '';
                            PacketageInfo.DoCredit.HostInformation.BatchNumber = '';
                        }else{
                            PacketageInfo.DoCredit.HostInformation.HostResponseCode = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.HostInformation.HostResponseMessage = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.HostInformation.AuthCode = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.HostInformation.HostReferenceNumber = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.HostInformation.TraceNumber = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.HostInformation.BatchNumber = (response[i][++j]!=undefined)?response[i][j]:'';
                        }

                        PacketageInfo.DoCredit.TransactionType = (response[++i]!=undefined)?response[i]:'';

                        PacketageInfo.DoCredit.AmountInformation = (response[++i]!=undefined)?response[i]:'';
                        if(PacketageInfo.DoCredit.AmountInformation == ''){
                            PacketageInfo.DoCredit.AmountInformation = {};
                            PacketageInfo.DoCredit.AmountInformation.ApproveAmount = '';
                            PacketageInfo.DoCredit.AmountInformation.AmountDue = '';
                            PacketageInfo.DoCredit.AmountInformation.TipAmount = '';
                            PacketageInfo.DoCredit.AmountInformation.CashBackAmount = '';
                            PacketageInfo.DoCredit.AmountInformation.MerchantFee_SurchargeFee = '';
                            PacketageInfo.DoCredit.AmountInformation.TaxAmount = '';
                            PacketageInfo.DoCredit.AmountInformation.Balance1 = '';
                            PacketageInfo.DoCredit.AmountInformation.Balance2 = '';

                        }else{
                            j=-1;
                            PacketageInfo.DoCredit.AmountInformation.ApproveAmount = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.AmountInformation.AmountDue = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.AmountInformation.TipAmount = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.AmountInformation.CashBackAmount = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.AmountInformation.MerchantFee_SurchargeFee = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.AmountInformation.TaxAmount = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.AmountInformation.Balance1 = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.AmountInformation.Balance2 = (response[i][++j]!=undefined)?response[i][j]:'';
                        }

                        PacketageInfo.DoCredit.AccountInformation = (response[++i]!=undefined)?response[i]:'';
                        if(PacketageInfo.DoCredit.AccountInformation == ''){
                            PacketageInfo.DoCredit.AccountInformation = {};
                            PacketageInfo.DoCredit.AccountInformation.Account = '';
                            PacketageInfo.DoCredit.AccountInformation.EntryMode = '';
                            PacketageInfo.DoCredit.AccountInformation.ExpireDate = '';
                            PacketageInfo.DoCredit.AccountInformation.EBTtype = '';
                            PacketageInfo.DoCredit.AccountInformation.VoucherNumber = '';
                            PacketageInfo.DoCredit.AccountInformation.NewAccountNo = '';
                            PacketageInfo.DoCredit.AccountInformation.CardType = '';
                            PacketageInfo.DoCredit.AccountInformation.CardHolder = '';
                            PacketageInfo.DoCredit.AccountInformation.CVDApprovalCode = '';
                            PacketageInfo.DoCredit.AccountInformation.CVDMessage = '';
                            PacketageInfo.DoCredit.AccountInformation.CardPresentIndicator = '';

                        }else{
                            j=-1;
                            PacketageInfo.DoCredit.AccountInformation.Account = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.AccountInformation.EntryMode = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.AccountInformation.ExpireDate = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.AccountInformation.EBTtype = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.AccountInformation.VoucherNumber = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.AccountInformation.NewAccountNo = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.AccountInformation.CardType = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.AccountInformation.CardHolder = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.AccountInformation.CVDApprovalCode = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.AccountInformation.CVDMessage = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.AccountInformation.CardPresentIndicator = (response[i][++j]!=undefined)?response[i][j]:'';
                        }

                        PacketageInfo.DoCredit.TraceInformation = (response[++i]!=undefined)?response[i]:'';
                        if(PacketageInfo.DoCredit.TraceInformation == ''){
                            PacketageInfo.DoCredit.TraceInformation = {};
                            PacketageInfo.DoCredit.TraceInformation.TransactionNumber = '';
                            PacketageInfo.DoCredit.TraceInformation.ReferenceNumber = '';
                            PacketageInfo.DoCredit.TraceInformation.TimeStamp = '';
                        }else{
                            j=-1;
                            PacketageInfo.DoCredit.TraceInformation.TransactionNumber = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.TraceInformation.ReferenceNumber = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.TraceInformation.TimeStamp = (response[i][++j]!=undefined)?response[i][j]:'';
                        }

                        PacketageInfo.DoCredit.AVSinformation = (response[++i]!=undefined)?response[i]:'';
                        if(PacketageInfo.DoCredit.AVSinformation == ''){
                            PacketageInfo.DoCredit.AVSinformation = {};
                            PacketageInfo.DoCredit.AVSinformation.AVSApprovalCode = '';
                            PacketageInfo.DoCredit.AVSinformation.AVSMessage = '';
                        }else{
                            j=-1;
                            PacketageInfo.DoCredit.AVSinformation.AVSApprovalCode = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.AVSinformation.AVSMessage = (response[i][++j]!=undefined)?response[i][j]:'';
                        }

                        PacketageInfo.DoCredit.CommercialInformation = (response[++i]!=undefined)?response[i]:'';
                        if(PacketageInfo.DoCredit.CommercialInformation == ''){
                            PacketageInfo.DoCredit.CommercialInformation = {};
                            PacketageInfo.DoCredit.CommercialInformation.PONumber = '';
                            PacketageInfo.DoCredit.CommercialInformation.CustomerCode = '';
                            PacketageInfo.DoCredit.CommercialInformation.TaxExempt = '';
                            PacketageInfo.DoCredit.CommercialInformation.TaxExemptID = '';
                            PacketageInfo.DoCredit.CommercialInformation.MerchantTaxID = '';
                            PacketageInfo.DoCredit.CommercialInformation.DestinationZipCode = '';
                            PacketageInfo.DoCredit.CommercialInformation.ProductDescription = '';
                        }else{
                            j=-1;
                            PacketageInfo.DoCredit.CommercialInformation.PONumber = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.CommercialInformation.CustomerCode = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.CommercialInformation.TaxExempt = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.CommercialInformation.TaxExemptID = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.CommercialInformation.MerchantTaxID = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.CommercialInformation.DestinationZipCode = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.CommercialInformation.ProductDescription = (response[i][++j]!=undefined)?response[i][j]:'';
                        }
                        console.log(PacketageInfo.DoCredit.CommercialInformation);

                        PacketageInfo.DoCredit.motoEcommerce = (response[++i]!=undefined)?response[i]:'';
                        if(PacketageInfo.DoCredit.motoEcommerce == ''){
                            PacketageInfo.DoCredit.motoEcommerce = {};
                            PacketageInfo.DoCredit.motoEcommerce.MOTO_ECommerceMode = '';
                            PacketageInfo.DoCredit.motoEcommerce.TransactionType = '';
                            PacketageInfo.DoCredit.motoEcommerce.SecureType = '';
                            PacketageInfo.DoCredit.motoEcommerce.OrderNumber = '';
                            PacketageInfo.DoCredit.motoEcommerce.Installments = '';
                            PacketageInfo.DoCredit.motoEcommerce.CurrentInstallment = '';
                        }else{
                            j=-1;
                            PacketageInfo.DoCredit.motoEcommerce.MOTO_ECommerceMode = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.motoEcommerce.TransactionType = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.motoEcommerce.SecureType = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.motoEcommerce.OrderNumber = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.motoEcommerce.Installments = (response[i][++j]!=undefined)?response[i][j]:'';
                            PacketageInfo.DoCredit.motoEcommerce.CurrentInstallment = (response[i][++j]!=undefined)?response[i][j]:'';
                        }
                        
                        PacketageInfo.DoCredit.AdditionalInformation = (response[++i]!=undefined)?response[i]:'';
                        if(PacketageInfo.DoCredit.AdditionalInformation == '')
                            PacketageInfo.DoCredit.AdditionalInformation = {};
                        var additionalInfoArr = PacketageInfo.DoCredit.AdditionalInformation,keyValue=[];
                        for(i=0; i<additionalInfoArr.length; i++){
                            keyValue = additionalInfoArr[i].split("=");
                            PacketageInfo.DoCredit.AdditionalInformation[keyValue[0]] = keyValue[1];
                            keyValue = [];
                        }
                        console.log(PacketageInfo.DoCredit);
                        DisplayHandler.DisplayResponseInfo('DoCredit',PacketageInfo.DoCredit);
                    });
                }
                
                //ConfigureFlag = false;
                break;
            case 'Retrieve':
                var terminalID = '';
                var token = '';
                var serialNo = $("input[name='SerialNo']").val();
                console.log(serialNo);
                //$("#iframe").attr("src","http://www.poslink.com/ws/process2.asmx/GetDeviceLocalIP?TerminalId="+terminalID+"&Token="+token+"&SerialNo="+serialNo);             
                var xhr = null;
                if(window.XMLHttpRequest) {
                    xhr = new XMLHttpRequest();
                } else {
                    try{
                        xhr = new ActiveXObject('Microsoft.XMLHttp');
                    }catch(e){
                        xhr = new ActiveXObject('msxml2.xmlhttp');
                    }
                }
                //get请求
             
                xhr.open("GET", "http://poslink.com/process2.asmx/GetDeviceLocalIP?TerminalId="+terminalID+"&Token="+token+"&SerialNo="+serialNo, true);
                xhr.onreadystatechange=function(){
                    if(xhr.readyState==4) {
                        //alert(xhr.status);
                        if(xhr.status==200) {
                            var xml = xhr.responseXML;
                            console.log("Raw response: ");
                            console.log(xml);
                            
                            var ip,port,$dialog;
                            ip = $(xml).find("Result").children("IPaddress").text();
                            port = $(xml).find("Result").children("Port").text();
                            if(ip=='' || port==''){
                                $dialog = $("<div id='dialog' title='Service setting Dialog'>");
                                HintDialog.CreateDialog("Fail to get service setting.Default setting will be used.",$dialog); 
                                ip = "127.0.0.1";
                                port = "10009";
                            }
                            $("input[name='ip']").val(ip);
                            $("input[name='port']").val(port);
                            pax.Settings(ip,port);  
                        }else{
                            if(fail) {
                                fail(xhr.status);
                                console.log("Ajax error info: "+xhr.status); 
                                var $dialog = $("<div id='dialog' title='Service setting Dialog'>");
                                HintDialog.CreateDialog("Ajax error info: "+xhr.status,$dialog); 
                            }
                        }
                    } 
                };
                xhr.send(null);
                // $.ajax({
                //     // url: "http://www.poslink.com/ws/process2.asmx/GetDeviceLocalIP?TerminalId="+terminalID+"&Token="+token+"&SerialNo="+serialNo,   
                //     url: "http://poslink.com/process2.asmx/GetDeviceLocalIP?TerminalId="+terminalID+"&Token="+token+"&SerialNo="+serialNo,   
                //     error: function (xmlHttpRequest, error) {  
                //         console.log("Ajax error info: "+error); 
                //         var $dialog = $("<div id='dialog' title='Service setting Dialog'>");
                //         HintDialog.CreateDialog("Ajax error info: "+error,$dialog); 
                //     },
                //     success:function(xml,textStatus,xhr){
                //         console.log("Raw response: ");
                //         console.log(xml);
                //         if(xhr.status == 200){
                //             console.log("success");
                //             var ip,port,$dialog;
                //             ip = $(xml).find("Result").children("IPaddress").text();
                //             port = $(xml).find("Result").children("Port").text();
                //             if(ip=='' || port==''){
                //                 $dialog = $("<div id='dialog' title='Service setting Dialog'>");
                //                 HintDialog.CreateDialog("Fail to get service setting.Default setting will be used.",$dialog); 
                //                 ip = "127.0.0.1";
                //                 port = "10009";
                //             }
                //             $("input[name='ip']").val(ip);
                //             $("input[name='port']").val(port);
                //             pax.Settings(ip,port);
                            
                //         }   
                //     }
                // });
                DisplayHandler.RemoveLoading();
                break;
            case 'HostSetting':
                var ip = ($("input[name='ip']").val()=='')?'127.0.0.1':$("input[name='ip']").val();
                var port = ($("input[name='port']").val()=='')?10009:$("input[name='port']").val();
                if(isValidIP(ip)){
                    var $dialog = $("<div id='dialog' title='Setting Dialog'>");
                    HintDialog.CreateDialog("Service IP and port have been set successfully!",$dialog);
                    var ipArr = ip.split(".");
                    for(var i=0; i<ipArr.length; i++){
                        if(ipArr[i].length>1 && ipArr[i][0]=='0'){
                            ipArr[i] = ipArr[i].substring(1);
                        }
                    }
                    ip = ipArr.join(".");
                    console.log(ip);
                    pax.Settings(ip,port);
                }else{
                    var $dialog = $("<div id='dialog' title='Setting Dialog'>");
                    HintDialog.CreateDialog("The IP you type in is illegal.",$dialog);
                }
                DisplayHandler.RemoveLoading();
                break;
            case 'TimeoutSetting':
                // var doCreaditTimeout = ($("input[name='DoCreditTimeout']").val()=='')?400*100:$("input[name='DoCreditTimeout']").val(),
                //  initializeTimeout = ($("input[name='InitializeTimeout']").val()=='')?10*100:$("input[name='InitializeTimeout']").val(),
                //  getSignatureTimeout = ($("input[name='GetSignatureTimeout']").val()=='')?10*100:$("input[name='GetSignatureTimeout']").val(),
                //  doSignatureTimeout = ($("input[name='DoSignatureTimeout']").val()=='')?100*100:$("input[name='DoSignatureTimeout']").val();
                var timeout = ($("input[name='TimeOut']").val()=='')?120:$("input[name='TimeOut']").val();
                var $dialog = $("<div id='dialog' title='Setting Dialog'>");
                var text;
                text =  (timeout == 120)?"Default timeout has been set successfully!":"Timeout has been set successfully!";
                timeout = (timeout*1000).toString(); 
                pax.AjaxTimeOut("Initialize",timeout);
                pax.AjaxTimeOut("GetSignature",timeout);
                pax.AjaxTimeOut("DoSignature",timeout);
                pax.AjaxTimeOut("DoCredit",timeout);
                HintDialog.CreateDialog(text,$dialog);
                DisplayHandler.RemoveLoading();
                break;
            case 'Configure':
                var $dialog = $("<div id='dialog' title='Configure Dialog'>");
                ConfigureFlag = true;
                $("#ConfigureTabs").css('display','block').appendTo($dialog).tabs();
                $dialog.dialog({
                    autoOpen: true,
                    modal: true,
                    width:'90%',
                    maxHeight: 500,
                    show: {
                        effect: "blind",
                        duration: 800
                    },
                    hide: {
                        effect: "clip",
                        duration: 1000
                    },
                    buttons: [{
                        id: 'ConfiureBtn',
                        text: 'OK',
                        width: 120,
                        click: function() {
                            var transactionType,$paramError,configureData=[],self;
                            transactionType = $("select[name='TransType']").val();
                            //$("input[name='ReferenceNumber']").val()=='' ? '1234' : $("input[name='ReferenceNumber']").val();
                            $("#ConfigureTabs span").remove();
                            configureData = $("#ConfigureTabs input");
                            for(var i=0; i<configureData.length; i++){
                                var self = configureData[i];
                                validate.Validate(self);
                            }
                            if($("#ConfigureTabs input").hasClass("error")){
                                $paramError = $("<div id='dialog' title='Parameter Error Dialog'>");
                                HintDialog.CreateDialog("Wrong parameter input! Pay attention to the format.",$paramError); 
                            }else{
                                //GetConfigureData();
                                
                                $(this).dialog("close");
                            }
                        }
                    },{
                        text: 'Cancel',
                        width: 120,
                        click: function() {
                            $(this).dialog("close");
                            //$("#ConfigureTabs").css('display','none').appendTo($(body));
                            //$(self).dialog('destroy'); 
                        }
                    }],
                    open:function(){ 
                        $("#AmountInfo input").keyup(function(evt){
                            var currentValue = $(this).val();
                            var dotIndex = $(this).val().indexOf('.');
                            var i=0;
                            while(i < dotIndex){
                                if(currentValue[i]=='0')
                                    currentValue[i] == '';
                                i++;
                            }
                            currentValue = currentValue.replace('.','');
                            //console.log(currentValue);
                            evt = (evt) ? evt : window.event;
                            if((evt.keyCode>=48 && evt.keyCode<=57) || (evt.keyCode>=96 && evt.keyCode<=105)){
                                $(this).val((parseFloat(currentValue)/100).toFixed(2));
                            }
                            else if(evt.keyCode != 8){
                                return false;
                            }
                        });
                    },
                    close:function(){
                        var self = this;
                        $("#ConfigureTabs").css('display','none').appendTo($("body"));
                        setTimeout(function(){
                            $(self).dialog('destroy');
                        },100);
                        clearTimeout(timer);
                    }
                });
                DisplayHandler.RemoveLoading();
                break;
        }
    });
     
    function GetConfigureData(){
        amountInformation = {};
        amountInformation.TransactionAmount = $("input[name='TransactionAmount']").val()=='' ? '' : parseInt($("input[name='TransactionAmount']").val()*100);
        amountInformation.TipAmount = $("input[name='TipAmount']").val()=='' ? '' : parseInt($("input[name='TipAmount']").val()*100);
        amountInformation.CashBackAmount = $("input[name='CashBackAmount']").val()=='' ? '' : parseInt($("input[name='CashBackAmount']").val()*100);
        amountInformation.MerchantFee = $("input[name='MerchantFee']").val()=='' ? '' : parseInt($("input[name='MerchantFee']").val()*100);
        amountInformation.TaxAmount = $("input[name='TaxAmount']").val()=='' ? '' : parseInt($("input[name='TaxAmount']").val()*100);
        amountInformation.FuelAmount = $("input[name='FuelAmount']").val()=='' ? '' : parseInt($("input[name='FuelAmount']").val()*100); 
        console.log(amountInformation);

        accountInformation = {};
        accountInformation.Account = $("input[name='Account']").val();
        accountInformation.EXPD = $("input[name='EXPD']").val();
        accountInformation.CVVCode = $("input[name='CVVCode']").val();
        accountInformation.EBTtype = $("select[name='EBTtype']").val();
        accountInformation.VoucherNumber = $("input[name='VoucherNumber']").val();
        accountInformation.Force = $("select[name='Force']").val();
        accountInformation.FirstName = $("input[name='FirstName']").val();
        accountInformation.LastName = $("input[name='LastName']").val();
        accountInformation.CountryCode = $("input[name='CountryCode']").val();
        accountInformation.State_ProvinceCode = $("input[name='State_ProvinceCode']").val();
        accountInformation.CityName = $("input[name='CityName']").val();
        accountInformation.EmailAddress = $("input[name='EmailAddress']").val();

        traceInformation = {};
        traceInformation.ReferenceNumber = $("input[name='ReferenceNumber']").val()=='' ? '1' : $("input[name='ReferenceNumber']").val();
        traceInformation.InvoiceNumber = $("input[name='InvoiceNumber']").val();
        traceInformation.AuthCode = $("input[name='AuthCode']").val();
        traceInformation.TransactionNumber = $("input[name='TransactionNumber']").val();
        traceInformation.TimeStamp = $("input[name='TimeStamp']").val();
        traceInformation.ECRTransID = $("input[name='ECRTransID']").val();

        avsInformation = {};
        avsInformation.ZipCode = $("input[name='ZipCode']").val();
        avsInformation.Address = $("input[name='Address']").val();
        avsInformation.Address2 = $("input[name='Address2']").val();

        cashierInformation = {};
        cashierInformation.ClerkID = $("input[name='ClerkID']").val();
        cashierInformation.ShiftID = $("input[name='ShiftID']").val();

        commercialInformation = {};
        commercialInformation.PONumber = $("input[name='PONumber']").val();
        commercialInformation.CustomerCode = $("input[name='CustomerCode']").val();
        commercialInformation.TaxExempt = $("select[name='TaxExempt']").val();
        commercialInformation.TaxExemptID = $("input[name='TaxExemptID']").val();
        commercialInformation.MerchantTaxID = $("input[name='MerchantTaxID']").val();
        commercialInformation.DestinationZipCode = $("input[name='DestinationZipCode']").val();
        commercialInformation.ProductDescription = $("input[name='ProductDescription']").val();

        motoEcommerce = {};
        motoEcommerce.MOTO_E_CommerceMode = $("select[name='MOTO_E_CommerceMode']").val();
        motoEcommerce.TransactionType = $("select[name='TransactionType']").val();
        motoEcommerce.SecureType = $("select[name='SecureType']").val();
        motoEcommerce.OrderNumber = $("input[name='OrderNumber']").val();
        motoEcommerce.Installments = $("input[name='Installments']").val();
        motoEcommerce.CurrentInstallment = $("input[name='CurrentInstallment']").val();

        additionalInformation = {};
        additionalInformation.TABLE = $("input[name='TableNum']").val();
        additionalInformation.GUEST = $("input[name='GuestNum']").val();
        additionalInformation.SIGN = $("select[name='SignatureCapture']").val();
        additionalInformation.TICKET = $("input[name='TicketNum']").val();
        additionalInformation.HREF = $("input[name='HRefNum']").val();
        additionalInformation.TIPREQ = $("select[name='TipRequest']").val();
        additionalInformation.SIGNUPLOAD = $("select[name='SignUploadFlag']").val();
        additionalInformation.REPORTSTATUS = $("select[name='ReportStatus']").val();
        additionalInformation.TOKENREQUEST = $("select[name='TokenRequest']").val();
        additionalInformation.TOKEN = $("input[name='Token']").val();           
        additionalInformation.CARDTYPE = $("select[name='CardType']").val();
        additionalInformation.CARDTYPEBITMAP = $("input[name='CardTypeBitmap']").val();
        var len = additionalInformation.CARDTYPEBITMAP.length;
        while(len < 32){
            additionalInformation.CARDTYPEBITMAP += '0';
            len++;
        }
        if(additionalInformation.CARDTYPEBITMAP.indexOf('1') == -1)
            additionalInformation.CARDTYPEBITMAP = '';
        console.log("CardTypeBitmap: "+additionalInformation.CARDTYPEBITMAP);

        additionalInformation.PASSTHRUDATA = $("input[name='PassThruDat']").val();
        additionalInformation.RETURNREASON = $("select[name='ReturnReason']").val();
        additionalInformation.ORIGTRANSDATE = $("input[name='Origtransdate']").val();
        additionalInformation.ORIGPAN = $("input[name='Origpan']").val();
        additionalInformation.ORIGEXPIRYDATE = $("input[name='OrigExpiryDate']").val();
        additionalInformation.ORIGTRANSTIME = $("input[name='OrigTransTime']").val();
        additionalInformation.DISPROGPROMPTS = $("input[name='DisProgPromPts']").val();
        additionalInformation.GATEWAYID = $("input[name='GateWayID']").val();
        additionalInformation.GETSIGN = $("select[name='GetSign']").val();
        additionalInformation.ENTRYMODEBITMAP = $("input[name='EntryModeBitmap']").val();
        additionalInformation.RECEIPTPRINT = $("select[name='ReceiptPrint']").val();
        additionalInformation.CPMODE = $("select[name='CPMode']").val();
        additionalInformation.ODOMETER = $("input[name='Odometer']").val();
        additionalInformation.VEHICLENO = $("input[name='VehicleNo']").val();
        additionalInformation.JOBNO = $("input[name='JobNo']").val();
        additionalInformation.DRIVERID = $("input[name='DriverID']").val();
        additionalInformation.EMPLOYEENO = $("input[name='EmployeeNo']").val();
        additionalInformation.LICENSENO = $("input[name='LicenseNo']").val();
        additionalInformation.JOBID = $("input[name='JobID']").val();
        additionalInformation.DEPARTMENTNO = $("input[name='DepartmentNo']").val();
        additionalInformation.CUSTOMERDATA = $("input[name='CustomerData']").val();
        additionalInformation.USERID = $("input[name='UserID']").val();
        additionalInformation.VEHICLEID = $("input[name='VehicleID']").val();
        console.log(amountInformation);

        pax.SetCustomData($("input[name='POSEchoData']").val());
    }


    function isValidIP(ip) {
        var reg =  /^(\d{1,2}|0\d\d|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|0\d\d|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|0\d\d|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|0\d\d|1\d\d|2[0-4]\d|25[0-5])$/     
        return reg.test(ip);
    }



});
