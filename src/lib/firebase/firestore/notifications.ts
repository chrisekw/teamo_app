
import { db } from '@/lib/firebase/client';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  limit as firestoreLimit,
  where,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  writeBatch,
  getCountFromServer,
} from 'firebase/firestore';
import type { UserNotification, UserNotificationFirestoreData, UserNotificationType } from '@/types';

const userNotificationConverter: FirestoreDataConverter<UserNotification, UserNotificationFirestoreData> = {
  toFirestore: (notificationInput: Omit<UserNotification, 'id' | 'timestamp' | 'userId'>): DocumentData => {
    const data: any = { ...notificationInput };
    data.timestamp = serverTimestamp();
    if (!notificationInput.isRead) { // Ensure isRead is explicitly set if not provided
        data.isRead = false;
    }
    return data;
  },
  fromFirestore: (snapshot, options): UserNotification => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      userId: snapshot.ref.parent.parent!.id, // Assumes users/{userId}/notifications structure
      type: data.type as UserNotificationType,
      title: data.title,
      message: data.message,
      link: data.link,
      timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
      isRead: data.isRead || false,
      officeId: data.officeId,
      actorName: data.actorName,
      entityId: data.entityId,
      entityType: data.entityType,
    };
  }
};

const getUserNotificationsCollection = (userId: string) => {
  if (!userId) throw new Error("User ID is required for notification operations.");
  return collection(db, 'users', userId, 'notifications').withConverter(userNotificationConverter);
};

const getUserNotificationDoc = (userId: string, notificationId: string) => {
  if (!userId || !notificationId) throw new Error("User ID and Notification ID are required.");
  return doc(db, 'users', userId, 'notifications', notificationId).withConverter(userNotificationConverter);
};

export async function addUserNotification(
  targetUserId: string,
  notificationData: Omit<UserNotification, 'id' | 'timestamp' | 'isRead' | 'userId'>
): Promise<UserNotification> {
  const notificationsCol = getUserNotificationsCollection(targetUserId);
  // Ensure isRead is false by default if not provided in notificationData
  const dataToSave = { ...notificationData, isRead: notificationData.isRead || false };
  const docRef = await addDoc(notificationsCol, dataToSave);
  
  // To return the full UserNotification object, we'd ideally fetch it, but this is simpler:
  return {
    id: docRef.id,
    userId: targetUserId,
    ...dataToSave,
    timestamp: new Date(), // Approximate, actual timestamp is server-generated
  } as UserNotification;
}

export async function getUserNotifications(
  userId: string,
  options: { count?: number; unreadOnly?: boolean } = {}
): Promise<UserNotification[]> {
  const notificationsCol = getUserNotificationsCollection(userId);
  const constraints = [orderBy("timestamp", "desc")];
  if (options.count) {
    constraints.push(firestoreLimit(options.count));
  }
  if (options.unreadOnly) {
    constraints.push(where("isRead", "==", false));
  }
  const q = query(notificationsCol, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  const notificationDocRef = getUserNotificationDoc(userId, notificationId);
  await updateDoc(notificationDocRef, { isRead: true });
}

export async function markAllUserNotificationsAsRead(userId: string): Promise<void> {
  const notificationsCol = getUserNotificationsCollection(userId);
  const q = query(notificationsCol, where("isRead", "==", false));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { isRead: true });
  });
  await batch.commit();
}

export async function markNotificationsAsReadByLink(userId: string, linkPrefix: string): Promise<void> {
  if (!userId || !linkPrefix) return;
  const notificationsCol = getUserNotificationsCollection(userId);
  // This query looks for notifications that are unread AND start with the given link prefix.
  // Firestore doesn't support "startsWith" queries directly on strings in this manner for general cases.
  // A common workaround is to query for equality on the full link, or fetch and filter client-side if not too many.
  // For a more robust "startsWith", you might need to structure your data differently or use a more complex query
  // often involving >= and < conditions on the string field.
  // For now, we'll query for exact link match if possible or all unread and filter.
  // Assuming link is specific enough, e.g., /chat?threadId=XYZ
  const q = query(notificationsCol, where("isRead", "==", false), where("link", "==", linkPrefix));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { isRead: true });
  });
  await batch.commit();
}


export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const notificationsCol = getUserNotificationsCollection(userId);
  const q = query(notificationsCol, where("isRead", "==", false));
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

export async function getUnreadNotificationCountByType(userId: string, type: UserNotificationType): Promise<number> {
  const notificationsCol = getUserNotificationsCollection(userId);
  const q = query(notificationsCol, where("isRead", "==", false), where("type", "==", type));
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}
