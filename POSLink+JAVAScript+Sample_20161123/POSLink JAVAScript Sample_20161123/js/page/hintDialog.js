define(['jquery','jquery-ui'],function($){
	var HintDialog = {
		CreateDialog: function(text,$dialog){
			var $p = $('<p>'+text+'</p>').css({
					'vertical-align':'center'
				}).appendTo($dialog);
			$dialog.dialog({
				autoOpen: true,
				modal: true,
				show: {
					effect: "blind",
					duration: 800
				},
				hide: {
					effect: "explode",
					duration: 1000
				},
				buttons: [{
					id: 'countBtn',
		            text: 'OK(5s)',
		            width: 120,
		            click: function() {
		            	$(this).dialog("close");
		            }
		        }],
		        open:function(){
		        	HintDialog.jump(5,$(this));
		        },
		        close:function(){
		        	var self = this;
		            setTimeout(function(){
		            	$(self).dialog('destroy');
		            },10);
		            clearTimeout(timer);
		        }
			});
		},
		jump: function(count,self) {
		    timer = setTimeout(function(){
		        count--;
		        //console.log(count);
		        if(count > 0) {
		            $("#countBtn").text("OK(" + count + "s)");
		            console.log(count);
		            HintDialog.jump(count,self);
		        } else {
		        	$(self).dialog('close');
		        }
		    }, 1000);
		},
		DialogPosition: function(){
			var screenWidth = $(window).width();
		    var screenHeight = $(window).height();
		    var scrolltop = $(document).scrollTop();
		    var scrollleft = $(document).scrollLeft();
		    var objLeft = (screenWidth - $("div[role='dialog']").width())/2 + scrollleft;
		    var objTop = (screenHeight - $("div[role='dialog']").height())/2 + scrolltop;
		    $("div[role='dialog']").css({"left":objLeft,"top":objTop + 'px'});
		}
	};
	return HintDialog;
});