define(['jquery','jquery-ui'],function($){
	var DisplayHandler = {
		DisplayResponseInfo: function(commandType,object){
			console.log("Complete package info: ");
			console.log(object);
			$('input').attr({"disabled":false});
			this.RemoveLoading();
			//EmptyResponse();
			if(object == '')
				return false;
			var $tableInfo = $("<table class='ui-table'></table>'");
			var $info,$hr,$trInfo,$tdInfo;
			if(commandType == "DoCredit"){
				for(var i in object){
					if(i=="HostInformation" || i=="AmountInformation" || i=="AccountInformation" || i=="TraceInformation" || i=="AVSinformation" || i=="CommercialInformation" || i=="motoEcommerce" || i=="AdditionalInformation"){
						$tdInfo = '';
						for(var j in object[i]){
							if(!isNaN(j))
								continue;
							object[i][j] = object[i][j]=='undefined'? "" : object[i][j];
							$tdInfo += "<div class='subInfo'><label>" + j + "</label><input type='text' value='" + object[i][j] +"'></div>";

						}
						$trInfo = "<tr><td>"+i+"</td><td><div class='subDiv'>"+$tdInfo+"</div></td></tr>";
						$info += $trInfo;
					}else{
						object[i] = object[i]=='undefined'? "" : object[i];
						$info += "<tr><td>" + i + "</td><td><input type='text' value='" + object[i] +"'></td></tr>";
					}
				}
			}else{
				for(var i in object){
					object[i] = object[i]=='undefined'? "" : object[i];
					$info += "<tr><td>" + i + "</td><td><input type='text' value='" + object[i] +"'></td></tr>";
				}
			}
			$hr = $('<hr/>').css({"color":"#c3c3c3","margin-top":"5px"});
			$hr.appendTo($('div[data-command="'+ commandType +'"]') );
			$tableInfo.append($info);
			$tableInfo.appendTo($('div[data-command="'+ commandType +'"]') );
		},
		AddLoading: function(){
			$(".mask").show();
		},
		RemoveLoading: function(){
			$('.mask').hide();
		},
		EmptyResponse: function(){
			$('.command').find('hr').remove();
			$('.command').find('table').remove();
		}
	};
	return DisplayHandler;
});