var custom_param_reg = /\%\%([a-zA-Z_]+)\(((?: *(["'`])((?:(?!\3)[a-zA-Z0-9_,. '"`])*)\3 *, *)*(?: *(["`'])((?:(?!\5)[a-zA-Z0-9_,. '"`])*)\5]* *))\)\%\%/g;


function make_args(d){
	var args = [];
	var arg;
	var reg = /(['"`])((?:(?!\1).)*)\1/g;
	while((arg = reg.exec(d)) != null)args.push(arg[2].trim());
	return args;
}

function message_preview(){
	var message = $('#message').val();
	var container = $('#message_preview');

	container.html('');
	custom_param_reg.lastIndex = 0;
	var lastIndex, index;


	function create_font(d){
		return $(`<font>${d}</font>`);
	}
	function create_div(full, prop, css_class_popup, css_class){
		full = full.substring(2, full.length - 2);
		var div =  $(`
			<div class="de_custom_prop ${css_class || ''}" onmouseout="hide_popup()">
				<div class="de_custom_prop_data">${prop}</div>
			</div>`);
		div.mouseover(function(){
			show_popup({
				data: full,
				class: css_class_popup
			});
		});
		return div;
	}


	do{
		lastIndex = custom_param_reg.lastIndex;
		var match = custom_param_reg.exec(message);
		var append = null;
		index = match ? match.index : message.length;

		container.append(create_font(message.substring(lastIndex, index)));
		
		if(match){
			var args = make_args(match[2]);
			switch(match[1]){
				case 'get':
					if(args.length == 1){
						append = create_div(match[0], args[0], 'de_custom_prop_popup');
					}else if(args.length == 4){
						append = create_div(match[0], args[1], 'de_custom_prop_popup');
					}else{
						append = create_div(match[0], 'Error: "get" function accepts only 2 or 4 arguments', 'de_custom_prop_comp_popup', 'de_custom_prop_comp');
					}
				break;
				default:
					append = create_div(match[0], `Error: Function "${match[1]}" is not recognized`, 'de_custom_prop_comp_popup', 'de_custom_prop_comp');
				break;
			}

			if(!append)append = create_div(match[0], "Error", 'de_custom_prop_comp_popup', 'de_custom_prop_comp');
			container.append(append);
		}
	}while(match != null);
}


function show_popup(c){
	var popup = $('#popup');
	if(!c.html){
		c.data = decodeURIComponent(c.data);
		popup.text(c.data);
	}else{
		popup.html(c.data);
	}

	if(c.class){
		popup.attr('class', c.class);
	}else{
		popup.attr('class', '');
	}

	popup.attr('data-hide_mouseup', c.hide_on_mouseout || '');
	popup.attr('data-hide_effect', c.effect || '');
	popup.css({display: 'block', left: 0, opacity: 0});
	movePopup();
	popup.attr('data-disable_movement', c.disable_movement || '');

	if(!c.effect){
		popup.css({opacity: 1});
	}else{
		popup.animate({opacity: 1});
	}
}
function hide_popup(){
	$('#popup').css('display', 'none');
}

(function(){
var popup = $('#popup');
popup.on('mouseleave', function(){
	if(popup.attr('data-hide_mouseup') == 'true'){
		if(0 && popup.attr('data-hide_effect') == 'true'){
			/*popup.animate({opacity: 0}, function(){
				popup.css({display: 'none'});
			}); */
		}else{
			popup.css({display: 'none'});
		}
	}
});


function cancel(e){
	e.stopPropagation();
	e.preventDefault();
}

function preview_image(image){
	image_loading.show();
	image_error.hide();
	preview.display = 'block';
	preview.setAttribute('src', image);
	preview.style.display = 'block';
	image_size_font.style.display = 'none';
}


var icon_link = document.getElementById('icon_link');
var input = document.getElementById('icon');
var preview = document.getElementById('image_preview');
var image_size_font = document.getElementById('image_size');
var error_div = document.getElementById('error_div');
var image_loading = $('#loading_image');
var image_error = $('#error_image');


$('#onclick_button').click(function(){
	$('#drop_down_onclick').toggle();
});
$('#message').keyup(function(){
	$('#message_rest_space').text(this.value.length + " caracteres");

});

$('.onclick_option').click(function(){
	var span = $(this).find('span');
	var menu_text = $('#menu_text_onclick');
	$('#drop_down_onclick').hide();
	menu_text.text(span.text());
	menu_text.attr('data-click_action', span.attr('data-click_action'));


	$('.slds-tabs_scoped__content').hide();
	var tab = $(this).attr('tabindex');
	if(tab != '-1')$('#onclick_tab_index' + tab).show();
});



$('#message_preview_button').click(function(){
	$('#message_preview').css('height', parseFloat($('#message').css('height'))).toggleClass('message_preview_show');
	$('#message').toggleClass('hide_message');
	message_preview();
	
	if(this.innerHTML == 'Vista previa'){
		this.innerHTML = 'Ocultar vista previa';
		$('#message_rest_space').text($('#message_preview').text().replace(/[\n\t]/gi,'').length + ' caracteres');
	}else{
		this.innerHTML = 'Vista previa';
		$('#message').trigger('keyup');
	}
});



preview.onload = function(){
	image_loading.hide();
}
preview.onerror = function(){
	image_loading.hide();
	image_error.show();
	preview.style.display = 'none';
}

icon_link.addEventListener('change', e => {
	var link = icon_link.value;
	error_div.innerHTML = '';
	if(link.match(/[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/) != null){
		if(link.split(':')[0] != 'https'){
		    return error_div.innerHTML = 'El enlace de la imagen debe de ser HTTPS';	
		}
		preview_image(link);
	}else{
		preview.style.display = 'none';
		image_size_font.style.display = 'block';
	}
});

input.addEventListener('change', e => {
	preview_image();
});

$('#message').keyup(function(){
	var b = $('#message_preview_button');
	custom_param_reg.lastIndex = 0;
	if(custom_param_reg.exec(this.value) != null){
		b.show();
	}else{
		b.hide();
	}
});


$('#message_help_button').mouseover(function(){
	show_popup({
		data: $('#custom_prop_doc').html(),
		html: true,
		hide_on_mouseout: true, 
		effect: true,
		disable_movement: true
	});
});


$(document).ready(function(){
	var xMousePos = 0;
	var yMousePos = 0;
	var lastScrolledLeft = 0;
	var lastScrolledTop = 0;

	$(document).mousemove(function(event) {
		xMousePos = event.pageX;
		yMousePos = event.pageY;
		movePopup();
	})  

	$(window).scroll(function(event) {
		if(lastScrolledLeft != $(document).scrollLeft()){
			xMousePos -= lastScrolledLeft;
			lastScrolledLeft = $(document).scrollLeft();
			xMousePos += lastScrolledLeft;
		}
		if(lastScrolledTop != $(document).scrollTop()){
			yMousePos -= lastScrolledTop;
			lastScrolledTop = $(document).scrollTop();
			yMousePos += lastScrolledTop;
		}
		movePopup();
	});
	window.movePopup = function(){
		var popup = $('#popup');
		if(popup.attr('data-disable_movement') == 'true' && popup.css('opacity') != 0)return;
		var frame = {
			width: $(document).width(),
			height: $(document).height()
		}

		
		var width = parseInt(popup.css('width'));
		var height = parseInt(popup.css('height'));
		var left = xMousePos - width/2;
		var top = yMousePos - height - 10;

		if(xMousePos - lastScrolledLeft - width/2 <= 0){
			left = 0;
		}else if(xMousePos - lastScrolledLeft + width/2 + 2 >= frame.width){
			left = frame.width - width - 2;
		}

		popup.css({
			left: left,
			top: yMousePos - lastScrolledTop - height > 0 ? top : lastScrolledTop
		});
	}
 
});

})();
