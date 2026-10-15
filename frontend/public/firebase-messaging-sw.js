// Firebase Cloud Messaging Service Worker for MyUrbanDaily Free Tier
// Handles background push notifications when browser tab is minimized/closed
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCBsJCoorfQhh9bwNw0NrrxM4c9nat_ESw",
  authDomain: "myurbandaily.firebaseapp.com",
  projectId: "myurbandaily-458d0",
  storageBucket: "myurbandaily-458d0.firebasestorage.app",
  messagingSenderId: "538924212799",
  appId: "1:538924212799:web:a811b9c0120f995c4c4e8a"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'SOLVO Service Alert';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Your doorstep booking status has been updated.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/bookings');
      }
    })
  );
});
