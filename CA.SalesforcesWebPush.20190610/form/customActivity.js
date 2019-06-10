(function(){
	'use strict';
	var connection = new Postmonger.Session();
	var payload = {};
	var heroku_url = "https://webpushnodejstest.herokuapp.com";
	var eventDefinitionKey;

	$(window).ready(onRender);

	connection.on('initActivity', initialize);

	connection.on('clickedNext', onClickedNext);
	connection.on('clickedBack', onClickedBack);
	connection.on('gotoStep', onGotoStep);

	function onRender() {
		connection.trigger('ready');
		connection.trigger('requestTokens');
		connection.trigger('requestEndpoints');
		connection.trigger('requestTriggerEventDefinition');
	}

	connection.on('requestedTriggerEventDefinition', function(event){
		console.log(event);
		eventDefinitionKey = event.eventDefinitionKey;
	});
	function generate_id(payload, callback){
		var id = ( Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(3, 10)).slice(0,20);
		$.ajax({
			type: 'POST',
			url: heroku_url + "/message_exists",
			data: JSON.stringify({"id": id}),
			dataType: 'json',
			contentType: 'application/json',
			success: function(r){
				if(r.exists)return generate_id(payload);
				payload['metaData'].data.message_id = id;
				payload.configurationArguments.save.url = heroku_url + "/save?" + Object.entries(payload['metaData'].data).map(e => e.join('=')).join('&');
				callback();
			}
		}).fail((err) => {
			console.error(err);
		});
	}


	function gui_set_click_action(action){
		var tab, text;
		switch(action){
			case 'open_url':
				tab = 1;
				text = 'Abrir enlace';
			break;
			case '':
				tab = -1;
				text = 'No hacer nada';
			break;
		}

		var menu_text = $('#menu_text_onclick');

		menu_text.text(text);
		menu_text.attr('data-click_action', action);
		$('.slds-tabs_scoped__content').hide();
		if(tab != -1)$('#onclick_tab_index' + tab).show();
	}


	function initialize (data) {
		console.log('initialize', data);

		if (data) payload = data;


		var title, message, icon, onclick = false;
		var hasInArguments = Boolean(
			payload['arguments'] &&
			payload['arguments'].execute &&
			payload['arguments'].execute.inArguments &&
			payload['arguments'].execute.inArguments.length > 0
		);

		var inArguments = hasInArguments ? payload['arguments'].execute.inArguments : {};
		var d = payload['metaData'].data;


		$('#title').val(d.title);
		$('#message').val(d.message);
		if(d.onclick){
			try{
				var onclick = JSON.parse(d.onclick);
				gui_set_click_action(onclick.action);
				if(onclick.action == 'open_url'){
					$('#url').val(onclick.url);
				}
			}catch(err){}
		}

		if(d.icon){
			var preview = $('#image_preview');
			$('#loading_image').show();
			$('#error_image').hide();
			preview.attr('src', d.icon);
			preview.css('display', 'block');
			$('#icon_link').val(d.icon);
			$('#image_size').css('display','none');
		}
		$('#message').trigger('keyup');
	}

	function onClickedNext () {
		save();
	}

	function onClickedBack () {
		console.log('clickedBack');
		connection.trigger('prevStep');
	}

	function onGotoStep (step) {
		connection.trigger('ready');
	}


	function save() {
		if($('#error_div').html().length)return connection.trigger('ready');
		var title = $('#title').val();
		var message = $('#message').val();
		var icon = $('#icon_link').val();
		var onclick = {
			action: $('#menu_text_onclick').attr('data-click_action')
		}

		if(onclick.action == 'open_url'){
			onclick.url = $('#url').val();
		}

		payload.name = name;

		payload['metaData'].data = {
			"onclick": JSON.stringify(onclick),
			"title": title,
			"message": message,
			"icon": icon
		};

		generate_id(payload, function(){
			payload['arguments'].execute.inArguments = [{
				"message_id": payload['metaData'].data.message_id,
				"endpoint": "{{Contact.Attribute.webpush_subscriptions.endpoint}}",
				"p256dh": "{{Contact.Attribute.webpush_subscriptions.p256dh}}",
				"auth": "{{Contact.Attribute.webpush_subscriptions.auth}}",
				"expirationTime": "{{Contact.Attribute.webpush_subscriptions.expirationTime}}",
				"ip": "{{Contact.Attribute.webpush_subscriptions.ip}}",
				"fecha_registro": "{{Contact.Attribute.webpush_subscriptions.fecha_registro}}"			
			}];
			payload['metaData'].isConfigured = true;
			connection.trigger('updateActivity', payload);
		});
	}
})();