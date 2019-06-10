var crypto = require('crypto');
var jwt = require('jsonwebtoken');

module.exports = {
	keys:['endpoint', 'auth', 'p256dh'],
	encrypt_object(obj, pw, algorithm = "aes-256-cbc"){
		pw = pw || process.env.de_password;
		var object = Object.assign({}, obj);
		var pw_hash = crypto.createHash('md5').update(pw, 'utf-8').digest('hex').toUpperCase();
		for(let pr in object){
			if(object[pr] instanceof Object){
				console.log(this);
				object[pr] = module.exports.encrypt_object(object[pr], pw, algorithm);
			}else if((typeof object[pr] == 'string' || typeof object[pr] == 'number') && module.exports.keys.indexOf(pr) != -1){
				console.log('encrypting ' + pr + ':' + object[pr]) ;
				//var iv = crypto.randomBytes(16);
				var iv = Buffer.alloc(16, 0);
				var cipher = crypto.createCipheriv(algorithm, pw_hash, iv);
				object[pr] = cipher.update(object[pr] + '', 'utf8', 'hex');
				object[pr] += cipher.final('hex');// + '.' + iv.toString('hex');
				console.log(object[pr]);
			}
		}
		return object;
	},
	decrypt_object(obj, pw, algorithm = 'aes-256-cbc'){
		pw = pw || process.env.de_password;
		var object = Object.assign({}, obj);
		var pw_hash = crypto.createHash('md5').update(pw, 'utf-8').digest('hex').toUpperCase();
		for(let pr in object){
			if(typeof object[pr] == 'object'){
				object[pr] = module.exports.decrypt_object(object[pr], pw, algorithm);
			}else if((typeof object[pr] == 'string' || typeof object[pr] == 'number') && module.exports.keys.indexOf(pr) != -1){
				//var d = object[pr].split('.');
				//var iv = Buffer.from(d[1], 'hex');
				var iv = Buffer.alloc(16, 0);			
				var cipher = crypto.createDecipheriv(algorithm, pw_hash, iv);
				//object[pr] = cipher.update(d[0], 'hex', 'utf8');
				object[pr] = cipher.update(object[pr], 'hex', 'utf8');
				object[pr] += cipher.final('utf8');
			}
		}
		return object;
	},
	check_token(req, res, next){
		jwt.verify(req.rawBody, process.env.SH256_KEY, (err, decoded) => {
			if(err){
				res.end('{"error": "incorrect_token"}');
				return console.log(err);
			}
			req.body = decoded;
			next();
		});
	}
}
