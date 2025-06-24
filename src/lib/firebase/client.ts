
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";

// Fallback to dummy values if environment variables are not set.
// This allows the app to start, but Firebase services will not work
// until valid configuration is provided in a .env file.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dummy-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dummy-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dummy-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, // Can be undefined
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "dummy-app-id",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Can be undefined
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let messaging: Messaging | null = null;

// Check if the configuration is still using dummy values and warn the user.
if (firebaseConfig.apiKey === "dummy-api-key" || firebaseConfig.projectId === "dummy-project") {
  console.warn(`
*****************************************************************
** WARNING: Firebase configuration is missing or incomplete.   **
** The app is running with dummy credentials.                  **
** Firebase features like login, chat, and data storage will   **
** not work until you configure your .env file with valid      **
** Firebase project details.                                   **
*****************************************************************
  `);
}

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

auth = getAuth(app);
db = getFirestore(app);

if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && firebaseConfig.messagingSenderId) {
  try {
    messaging = getMessaging(app);
    // Optional: Handle foreground messages (app is open and active tab)
    onMessage(messaging, (payload) => {
      console.log('Message received in foreground. ', payload);
      // Let's show a toast for foreground messages
      const { toast } = (window as any).TeamoToast; // A bit of a hack to access toast
      if (toast && payload.notification) {
        toast({
            title: payload.notification.title,
            description: payload.notification.body,
        });
      }
    });
  } catch (error) {
    console.error("Failed to initialize Firebase Messaging:", error);
    messaging = null;
  }
}

export const requestNotificationPermissionAndGetToken = async (): Promise<string | null> => {
  if (!messaging) {
    console.warn("Firebase Messaging is not initialized or not supported in this environment.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
        console.error("VAPID key is not configured. Please set NEXT_PUBLIC_FIREBASE_VAPID_KEY in your environment variables.");
        return null;
      }
      const currentToken = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY, serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js') });
      if (currentToken) {
        console.log('FCM Token:', currentToken);
        // TODO: Send this token to your server and store it, associated with the user.
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
        return null;
      }
    } else {
      console.log('Unable to get permission to notify.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token. ', error);
    return null;
  }
};

export { app, auth, db, messaging };
