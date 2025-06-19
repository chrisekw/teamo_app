
// This service worker can be very minimal for basic FCM message handling
// when the app is in the background or closed.
// Firebase SDK handles much of the complexity.

// Scripts are imported by the browser if you use Firebase SDK in the SW
// importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
// importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// IMPORTANT:
// The `firebase-messaging-sw.js` file must be in your `public` directory.
// Your `manifest.json` (also in `public`) should include your `gcm_sender_id`.
// Your Firebase project's Messaging Sender ID (gcm_sender_id) can be found in:
// Firebase Console > Project Settings > Cloud Messaging > Sender ID.

// Example of initializing Firebase if you need to use Firebase features in the SW
// (e.g., for onBackgroundMessage if not handled automatically or for advanced logic).
// For basic notification display when app is closed/backgrounded, this might not be strictly necessary
// if your manifest.json has the correct gcm_sender_id and you're sending "notification" payloads.

/*
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_IF_NEEDED_BY_SW_FEATURES", // Often not needed just for receiving
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // CRUCIAL
  appId: "YOUR_APP_ID_IF_NEEDED",
  measurementId: "YOUR_MEASUREMENT_ID_IF_NEEDED"
};

if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

if (firebase.messaging.isSupported()) {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message: ', payload);

    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new message.',
      icon: payload.notification?.icon || '/logo-192.png', // A default icon in your public folder
      data: payload.data // Pass along any data payload for when the notification is clicked
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
}
*/

// Basic push event listener. This will be triggered for pushes when the app is not in the foreground.
// If you use FCM and send "notification" payloads, FCM might handle displaying the notification automatically
// when the app is backgrounded/closed. This listener gives you more control or handles "data" messages.
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  let payloadData = {};
  try {
    payloadData = event.data ? event.data.json() : {};
  } catch (e) {
    console.warn('[Service Worker] Push event data is not JSON. Text:', event.data ? event.data.text() : 'empty');
    payloadData = { notification: { title: 'New Update', body: event.data ? event.data.text() : 'You have a new update.' } };
  }

  const title = payloadData.notification?.title || 'Teamo';
  const options = {
    body: payloadData.notification?.body || 'Check Teamo for new activity.',
    icon: payloadData.notification?.icon || '/logo-192.png',
    badge: payloadData.notification?.badge || '/badge-72x72.png', // Optional: for Android
    data: {
      url: payloadData.data?.url || payloadData.FCM_MSG?.data?.url || payloadData.notification?.click_action || '/',
      // Add any other data from the push payload you want to access on click
      ...(payloadData.data || payloadData.FCM_MSG?.data || {})
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();

  const urlToOpen = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // If a window for the app is already open and matches the target URL, focus it.
        if (client.url === self.registration.scope + urlToOpen.substring(1) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
