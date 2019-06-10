const express = require('express');


var app = express();
app.use(function (req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	res.setHeader("Access-Control-Allow-Headers", "x-requested-with, Content-Type, origin, authorization, accept, client-security-token");
	next();
});


app.use('/', express.static(__dirname + './../form'));
app.use((req, res, next) => {
	req.rawBody = '';
	req.on("data", chunk => {
		req.rawBody += chunk;
	});
	req.on('end', _ => {
		var content_type = req.get("Content-Type");
		try{
			if(content_type && content_type.indexOf('json') != -1){
				req.body = JSON.parse(req.rawBody);
			}else{
				req.body = req.rawBody;
			}
			next();
		}catch(err){
			res.end('{"error": "JSON_invalid"}');
		}
	});
});

module.exports = app;