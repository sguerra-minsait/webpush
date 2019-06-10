var wsdlParser = require("wsdlrdr");
var soap = require('./soap');

var reg = /\%\%([a-zA-Z_]+)\(((?: *(["'`])[a-zA-Z0-9_,. ]*\3 *, *)*(?: *(["`'])[a-zA-Z0-9_,. ]*\4 *))\)\%\%/g;

function sf_get(data, matches, arg){
	var body = soap.data.get_value
	.replace("{{USERNAME}}", process.env.username)
	.replace("{{PASSWORD}}", process.env.password)
	.replace("{{DATA_EXTENSION_NAME}}", arg[0])
	.replace("{{PROPERTY}}", arg[1])
	.replace("{{KEY}}", arg[2])
	.replace("{{FILTER_VALUE}}", arg[3]);

	return new Promise((resolve, reject) => {
		var error = false;
		soap.post_request(body).then(xml => {
			var response = wsdlParser.getXmlDataAsJson(xml).RetrieveResponseMsg;
			console.log('SOAP result', response);
			
			if(response.OverallStatus != 'OK')return reject({
				data: matches[0],
				error: response.OverallStatus
			});
			
			if(!response.Results)return reject({
				data: matches[0],
				error: 'Error: There are no rows with the property  ' + arg[2] + ' equals to ' + arg[3] + ' found in ' + arg[0]
			});


			var property  = response.Results.Properties.Property;
			console.log('PROPERTY: ', property);
			data = data.replace(matches[0], property.Value);
			resolve(data);
		}).catch(err => {
			console.log('CATCH ERROR', err);
			reject(err);
		});
	});
}

function sf_get_format(data, matches, arg, de){
	reg.lastIndex = 0;
	console.log('\n\nDE: ', de);
	console.log('ARG: ', arg);
	var new_data = `%%get("${arg[0]}", "${arg[1]}", "${arg[2]}", "${de[arg[3]]}")%%`;
	var new_match = reg.exec(new_data);
	var new_arg = make_args(new_match[2]);
	var data = data.replace(matches[0], new_data);
	console.log('SF_GET2', data);
	return sf_get(data, new_match, new_arg);
}
function sf_get1(data, matches, arg, de){
	console.log('SF_GET1: ', data, matches);
	return Promise.resolve(data.replace(matches[0], de[arg[0]]));
}

function make_args(d){
	var args = [];
	var arg;
	var reg = /(['"`])((?:(?!\1).)*)\1/g;
	while((arg = reg.exec(d)) != null)args.push(arg[2].trim());
	return args;
}



module.exports = function(data, de){
	reg.lastIndex = 0;
	var matches = [];
	var match;
	while((match = reg.exec(data)) != null)matches.push(match);
	var i = 0;
	console.log(matches);

	function eject_f(){
		var f_name = matches[i][1];
		var arg = make_args(matches[i][2]);
		var f;
		switch(f_name){
			case 'get':
				f = (arg.length == 4 ? sf_get_format : sf_get1); 
			break;
		}
		return f(data, matches[i], arg, de).then(new_data => {
			data = new_data;
			console.log('NEW DATA !!!1', new_data);
			i++;
			if(i == matches.length)return Promise.resolve(data);
			return eject_f();
		}).catch(err => {
			return Promise.reject(err);
		});
	}
	if(matches.length)return eject_f();
	return Promise.resolve(data);
}