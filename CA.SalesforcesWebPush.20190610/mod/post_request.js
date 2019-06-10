var request = require('request');
module.exports = function(c){
	c.method = c.method || 'POST';
	return new Promise((resolve, reject) => {
		request({
			method: c.method,
			uri: c.url,
			proxy: process.env.proxy,
			body: typeof c.body == 'string' ? c.body : JSON.stringify(c.body),
			headers: c.headers
		}, function(err, response, body){
			if(err)return reject(err);
			resolve(body, response);
		});
	});
}