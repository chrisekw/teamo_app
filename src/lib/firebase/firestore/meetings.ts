
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
  where, // Added
  or // Added
} from 'firebase/firestore';
import type { Meeting, MeetingFirestoreData } from '@/types';
import { addActivityLog } from './activity';
// getMembersForOffice is not directly used here, but can be for advanced scenarios
import { addUserNotification } from './notifications';

const meetingConverter: FirestoreDataConverter<Meeting, MeetingFirestoreData> = {
  toFirestore: (meetingInput: Partial<Meeting>): DocumentData => {
    const data: any = { ...meetingInput };
    delete data.id; 
    // userId is now creatorUserId, handled in addMeetingToOffice
    // officeId is also handled directly in addMeetingToOffice

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
    
    if (meetingInput.isRecurring === undefined) delete data.isRecurring;
    if (meetingInput.description === undefined) delete data.description;
    
    if (meetingInput.participantIds && Array.isArray(meetingInput.participantIds)) {
        data.participantIds = meetingInput.participantIds;
    } else {
        delete data.participantIds; 
    }
    if (typeof meetingInput.participantsDisplay === 'string') {
        data.participantsDisplay = meetingInput.participantsDisplay;
    } else {
        delete data.participantsDisplay;
    }

    return data;
  },
  fromFirestore: (snapshot, options): Meeting => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      officeId: data.officeId, // Now part of the document data
      creatorUserId: data.creatorUserId, // Now part of the document data
      title: data.title,
      dateTime: data.dateTime instanceof Timestamp ? data.dateTime.toDate() : new Date(),
      endDateTime: data.endDateTime instanceof Timestamp ? data.endDateTime.toDate() : new Date(),
      isRecurring: data.isRecurring || false,
      participantIds: data.participantIds || [],
      participantsDisplay: data.participantsDisplay || "No participants listed",
      description: data.description || "",
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  }
};

const getMeetingsCollection = (officeId: string) => {
  if (!officeId) throw new Error("Office ID is required for meeting operations.");
  return collection(db, 'offices', officeId, 'meetings').withConverter(meetingConverter);
};

const getMeetingDoc = (officeId: string, meetingId: string) => {
  if (!officeId || !meetingId) throw new Error("Office ID and Meeting ID are required.");
  return doc(db, 'offices', officeId, 'meetings', meetingId).withConverter(meetingConverter);
};

export async function getMeetingsForOfficeVisibleToUser(officeId: string, currentUserId: string): Promise<Meeting[]> {
  if (!officeId || !currentUserId) throw new Error("Office ID and User ID are required to fetch meetings.");
  
  const meetingsCol = getMeetingsCollection(officeId);
  const q = query(meetingsCol, 
    or(
      where("creatorUserId", "==", currentUserId),
      where("participantIds", "array-contains", currentUserId)
    ),
    orderBy("dateTime", "asc")
  ); 
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
}

export async function getMeetingByIdFromOffice(officeId: string, meetingId: string): Promise<Meeting | null> {
  if (!officeId || !meetingId) throw new Error("Office ID and Meeting ID are required.");
  const meetingDocRef = getMeetingDoc(officeId, meetingId);
  const docSnap = await getDoc(meetingDocRef);
  return docSnap.exists() ? docSnap.data() : null;
}


export async function addMeetingToOffice(
  officeId: string,
  creatorUserId: string, 
  meetingData: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt' | 'officeId' | 'creatorUserId'>,
  actorName: string, // This is the creator's name
  officeName?: string
): Promise<Meeting> {
  if (!officeId || !creatorUserId) throw new Error("Office ID and Creator User ID are required to add a meeting.");
  
  const meetingsCol = getMeetingsCollection(officeId);
  const fullMeetingData = { 
    ...meetingData, 
    officeId: officeId, 
    creatorUserId: creatorUserId 
  };
  const docRef = await addDoc(meetingsCol, fullMeetingData as Meeting); 
  
  const newDocSnap = await getDoc(docRef);
  if (!newDocSnap.exists()) {
    throw new Error("Failed to create and retrieve meeting.");
  }
  const newMeeting = newDocSnap.data()!;

  addActivityLog(officeId, {
    type: "meeting-new",
    title: `Meeting Scheduled: ${newMeeting.title}`,
    description: `On ${newMeeting.dateTime.toLocaleDateString()} at ${newMeeting.dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by ${actorName}. Participants: ${newMeeting.participantsDisplay || 'None'}`,
    iconName: "CalendarPlus",
    actorId: creatorUserId,
    actorName,
    entityId: newMeeting.id,
    entityType: "meeting",
  });

  if (newMeeting.participantIds && newMeeting.participantIds.length > 0) {
    for (const participantId of newMeeting.participantIds) {
      if (participantId !== creatorUserId) { 
        try {
          await addUserNotification(participantId, {
            type: "meeting-new",
            title: `New Meeting in ${officeName || 'Office'}: ${newMeeting.title}`,
            message: `${actorName} scheduled "${newMeeting.title}" for ${newMeeting.dateTime.toLocaleDateString()} at ${newMeeting.dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. You are invited.`,
            link: `/meetings?meetingId=${newMeeting.id}&officeId=${officeId}`, // Link to meeting in office
            officeId: officeId,
            actorName: actorName,
            entityId: newMeeting.id,
            entityType: "meeting"
          });
        } catch (error) {
           console.error(`Failed to send meeting notification to participant ${participantId}:`, error);
        }
      }
    }
  }
  return newMeeting;
}

