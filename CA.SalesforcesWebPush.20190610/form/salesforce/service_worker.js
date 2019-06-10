var onclick;
var last_message;
var url = 'https://webpushnodejstest.herokuapp.com';

self.addEventListener('push', event => {
 console.log('Received a push message', event);

 console.log(event.data);
 var data = event.data.json();
 last_message = data;



 var title = data.title;
 var tag = data.tag;
 var message = data.message;
 var icon = data.icon;
 onclick = false;
 try{
  onclick = JSON.parse(data.onclick);
 }catch(err){}

 return event.waitUntil(new Promise((resolve, reject) => {
  self.registration.showNotification(title, {
   body: message,
   tag: tag,
   icon: icon,
   image: icon
  }).then(() => {
   self.registration.pushManager.getSubscription().then(subscription => {
    fetch(url + '/message_shown',{
     method: 'POST',
     mode: 'cors',
     body: JSON.stringify({
      id: data.id,
      endpoint: subscription.endpoint,
      sent: data.sent_date
     }),
     headers: {
      'Content-Type': 'application/json'
     }
    })
    .then(res => {
     console.log(res);
     resolve();
    })
    .catch(err => {
     console.error(err);
     reject();
    });
   });
  });
 }));
});

self.addEventListener('install', event => {
  console.log('installed');
});

self.addEventListener('activate', event => {
  console.log('activated');
});


self.addEventListener('notificationclick', event => {
 event.notification.close(); 
 return event.waitUntil(new Promise((resolve, reject) => {
  self.registration.pushManager.getSubscription().then(subscription => {
   fetch(url + '/message_clicked',{
    method: 'POST',
    mode: 'cors',
    body: JSON.stringify({
     id: last_message.id,
     endpoint: subscription.endpoint,
     sent: last_message.sent_date
    }),
    headers: {
     'Content-Type': 'application/json'
    }
   })
   .then(res => {
    console.log(res);
    if(!onclick)return;
     event.preventDefault();
     var action = onclick.action;
     if(action == 'open_url' && clients.openWindow){
     return clients.openWindow(onclick.url);
    }
    resolve();
   })
   .catch(err => {
    console.error(err);
    reject();
   });
  });
 }));
 //console.log('On notification click: ', event.notification);
 //event.notification.close();
});

 
self.addEventListener('pushsubscriptionchange', function(){
	return event.waitUntil(new Promise((resolve, reject) => {
  		self.registration.pushManager.getSubscription().then(subscription => {
			fetch(url + '/new', {
				method: 'POST',
				mode: 'cors',
				body: JSON.stringify(subscription),
				headers: {
					'Content-Type': 'application/json'
				}
			}).then(res => {
				resolve();
			}).catch(error => {
				console.error(error);
				reject();
			});
		});
  	}));
});