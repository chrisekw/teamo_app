
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let messaging: Messaging | null = null;

const missingConfigKeys = Object.entries(firebaseConfig)
  .filter(([key, value]) => !value && key !== 'measurementId')
  .map(([key]) => key);

if (missingConfigKeys.length > 0) {
  const message = `Missing Firebase config keys: ${missingConfigKeys.join(", ")}. Please ensure all NEXT_PUBLIC_FIREBASE_ environment variables are set.`;
  console.warn(message);
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
    // onMessage(messaging, (payload) => {
    //   console.log('Message received in foreground. ', payload);
    //   // Customize notification handling here
    //   // new Notification(payload.notification?.title || 'New Message', {
    //   //   body: payload.notification?.body,
    //   //   icon: payload.notification?.icon
    //   // });
    // });
  } catch (error) {
    console.error("Failed to initialize Firebase Messaging:", error);
    messaging = null;
  }
}

export const requestNotificationPermissionAndGetToken = async (): Promise<string | null> => {
  if (!messaging) {
    console.warn("Firebase Messaging is not initialized or not supported in this environment.");
    // alert("Push notifications are not supported on this browser or device.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
        console.error("VAPID key is not configured. Please set NEXT_PUBLIC_FIREBASE_VAPID_KEY in your environment variables.");
        // alert("Push notification setup error: VAPID key missing.");
        return null;
      }
      const currentToken = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
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
