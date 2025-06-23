
import { db } from '@/lib/firebase/client';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import type { ActivityLogItem, ActivityLogItemFirestoreData, ActivityType } from '@/types';

const activityLogItemConverter: FirestoreDataConverter<ActivityLogItem, ActivityLogItemFirestoreData> = {
  toFirestore: (activityInput: Omit<ActivityLogItem, 'id' | 'timestamp'>): DocumentData => {
    const data: any = { ...activityInput };
    data.timestamp = serverTimestamp();
    return data;
  },
  fromFirestore: (snapshot, options): ActivityLogItem => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      officeId: data.officeId,
      type: data.type as ActivityType,
      title: data.title,
      description: data.description,
      timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
      iconName: data.iconName,
      actorName: data.actorName,
      actorId: data.actorId,
      entityId: data.entityId,
      entityType: data.entityType,
    };
  }
};

const getActivityLogCollection = (officeId: string) => {
  if (!officeId) throw new Error("Office ID is required for activity log operations.");
  return collection(db, 'offices', officeId, 'activityLog').withConverter(activityLogItemConverter);
};

export async function addActivityLog(
  officeId: string,
  activityData: Omit<ActivityLogItem, 'id' | 'timestamp' | 'officeId'>
): Promise<void> {
  if (!officeId) {
    console.warn("Skipping activity log: Office ID is undefined.");
    return;
  }
  try {
    const activityLogCol = getActivityLogCollection(officeId);
    await addDoc(activityLogCol, { ...activityData, officeId: officeId });
  } catch (error) {
    console.error("Failed to add activity log:", error, { officeId, activityData });
  }
}

export function onActivityLogUpdate(
  officeId: string,
  callback: (activities: ActivityLogItem[]) => void,
  limitCount: number = 7
): Unsubscribe {
  if (!officeId) {
    console.error("Office ID is required to listen for activity log updates.");
    callback([]);
    return () => {};
  }
  const activityLogCol = getActivityLogCollection(officeId);
  const q = query(activityLogCol, orderBy("timestamp", "desc"), limit(limitCount));

  return onSnapshot(q, (snapshot) => {
    const activities = snapshot.docs.map(doc => doc.data());
    callback(activities);
  }, (error) => {
    console.error(`Error listening to activity log for office ${officeId}:`, error);
    callback([]);
  });
}
