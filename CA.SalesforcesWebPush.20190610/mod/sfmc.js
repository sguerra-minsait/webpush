var wsdlParser = require("wsdlrdr");
var post_request = require('./post_request');
var security = require('./security');
var soap = require('./soap');
var salesforce_auth = {
	token: null,
	expires: null
};


module.exports = {
	get_salesforce_token(){
		return new Promise((resolve, reject) => {
			if(!salesforce_auth.token || ((new Date()).getTime() - salesforce_auth.expires) >= 0){
				post_request({
					url: 'https://' + process.env.server_domain + '.auth.marketingcloudapis.com/v2/token',
					body: {
						'grant_type': 'client_credentials',
						'client_id': process.env.client_id,
						'client_secret': process.env.client_secret
					},
					headers: {
						'Content-Type': 'application/json'
					}
				})
				.then(r => {
						try{
							r = JSON.parse(r);
							salesforce_auth.token = r.access_token;
							salesforce_auth.expires = (new Date().getTime()) + (r.expires_in * 1000);
							resolve(r.access_token);
						}catch(err){
							console.log(err);
							reject(err);
						}
					});
			}else{
				resolve(salesforce_auth.token);
			}
		});
	},
	rest_request(c){
		console.log('https://' + process.env.server_domain + '.rest.marketingcloudapis.com' + c.url, c.body);
		return new Promise((resolve, reject) => {
			module.exports.get_salesforce_token()
			.then(token => post_request({
				url: 'https://' + process.env.server_domain + '.rest.marketingcloudapis.com' + c.url,
				body: c.body,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Bearer ' + token
				}
			}))
			.then(r => {
				console.log('rest request result: ', r);
				try{
					r = JSON.parse(r);
					resolve(r instanceof Array == true);
				}catch(err){
					resolve(false);
				}
			}).catch(err => {
				console.error('rest request error: ', err);
			});
		});
	},
	remove_client(client){
		console.log('REMOVE_CLIENT ', client);
		client_enc = security.encrypt_object(client);
		var body = soap.data.delete_data_extension_row
		.replace("{{USERNAME}}", process.env.username)
		.replace("{{PASSWORD}}", process.env.password)
		.replace("{{DATA_EXTENSION}}","webpush_subscriptions")
		.replace("{{ENDPOINT}}", client_enc.endpoint)
		.replace("{{P256DH}}", client_enc.keys.p256dh)
		.replace("{{AUTH}}", client_enc.keys.auth);
		return soap.post_request(body);
	},
	check_message_exists(id){
		var body = soap.data.message_exists
		.replace("{{USERNAME}}", process.env.username)
		.replace("{{PASSWORD}}", process.env.password)
		.replace("{{ID}}", security.encrypt_object({id:id}).id);

		return new Promise((resolve, reject) => {
			console.log(body);
		 	soap.post_request(body).then(body => {
		 		console.log(body);
		 		if(body.indexOf('Results') !== -1)return resolve(true);
		 		resolve(false);
		 	}).catch(err => {
		 		reject(err);
		 	});
		})
	},
	get_message(id){
		var body = soap.data.get_message
		.replace("{{USERNAME}}", process.env.username)
		.replace("{{PASSWORD}}", process.env.password)
		.replace("{{ID}}", security.encrypt_object({id:id}).id);

		return new Promise((resolve, reject) => {
		 	soap.post_request(body).then(xml => {
		 		try{
		 			var data = wsdlParser.getXmlDataAsJson(xml);
		 			var properties  = data.RetrieveResponseMsg.Results.Properties.Property;
		 			var message = {};
		 			for(let i = 0;i<properties.length;i++){
		 				message[properties[i].Name] = properties[i].Value;
		 			}
		 			resolve(security.decrypt_object(message));
		 		}catch(err) {
		 			reject({error: `Message with id "${id}" was not found`});
		 		};
		 	}).catch(err => {
		 		console.error(err);
		 		reject(err);
		 	});
		})
	},
	save_client(client){
		return new Promise((resolve, reject) => {
			client.fecha_registro = (new Date).toLocaleString();
			client_enc = security.encrypt_object(client);
			module.exports.get_salesforce_token()
			.then(token => post_request({
				url: 'https://' + process.env.server_domain + '.rest.marketingcloudapis.com/hub/v1/dataevents/key:webpush_subscriptions/rowset',
				body: [{
					keys: {
						p256dh: client_enc.p256dh
					},
					values: {
						expirationTime: client_enc.expirationTime,
						endpoint: client_enc.endpoint,
						auth: client_enc.auth,
						ip: client_enc.ip,
						fecha_registro: client_enc.fecha_registro
					}
				}],
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Bearer ' + token
				}
			}))
			.then(r => {
				console.log('rest request result: ', r);
				try{
					r = JSON.parse(r);
					resolve(r instanceof Array == true);
				}catch(err){
					resolve(false);
				}
			}).catch(err => {
				console.error('rest request error: ', err);
			});
		});
	},
	save_message(message){
		console.log(message);
		message_enc = security.encrypt_object(message);
		return module.exports.rest_request({
			url: '/hub/v1/dataevents/key:webpush_messages/rowset',
			body: [{
				keys: {
					id: message_enc.id
				},
				values: {
					id: message_enc.id,
					title: message_enc.title,
					message: message_enc.message,
					icon: message_enc.icon,
					onclick: message_enc.onclick
				}
			}]
		});
	},
	log(c){
		return module.exports.rest_request({
			url: '/hub/v1/dataevents/key:' + process.env.log_DE + '/rowset',
			body: [{
				keys: {
					date: (new Date).toLocaleString()
				},
				values: {
					error: c.error,
					data: c.data
				}
			}]
		});
	}
};