export async function updateMeetingInOffice(
  officeId: string, 
  meetingId: string, 
  meetingData: Partial<Omit<Meeting, 'id' | 'createdAt' | 'updatedAt' | 'officeId' | 'creatorUserId'>>,
  actorId: string,
  actorName: string,
  officeName?: string
): Promise<void> {
  if (!officeId || !meetingId || !actorId) throw new Error("Office ID, Meeting ID, and Actor ID are required for update.");
  
  const meetingDocRef = getMeetingDoc(officeId, meetingId);
  const originalMeetingSnap = await getDoc(meetingDocRef);
  if (!originalMeetingSnap.exists()) throw new Error("Meeting not found for update.");
  const originalMeeting = originalMeetingSnap.data()!;

  const updatePayload: Partial<MeetingFirestoreData> = { ...meetingData } as Partial<MeetingFirestoreData>;
   if (meetingData.dateTime && meetingData.dateTime instanceof Date) {
    updatePayload.dateTime = Timestamp.fromDate(meetingData.dateTime);
  }
  if (meetingData.endDateTime && meetingData.endDateTime instanceof Date) {
    updatePayload.endDateTime = Timestamp.fromDate(meetingData.endDateTime);
  }
  updatePayload.updatedAt = serverTimestamp();

  await updateDoc(meetingDocRef, updatePayload);

  const updateDescription = `${actorName} updated the meeting: "${originalMeeting.title}".`;
  
  addActivityLog(officeId, {
    type: "meeting-updated", 
    title: `Meeting Update: ${originalMeeting.title}`,
    description: updateDescription,
    iconName: "CalendarDays", 
    actorId: actorId,
    actorName,
    entityId: meetingId,
    entityType: "meeting",
  });

  const involvedUserIds = new Set<string>();
  if (originalMeeting.creatorUserId) involvedUserIds.add(originalMeeting.creatorUserId);
  if (originalMeeting.participantIds) originalMeeting.participantIds.forEach(id => involvedUserIds.add(id));
  if (meetingData.participantIds) meetingData.participantIds.forEach(id => involvedUserIds.add(id));
  
  for (const notifiedUserId of involvedUserIds) {
      if (notifiedUserId !== actorId) {
          try {
              await addUserNotification(notifiedUserId, {
                  type: "meeting-updated",
                  title: `Meeting Update in ${officeName || 'Office'}: ${originalMeeting.title}`,
                  message: updateDescription,
                  link: `/meetings?meetingId=${meetingId}&officeId=${officeId}`,
                  officeId: officeId,
                  actorName: actorName,
                  entityId: meetingId,
                  entityType: "meeting"
              });
          } catch (error) {
              console.error(`Failed to send meeting update notification to ${notifiedUserId}:`, error);
          }
      }
  }
}

export async function deleteMeetingFromOffice(
  officeId: string, 
  meetingId: string,
  actorId: string,
  actorName: string
  ): Promise<void> {
  if (!officeId || !meetingId || !actorId) throw new Error("Office ID, Meeting ID, and Actor ID are required for delete.");

  const meetingDocRef = getMeetingDoc(officeId, meetingId);
  const meetingSnap = await getDoc(meetingDocRef);
  if (!meetingSnap.exists()) throw new Error("Meeting not found for deletion.");
  const meetingName = meetingSnap.data()?.title || "Unknown Meeting";
  
  await deleteDoc(meetingDocRef);

  addActivityLog(officeId, {
    type: "meeting-deleted",
    title: `Meeting Deleted: ${meetingName}`,
    description: `Meeting "${meetingName}" was deleted by ${actorName}.`,
    iconName: "Trash2",
    actorId: actorId,
    actorName: actorName,
    entityId: meetingId,
    entityType: "meeting",
  });
}

    

