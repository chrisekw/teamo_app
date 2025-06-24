
import { NextResponse } from 'next/server';

// This route generates the service worker file dynamically with the correct Firebase config.
export async function GET() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  const fileContent = `
    // Import the Firebase app and messaging scripts
    importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

    // Initialize the Firebase app in the service worker
    if (!firebase.apps.length) {
      firebase.initializeApp(${JSON.stringify(firebaseConfig)});
    }
    
    // Retrieve an instance of Firebase Messaging so that it can handle background messages.
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);
      
      // Customize notification here
      const notificationTitle = payload.notification.title || 'New Message';
      const notificationOptions = {
        body: payload.notification.body || 'You have a new message.',
        icon: payload.notification.icon || '/icon-192x192.png' // Default icon
      };
    
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  `;

  return new NextResponse(fileContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
    },
  });
}
