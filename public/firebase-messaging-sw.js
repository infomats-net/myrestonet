
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// These values are public and safe to include in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyAvshsvP_ZMZ2wg1ejvoDWOSksjcvFUF_s",
  authDomain: "studio-9866611796-83af2.firebaseapp.com",
  projectId: "studio-9866611796-83af2",
  storageBucket: "studio-9866611796-83af2.appspot.com",
  messagingSenderId: "931238246461",
  appId: "1:931238246461:web:fe60c9ed66456564de5254"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/placeholder-icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
