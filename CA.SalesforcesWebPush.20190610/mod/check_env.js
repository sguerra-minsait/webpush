module.exports = function(){
	var missing = false;
	[
		'de_password',
		'server_domain',
		'client_id',
		'client_secret',
		'SH256_KEY',
		'username',
		'password',
		'gcmkey',
		'email',
		'vapid_public',
		'vapid_private'
	].forEach(d => {
		if(!process.env[d]){
			missing = true;
			console.error(d + ' environment variable is missing');
		}
	});
	if(missing)process.exit(1);
}