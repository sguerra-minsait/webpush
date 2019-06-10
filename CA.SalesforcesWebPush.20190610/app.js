console.log("Loading...");

require('./mod/check_env')();

const security = require('./mod/security');
const soap = require('./mod/soap');
var sfmc = require('./mod/sfmc');
const webpush = require('./mod/webpush');
var parse_data_ext = require('./mod/parse_data_ext');


var port = process.env.PORT || 3000;
//proxy = 'http://proxy.indra.es:8080';



var app = require('./mod/server');

app.post('/new', function(req, res){
	try{
		var subscription = req.body;
		console.log(subscription);
		var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
		sfmc.save_client({
			ip: ip,
			endpoint: subscription.endpoint,
			expirationTime: subscription.expirationTime,
			p256dh: subscription.keys.p256dh,
			auth: subscription.keys.auth
		}).then(r => {
			res.status(200).end(r ? "success" : "fail");
		}).catch(err => {
			console.error(err);
			res.status(500).end("fail");
		});
	}catch(err){
		console.error(err);
		res.status(400).end();
	}
});

app.post('/message_exists', (req, res) => {
	console.log(req.body);
	var id = req.body.id;
	res.status(200);
	if(!id)return res.end('{"error": "id_not_supplied"}');
	sfmc.check_message_exists(id).then(exists => {
		res.end('{"exists": ' + exists + '}');
	}).catch(err => {
		console.log(err);
		res.end('{"error": "unknown"');
	});
});

app.post('/delete', (req, res) => {
	var subscription = req.body;
	console.log(subscription);
	sfmc.remove_client(subscription)
	.then(r => {
		console.log('done');
		res.status(200).end();
	}).catch(err => {
		console.log(err);
		res.status(500).end();
	});
});


app.post('/save', security.check_token, (req, res) => {
	console.log(req.body, req.query);
	sfmc.save_message({
		id: req.query.message_id,
		title: req.query.title,
		message: req.query.message,
		icon: req.query.icon,
		onclick: req.query.onclick
	}).then(r => {
		console.log('publish result: ', r);
		res.status(200).end();
	}).catch(err => {
		console.log('publish error: ',err);
		res.status(500).end();
	});
});
app.post(/(publish|validate)/, security.check_token, (req, res) => {
	res.status(200).end();
});

app.post('/execute', security.check_token, (req,res) => {
	console.log('EXECTURE BODY: ', req.rawBody, req.body);
	var arg = req.body.inArguments[0];
	var message, client, sent_date, enc_data;
	sfmc.get_message(arg.message_id).catch(err => {
		err.chained = true;
		return Promise.reject(err);
	}).then(_message => {
		message = _message;
		client = security.decrypt_object({
			p256dh: arg.p256dh,
			endpoint: arg.endpoint,
			auth: arg.auth
		});
		
		sent_date = (new Date).toLocaleString();
		message.sent_date = sent_date;
		return parse_data_ext(message.message, arg)
	}).then(parsed_message => {
		message.message = parsed_message;
		console.log('PARSED MESSAGE');
		return webpush.send_message(client, message).then(r => {
			console.log('send_message', r);
			enc_data = security.encrypt_object({
				id: message.id,
				sent: sent_date
			});
			return sfmc.rest_request({
				url: '/hub/v1/dataevents/key:webpush_tracking/rowset',
				body: [{
					keys: {
						message_id: enc_data.id,
						endpoint: arg.endpoint,
						sent: enc_data.sent
					},
					values: {
						message_id: enc_data.id,
						endpoint: arg.endpoint,
						sent: enc_data.sent
					}
				}]
			}).catch(err => {
				err.chained = true;
				return Promise.reject(err);
			});
		}).catch(err => {
			// log not need
			if(err.chained)return Promise.reject(err);
			if(err.statusCode == 404 || err.statusCode == 410){ // subscription expired or cancelled
				return sfmc.remove_client(client).then(r => {
					console.log("REMOVE CLIENT soap result request: ", r);
				}).catch(err => {
					console.log("REMOVE CLIENT soap error request: ", err);
				});
			}
		});
	}).catch(err => {
		if(err.chained)return Promise.reject(err);
		console.log('PARSE ERROR' + JSON.stringify(err));
		return Promise.reject(err.error && err.data ? err : {error: err.message});
	}).catch(err => {
		sfmc.log(err);
		console.log('LOGGING ERROR ', err);
		res.status(400).end();
	}).then(r => {
		res.status(200).end();
	});
});



app.post('/message_shown', (req, res) => {
	var b = req.body;
	console.log('message_shown:', b);
	if(!b.id || !b.endpoint || !b.sent)return res.end('{"error": "missing_arguments"}');
	b.shown = (new Date).toLocaleString();
	var data = security.encrypt_object(b);

	sfmc.rest_request({
		url: '/hub/v1/dataevents/key:webpush_tracking/rowset',
		body: [{
			keys: {
				message_id: data.id,
				endpoint: data.endpoint,
				sent: data.sent
			},
			values: {
				shown: data.shown
			}
		}]
	}).then(r => {
		res.status(200).end();
	}).catch(err => {
		console.error(err);
		res.status(500).end();
	});
});

app.post('/message_clicked', (req, res) => {
	var b = req.body;
	console.log('message_clicked:', b);

	if(!b.id || !b.endpoint || !b.sent)return res.end('{"error": "missing_arguments"}');
	b.clicked = (new Date).toLocaleString();
	var data = security.encrypt_object(b);

	sfmc.rest_request({
		url: '/hub/v1/dataevents/key:webpush_tracking/rowset',
		body: [{
			keys: {
				message_id: data.id,
				endpoint: data.endpoint,
				sent: data.sent
			},
			values: {
				clicked: data.clicked
			}
		}]
	}).then(r => {
		res.status(200).end();
	}).catch(err => {
		console.error(err);
		res.status(500).end();
	});
});



var server = app.listen(port, () => {
	console.log('Server is listening on port ', port);
});
