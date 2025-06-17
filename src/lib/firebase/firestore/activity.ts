
import { db } from '@/lib/firebase/client';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
} from 'firebase/firestore';
import type { ActivityLogItem, ActivityLogItemFirestoreData, ActivityType } from '@/types';

// Firestore data converter for ActivityLogItem
const activityLogItemConverter: FirestoreDataConverter<ActivityLogItem, ActivityLogItemFirestoreData> = {
  toFirestore: (activityInput: Omit<ActivityLogItem, 'id' | 'timestamp'>): DocumentData => {
    const data: any = { ...activityInput };
    data.timestamp = serverTimestamp(); // Always set server timestamp on creation
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
    await addDoc(activityLogCol, activityData);
  } catch (error) {
    console.error("Failed to add activity log:", error, { officeId, activityData });
  }
}

export async function getActivityLogForOffice(officeId: string, limitCount: number = 7): Promise<ActivityLogItem[]> {
  if (!officeId) return [];
  try {
    const activityLogCol = getActivityLogCollection(officeId);
    const q = query(activityLogCol, orderBy("timestamp", "desc"), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Failed to fetch activity log for office:", error, { officeId });
    return [];
  }
}
