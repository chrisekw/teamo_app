
import { db } from '@/lib/firebase/client';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
} from 'firebase/firestore';
import type { Meeting, MeetingFirestoreData } from '@/types';
import { addActivityLog } from './activity';

const meetingConverter: FirestoreDataConverter<Meeting, MeetingFirestoreData> = {
  toFirestore: (meetingInput: Partial<Meeting>): DocumentData => {
    const data: any = { ...meetingInput };
    delete data.id; 
    delete data.userId;

    if (meetingInput.dateTime && meetingInput.dateTime instanceof Date) {
      data.dateTime = Timestamp.fromDate(meetingInput.dateTime);
    }
    
    if (!meetingInput.id) { 
      data.createdAt = serverTimestamp();
    }
    data.updatedAt = serverTimestamp();
    
    return data;
  },
  fromFirestore: (snapshot, options): Meeting => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      title: data.title,
      dateTime: data.dateTime instanceof Timestamp ? data.dateTime.toDate() : new Date(),
      durationMinutes: data.durationMinutes,
      participants: data.participants || [],
      description: data.description || "",
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  }
};

const getMeetingsCollection = (userId: string) => {
  return collection(db, 'users', userId, 'meetings').withConverter(meetingConverter);
};

const getMeetingDoc = (userId: string, meetingId: string) => {
  return doc(db, 'users', userId, 'meetings', meetingId).withConverter(meetingConverter);
};

export async function getMeetingsForUser(userId: string): Promise<Meeting[]> {
  if (!userId) throw new Error("User ID is required to fetch meetings.");
  const meetingsCol = getMeetingsCollection(userId);
  const q = query(meetingsCol, orderBy("dateTime", "asc")); 
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
}

export async function addMeetingForUser(
  userId: string, 
  meetingData: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
  actorName: string,
  officeId?: string
): Promise<Meeting> {
  if (!userId) throw new Error("User ID is required to add a meeting.");
  const meetingsCol = getMeetingsCollection(userId);
  const docRef = await addDoc(meetingsCol, meetingData as Meeting);
  
  const newDocSnap = await getDoc(docRef);
  if (!newDocSnap.exists()) {
    throw new Error("Failed to create and retrieve meeting.");
  }
  const newMeeting = newDocSnap.data()!;

  if (officeId) {
    addActivityLog(officeId, {
      type: "meeting-new",
      title: `Meeting Scheduled: ${newMeeting.title}`,
      description: `On ${newMeeting.dateTime.toLocaleDateString()} at ${newMeeting.dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      iconName: "CalendarPlus",
      actorId: userId,
      actorName,
      entityId: newMeeting.id,
      entityType: "meeting",
    });
  }
  return newMeeting;
}

export async function updateMeetingForUser(
  userId: string, 
  meetingId: string, 
  meetingData: Partial<Omit<Meeting, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>
  // actorName and officeId could be added for activity logging on update
): Promise<void> {
  if (!userId || !meetingId) throw new Error("User ID and Meeting ID are required for update.");
  const meetingDocRef = getMeetingDoc(userId, meetingId);
  const updatePayload: Partial<MeetingFirestoreData> = { ...meetingData } as Partial<MeetingFirestoreData>;
   if (meetingData.dateTime && meetingData.dateTime instanceof Date) {
    updatePayload.dateTime = Timestamp.fromDate(meetingData.dateTime);
  }
  await updateDoc(meetingDocRef, updatePayload);
}

export async function deleteMeetingForUser(userId: string, meetingId: string): Promise<void> {
  if (!userId || !meetingId) throw new Error("User ID and Meeting ID are required for delete.");
  const meetingDocRef = getMeetingDoc(userId, meetingId);
  await deleteDoc(meetingDocRef);
  // Consider logging deletion
}
