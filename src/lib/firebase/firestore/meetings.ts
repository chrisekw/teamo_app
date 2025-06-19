
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
import { getMembersForOffice } from './offices';
import { addUserNotification } from './notifications';

const meetingConverter: FirestoreDataConverter<Meeting, MeetingFirestoreData> = {
  toFirestore: (meetingInput: Partial<Meeting>): DocumentData => {
    const data: any = { ...meetingInput };
    delete data.id; 
    delete data.userId;

    if (meetingInput.dateTime && meetingInput.dateTime instanceof Date) {
      data.dateTime = Timestamp.fromDate(meetingInput.dateTime);
    }
    if (meetingInput.endDateTime && meetingInput.endDateTime instanceof Date) {
      data.endDateTime = Timestamp.fromDate(meetingInput.endDateTime);
    }
    
    if (!meetingInput.id) { 
      data.createdAt = serverTimestamp();
    }
    data.updatedAt = serverTimestamp();
    
    // Ensure optional fields that are undefined are not sent to Firestore
    if (meetingInput.isRecurring === undefined) delete data.isRecurring;
    if (meetingInput.department === undefined) delete data.department;
    if (meetingInput.description === undefined) delete data.description;

    return data;
  },
  fromFirestore: (snapshot, options): Meeting => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      title: data.title,
      dateTime: data.dateTime instanceof Timestamp ? data.dateTime.toDate() : new Date(),
      endDateTime: data.endDateTime instanceof Timestamp ? data.endDateTime.toDate() : new Date(),
      isRecurring: data.isRecurring || false,
      department: data.department,
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
  actorUserId: string, 
  meetingData: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
  actorName: string,
  officeId?: string,
  officeName?: string
): Promise<Meeting> {
  if (!actorUserId) throw new Error("Actor User ID is required to add a meeting.");
  const meetingsCol = getMeetingsCollection(actorUserId);
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
      description: `On ${newMeeting.dateTime.toLocaleDateString()} at ${newMeeting.dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by ${actorName}.`,
      iconName: "CalendarPlus",
      actorId: actorUserId,
      actorName,
      entityId: newMeeting.id,
      entityType: "meeting",
    });

    try {
      const members = await getMembersForOffice(officeId);
      for (const member of members) {
        if (member.userId !== actorUserId) { 
          await addUserNotification(member.userId, {
            type: "meeting-new",
            title: `New Meeting in ${officeName || 'Office'}: ${newMeeting.title}`,
            message: `${actorName} scheduled a meeting: "${newMeeting.title}" for ${newMeeting.dateTime.toLocaleDateString()} at ${newMeeting.dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
            link: `/meetings?meetingId=${newMeeting.id}`,
            officeId: officeId,
            actorName: actorName,
            entityId: newMeeting.id,
            entityType: "meeting"
          });
        }
      }
    } catch (error) {
      console.error("Failed to send meeting scheduling notifications for office members:", error);
    }
  }
  return newMeeting;
}

export async function updateMeetingForUser(
  userId: string, 
  meetingId: string, 
  meetingData: Partial<Omit<Meeting, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>
): Promise<void> {
  if (!userId || !meetingId) throw new Error("User ID and Meeting ID are required for update.");
  const meetingDocRef = getMeetingDoc(userId, meetingId);
  const updatePayload: Partial<MeetingFirestoreData> = { ...meetingData } as Partial<MeetingFirestoreData>;
   if (meetingData.dateTime && meetingData.dateTime instanceof Date) {
    updatePayload.dateTime = Timestamp.fromDate(meetingData.dateTime);
  }
  if (meetingData.endDateTime && meetingData.endDateTime instanceof Date) {
    updatePayload.endDateTime = Timestamp.fromDate(meetingData.endDateTime);
  }
  await updateDoc(meetingDocRef, updatePayload);
}

export async function deleteMeetingForUser(userId: string, meetingId: string): Promise<void> {
  if (!userId || !meetingId) throw new Error("User ID and Meeting ID are required for delete.");
  const meetingDocRef = getMeetingDoc(userId, meetingId);
  await deleteDoc(meetingDocRef);
}
