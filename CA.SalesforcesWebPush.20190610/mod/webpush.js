var webpush = require('web-push');
//const vapidKeys = webpush.generateVAPIDKeys();

webpush.setGCMAPIKey(process.env.gcmkey);
webpush.setVapidDetails(
	'mailto:' + process.env.email,
	process.env.vapid_public,
	process.env.vapid_private
);

module.exports = {
	send_message(client, message, headers){
		message.icon = encodeURI(message.icon);
		console.log("SEND MESSAGE: ", message);
		const pushSubscription = {
			endpoint: client.endpoint,
			keys: {
				auth: client.auth,
				p256dh: client.p256dh
			},
		};
		return webpush.sendNotification(pushSubscription, JSON.stringify(message), {
			proxy: process.env.proxy,
			headers: headers
		});
	}
}
