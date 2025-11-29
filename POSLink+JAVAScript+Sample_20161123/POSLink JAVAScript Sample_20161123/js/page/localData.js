define(['jquery'],function($){
	var LocalData = {
		obj:{},
		StoreData: function(){
			var data = $(".command>div,.setting>div");
			var commnad,elementArr,name,val,configData,subConfigCommand,subElementArr;
			
			for(var i=0; i<data.length; i++){
				command = $(data[i]).data("command");
				this.obj[command] = {};
				
				elementArr = $.merge($(data[i]).find("input"),$(data[i]).find("select"));
				for(var j=0; j<elementArr.length; j++){
					name = elementArr[j].name;
					val = elementArr[j].value;
					this.obj[command][name] = val;
				}
				if(command == "DoCredit"){
					configData = $("#ConfigureTabs div");

					for(var k=0; k<configData.length; k++){
						subConfigCommand = $(configData[k]).attr("id");
						this.obj[command][subConfigCommand] = {};

						subElementArr = $.merge($(configData[k]).find("input"),$(configData[k]).find("select"));
						for(var s=0; s<subElementArr.length; s++){
							name = subElementArr[s].name;
							val = subElementArr[s].value;
							this.obj[command][subConfigCommand][name] = val;
						}
					}
				}
			}
			//console.log(this.obj);
			var commandData = JSON.stringify(this.obj);
			localStorage.commandData = commandData;
		},

		GetData: function(){
			var data = localStorage.getItem("commandData"),data_command;
			data = JSON.parse(data);
			console.log("data");
			console.log(data);
			for(key in data){
				data_command = key;
				if(data_command == "DoCredit"){
					for(name in data[key]){
						if(typeof(data[key][name]) == "object"){
							for(subName in data[key][name]){
								//console.log(name[subName]);
								$("div[id='"+name+"']").find("input[name='"+subName+"']").val(data[key][name][subName]);
								$("div[id='"+name+"']").find("select[name='"+subName+"']").val(data[key][name][subName]);
							}
						}
						else{
							$("div[data-command='"+data_command+"']").find("input[name='"+name+"']").val(data[key][name]);
							$("div[data-command='"+data_command+"']").find("select[name='"+name+"']").val(data[key][name]);
						}
					}
				}
				else{
					for(name in data[key]){
						$("div[data-command='"+data_command+"']").find("input[name='"+name+"']").val(data[key][name]);
						$("div[data-command='"+data_command+"']").find("select[name='"+name+"']").val(data[key][name]);
					}
				}
			}

		 }
	};
	return LocalData;
});