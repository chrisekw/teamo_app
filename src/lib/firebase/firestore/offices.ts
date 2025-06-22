
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
  where,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  setDoc,
  orderBy,
  writeBatch,
  onSnapshot,
  type Unsubscribe,
  deleteField,
  type FieldValue
} from 'firebase/firestore';
import type { Office, OfficeFirestoreData, Room, RoomFirestoreData, OfficeMember, OfficeMemberFirestoreData, RoomType, MemberRole, OfficeJoinRequest, OfficeJoinRequestFirestoreData, ChatUser, OfficeJoinRequestStatus } from '@/types';
import { addActivityLog } from './activity';
import { addUserNotification } from './notifications';

const officeConverter: FirestoreDataConverter<Office, OfficeFirestoreData> = {
  toFirestore: (officeInput: Partial<Office>): DocumentData => {
    const data: any = { ...officeInput };
    delete data.id;
    if (!officeInput.id) data.createdAt = serverTimestamp();
    data.updatedAt = serverTimestamp();

    if (officeInput.sector === undefined) delete data.sector;
    if (officeInput.companyName === undefined) delete data.companyName;
    if (officeInput.logoUrl === undefined) delete data.logoUrl;
    if (officeInput.bannerUrl === undefined) delete data.bannerUrl;

    return data;
  },
  fromFirestore: (snapshot, options): Office => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      name: data.name,
      ownerId: data.ownerId,
      invitationCode: data.invitationCode,
      sector: data.sector,
      companyName: data.companyName,
      logoUrl: data.logoUrl,
      bannerUrl: data.bannerUrl,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  }
};

const roomConverter: FirestoreDataConverter<Room, RoomFirestoreData> = {
  toFirestore: (roomInput: Partial<Room>): DocumentData => {
    const data: any = { ...roomInput };
    delete data.id;
    delete data.officeId;
    if (!roomInput.id) data.createdAt = serverTimestamp();
    data.updatedAt = serverTimestamp();
    if (roomInput.coverImageUrl === undefined) delete data.coverImageUrl;
    return data;
  },
  fromFirestore: (snapshot, options): Room => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      officeId: snapshot.ref.parent.parent!.id,
      name: data.name,
      type: data.type as RoomType,
      iconName: data.iconName,
      coverImageUrl: data.coverImageUrl,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  }
};

const officeMemberConverter: FirestoreDataConverter<OfficeMember, OfficeMemberFirestoreData> = {
  toFirestore: (memberInput: Partial<OfficeMember>): DocumentData => {
    const data: any = {}; 
    
    if (memberInput.hasOwnProperty('name')) data.name = memberInput.name;
    if (memberInput.hasOwnProperty('role')) data.role = memberInput.role;
    if (memberInput.hasOwnProperty('workRole')) {
        data.workRole = memberInput.workRole === null || memberInput.workRole === '' ? deleteField() : memberInput.workRole;
    }
    if (memberInput.hasOwnProperty('avatarUrl')) {
        data.avatarUrl = memberInput.avatarUrl === null || memberInput.avatarUrl === '' ? deleteField() : memberInput.avatarUrl;
    }

    if (memberInput.joinedAt instanceof Date) {
      data.joinedAt = Timestamp.fromDate(memberInput.joinedAt);
    }
    
    return data;
  },
  fromFirestore: (snapshot, options): OfficeMember => {
    const data = snapshot.data(options)!;
    return {
      userId: snapshot.id,
      name: data.name,
      role: data.role as MemberRole,
      workRole: data.workRole,
      avatarUrl: data.avatarUrl,
      joinedAt: data.joinedAt instanceof Timestamp ? data.joinedAt.toDate() : new Date(),
    };
  }
};

const officeJoinRequestConverter: FirestoreDataConverter<OfficeJoinRequest, OfficeJoinRequestFirestoreData> = {
  toFirestore: (requestInput: Partial<OfficeJoinRequest>): DocumentData => {
    const data: any = { ...requestInput };
    delete data.id;
    if (!requestInput.id) data.requestedAt = serverTimestamp();

    if (requestInput.requesterAvatarUrl === undefined) {
        delete data.requesterAvatarUrl;
    }

    if (requestInput.processedAt instanceof Date) data.processedAt = Timestamp.fromDate(requestInput.processedAt);
    else if (requestInput.hasOwnProperty('processedAt') && requestInput.processedAt === undefined) data.processedAt = undefined;

    return data;
  },
  fromFirestore: (snapshot, options): OfficeJoinRequest => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      officeId: data.officeId,
      officeName: data.officeName,
      requesterId: data.requesterId,
      requesterName: data.requesterName,
      requesterAvatarUrl: data.requesterAvatarUrl,
      status: data.status as OfficeJoinRequestStatus,
      requestedAt: data.requestedAt instanceof Timestamp ? data.requestedAt.toDate() : new Date(),
      processedAt: data.processedAt instanceof Timestamp ? data.processedAt.toDate() : undefined,
      processedBy: data.processedBy,
    };
  }
};


const officesCol = () => collection(db, 'offices').withConverter(officeConverter);
const officeDocRef = (officeId: string) => doc(db, 'offices', officeId).withConverter(officeConverter);

const roomsCol = (officeId: string) => collection(officeDocRef(officeId), 'rooms').withConverter(roomConverter);
const roomDocRef = (officeId: string, roomId: string) => doc(roomsCol(officeId), roomId).withConverter(roomConverter);

const membersCol = (officeId: string) => collection(officeDocRef(officeId), 'members').withConverter(officeMemberConverter);
const memberDocRef = (officeId: string, userId: string) => doc(membersCol(officeId), userId).withConverter(officeMemberConverter);

const userOfficesCol = (userId: string) => collection(db, 'users', userId, 'memberOfOffices');

const joinRequestsCol = (officeId: string) => collection(officeDocRef(officeId), 'joinRequests').withConverter(officeJoinRequestConverter);
const joinRequestDocRef = (officeId: string, requestId: string) => doc(joinRequestsCol(officeId), requestId).withConverter(officeJoinRequestConverter);


export async function createOffice(
  currentUserId: string,
  currentUserName: string,
  currentUserAvatar: string | undefined,
  officeName: string,
  sector?: string,
  companyName?: string,
  logoUrl?: string,
  bannerUrl?: string
): Promise<Office> {
  if (!currentUserId || !officeName) {
    throw new Error("User ID and office name are required.");
  }

  const invitationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const newOfficeData: Omit<Office, 'id' | 'createdAt' | 'updatedAt'> = {
    name: officeName,
    ownerId: currentUserId,
    invitationCode,
    sector: sector,
    companyName: companyName,
    logoUrl: logoUrl,
    bannerUrl: bannerUrl,
  };

  const newOfficeDocRef = await addDoc(officesCol(), newOfficeData as Office);

  const ownerMemberData = {
    name: currentUserName,
    role: "Owner" as MemberRole,
    avatarUrl: currentUserAvatar,
    joinedAt: serverTimestamp() 
  };
  await setDoc(memberDocRef(newOfficeDocRef.id, currentUserId), ownerMemberData);
  await setDoc(doc(userOfficesCol(currentUserId), newOfficeDocRef.id), { officeId: newOfficeDocRef.id, officeName: officeName, role: "Owner", joinedAt: serverTimestamp() });

  addActivityLog(newOfficeDocRef.id, {
      type: "office-created",
      title: `Office Created: ${officeName}`,
      description: `Created by ${currentUserName}. Invite Code: ${invitationCode}`,
      iconName: "Building",
      actorId: currentUserId,
      actorName: currentUserName,
      entityId: newOfficeDocRef.id,
      entityType: "office",
  });
   addActivityLog(newOfficeDocRef.id, {
      type: "member-join",
      title: `${currentUserName} created and joined the office as Owner.`,
      description: `Welcome to ${officeName}!`,
      iconName: "UserPlus",
      actorId: currentUserId,
      actorName: currentUserName,
      entityId: currentUserId,
      entityType: "member",
    });

  const newOfficeSnap = await getDoc(newOfficeDocRef);
  if (!newOfficeSnap.exists()) {
    throw new Error("Failed to create office.");
  }
  return newOfficeSnap.data()!;
}

export async function deleteOffice(
  officeId: string,
  actorId: string
): Promise<void> {
  const officeRef = officeDocRef(officeId);
  const officeSnap = await getDoc(officeRef);

  if (!officeSnap.exists()) {
    throw new Error("Office not found.");
  }
  if (officeSnap.data().ownerId !== actorId) {
    throw new Error("Only the office owner can delete the office.");
  }

  const batch = writeBatch(db);

  // Delete the main office document
  batch.delete(officeRef);

  // Find all users who are members of this office and delete the reference from their user record
  const membersSnapshot = await getDocs(membersCol(officeId));
  membersSnapshot.docs.forEach(memberDoc => {
    const userId = memberDoc.id;
    const userOfficeRef = doc(db, 'users', userId, 'memberOfOffices', officeId);
    batch.delete(userOfficeRef);
  });
  
  // Note: Deleting subcollections (rooms, tasks, etc.) from the client is complex and not recommended for production.
  // This would typically be handled by a Firebase Cloud Function trigger.
  // For this prototype, we are only deleting the office doc and membership links.

  await batch.commit();
}


export async function requestToJoinOfficeByCode(
  invitationCode: string,
  requester: ChatUser
): Promise<{success: boolean; message: string; officeId?: string, officeName?: string}> {
  if (!requester || !requester.id || !invitationCode) {
    return { success: false, message: "User details and invitation code are required." };
  }

  const q = query(officesCol(), where("invitationCode", "==", invitationCode));
  const officeSnapshot = await getDocs(q);

  if (officeSnapshot.empty) {
    return { success: false, message: "Invalid invitation code. No office found." };
  }

  const officeDoc = officeSnapshot.docs[0];
  const officeId = officeDoc.id;
  const officeData = officeDoc.data();

  // Per user request, do not check for existing membership. Just send the request.

  const joinRequestData: Omit<OfficeJoinRequest, 'id' | 'requestedAt'> = {
    officeId: officeId,
    officeName: officeData.name,
    requesterId: requester.id,
    requesterName: requester.name,
    requesterAvatarUrl: requester.avatarUrl,
    status: 'pending',
  };

  const requestRef = await addDoc(joinRequestsCol(officeId), joinRequestData as OfficeJoinRequest);

  if (officeData.ownerId) {
    await addUserNotification(officeData.ownerId, {
      type: 'office-join-request',
      title: `Join Request for ${officeData.name}`,
      message: `${requester.name} has requested to join your office.`,
      link: `/office-designer?officeId=${officeId}`,
      actorName: requester.name,
      entityId: requestRef.id,
      entityType: 'joinRequest',
      officeId: officeId,
    });
  }

  addActivityLog(officeId, {
    type: 'office-join-request-sent',
    title: `Join Request by ${requester.name}`,
    description: `${requester.name} requested to join ${officeData.name}.`,
    iconName: 'UserPlus',
    actorId: requester.id,
    actorName: requester.name,
    entityId: requestRef.id,
    entityType: 'joinRequest',
  });

  return { success: true, message: `Request to join "${officeData.name}" sent. Awaiting owner approval.`, officeId, officeName: officeData.name };
}

export function onPendingJoinRequestsUpdate(
  officeId: string,
  callback: (requests: OfficeJoinRequest[]) => void
): Unsubscribe {
  if (!officeId) {
    console.error("Office ID is required for listening to join requests.");
    return () => {};
  }
  const q = query(joinRequestsCol(officeId), where("status", "==", "pending"), orderBy("requestedAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => doc.data());
    callback(requests);
  }, (error) => {
    console.error(`Error listening to join requests for office ${officeId}:`, error);
    callback([]);
  });
}

export async function approveJoinRequest(
  officeId: string,
  requestId: string,
  approverUserId: string,
  approverName: string,
  roleToAssign: MemberRole = "Member"
): Promise<void> {
  const requestRef = joinRequestDocRef(officeId, requestId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists() || requestSnap.data().status !== 'pending') {
    throw new Error("Join request not found or already processed.");
  }
  const requestData = requestSnap.data();

  const batch = writeBatch(db);

  batch.update(requestRef, {
    status: 'approved',
    processedAt: serverTimestamp(),
    processedBy: approverUserId,
  });

  const newMemberData = {
    name: requestData.requesterName,
    role: roleToAssign,
    avatarUrl: requestData.requesterAvatarUrl || undefined, 
    joinedAt: serverTimestamp()
  };
  batch.set(memberDocRef(officeId, requestData.requesterId), newMemberData);

  batch.set(doc(userOfficesCol(requestData.requesterId), officeId), {
    officeId: officeId,
    officeName: requestData.officeName,
    role: roleToAssign,
    joinedAt: serverTimestamp()
  });

  await batch.commit();

  await addUserNotification(requestData.requesterId, {
    type: 'office-join-approved',
    title: `Request Approved for ${requestData.officeName}`,
    message: `Your request to join "${requestData.officeName}" has been approved by ${approverName}.`,
    link: `/chat?officeGeneral=${officeId}`,
    actorName: approverName,
    entityId: officeId,
    entityType: 'office',
    officeId: officeId,
  });

  addActivityLog(officeId, {
    type: 'office-join-request-approved',
    title: `Join Request Approved: ${requestData.requesterName}`,
    description: `${approverName} approved ${requestData.requesterName}'s request to join. Assigned role: ${roleToAssign}.`,
    iconName: 'CheckSquare',
    actorId: approverUserId,
    actorName: approverName,
    entityId: requestData.requesterId,
    entityType: 'member',
  });
}

export async function rejectJoinRequest(
  officeId: string,
  requestId: string,
  rejectorUserId: string,
  rejectorName: string
): Promise<void> {
  const requestRef = joinRequestDocRef(officeId, requestId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists() || requestSnap.data().status !== 'pending') {
    throw new Error("Join request not found or already processed.");
  }
  const requestData = requestSnap.data();

  await updateDoc(requestRef, {
    status: 'rejected',
    processedAt: serverTimestamp(),
    processedBy: rejectorUserId,
  });

  await addUserNotification(requestData.requesterId, {
    type: 'office-join-rejected',
    title: `Request Rejected for ${requestData.officeName}`,
    message: `Your request to join "${requestData.officeName}" has been rejected by ${rejectorName}.`,
    link: `/office-designer`,
    actorName: rejectorName,
    entityId: officeId,
    entityType: 'office',
    officeId: officeId,
  });

  addActivityLog(officeId, {
    type: 'office-join-request-rejected',
    title: `Join Request Rejected: ${requestData.requesterName}`,
    description: `${rejectorName} rejected ${requestData.requesterName}'s request to join.`,
    iconName: 'XSquare',
    actorId: rejectorUserId,
    actorName: rejectorName,
    entityId: requestData.requesterId,
    entityType: 'joinRequest',
  });
}

export async function getOfficesForUser(userId: string): Promise<Office[]> {
  if (!userId) return [];
  const userOfficeRefsSnapshot = await getDocs(query(userOfficesCol(userId), orderBy("joinedAt", "asc")));
  if (userOfficeRefsSnapshot.empty) return [];

  const officeIds = userOfficeRefsSnapshot.docs.map(d => d.data().officeId as string);

  if (officeIds.length === 0) return [];

  const officePromises = [];
  for (let i = 0; i < officeIds.length; i += 30) {
      const chunk = officeIds.slice(i, i + 30);
      if (chunk.length > 0) {
          const officeQuery = query(officesCol(), where('__name__', 'in', chunk));
          officePromises.push(getDocs(officeQuery));
      }
  }
  
  const officeSnapshotsArray = await Promise.all(officePromises);
  const offices: Office[] = [];
  officeSnapshotsArray.forEach(snapshot => {
      snapshot.docs.forEach(doc => {
          if (doc.exists()) {
              offices.push(doc.data()!);
          }
      });
  });

  const officeMap = new Map(offices.map(office => [office.id, office]));
  return officeIds.map(id => officeMap.get(id)).filter(Boolean) as Office[];
}

export function onUserOfficesUpdate(
  userId: string,
  callback: (offices: Office[]) => void
): Unsubscribe {
  if (!userId) {
    console.error("User ID is required to listen for office updates.");
    return () => {};
  }
  return onSnapshot(query(userOfficesCol(userId), orderBy("joinedAt", "asc")), async (userOfficeRefsSnapshot) => {
    if (userOfficeRefsSnapshot.empty) {
      callback([]);
      return;
    }
    const officeIds = userOfficeRefsSnapshot.docs.map(d => d.data().officeId as string);
    if (officeIds.length === 0) {
      callback([]);
      return;
    }

    const officeData: Office[] = [];
    for (let i = 0; i < officeIds.length; i += 30) {
        const chunk = officeIds.slice(i, i + 30);
        if (chunk.length > 0) {
            const officeQuery = query(officesCol(), where('__name__', 'in', chunk));
            const officeSnaps = await getDocs(officeQuery);
            officeSnaps.docs.forEach(doc => {
                if (doc.exists()) {
                    officeData.push(doc.data()!);
                }
            });
        }
    }
    const officeMap = new Map(officeData.map(office => [office.id, office]));
    const orderedOffices = officeIds.map(id => officeMap.get(id)).filter(Boolean) as Office[];
    callback(orderedOffices);
  }, (error) => {
    console.error(`Error listening to user's offices for user ${userId}:`, error);
    callback([]);
  });
}


export async function getOfficeDetails(officeId: string): Promise<Office | null> {
    const snap = await getDoc(officeDocRef(officeId));
    return snap.exists() ? snap.data() : null;
}

export async function addRoomToOffice(
  officeId: string,
  roomData: Omit<Room, 'id' | 'officeId' | 'createdAt' | 'updatedAt'>,
  actorId: string,
  actorName: string
): Promise<Room> {
  const newRoomDocRef = await addDoc(roomsCol(officeId), roomData as Room);
  const newRoomSnap = await getDoc(newRoomDocRef);
  if (!newRoomSnap.exists()) throw new Error("Failed to add room.");
  const newRoom = newRoomSnap.data()!;

  addActivityLog(officeId, {
    type: "room-new",
    title: `New Room: ${newRoom.name}`,
    description: `Type: ${newRoom.type}, created by ${actorName}${newRoom.coverImageUrl ? '. Cover image added.' : ''}`,
    iconName: roomData.iconName,
    actorId: actorId,
    actorName: actorName,
    entityId: newRoom.id,
    entityType: "room",
  });

  return newRoom;
}

export function onRoomsUpdate(
  officeId: string,
  callback: (rooms: Room[]) => void
): Unsubscribe {
  if (!officeId) {
    console.error("Office ID is required to listen for room updates.");
    return () => {};
  }
  return onSnapshot(query(roomsCol(officeId), orderBy("createdAt", "asc")), (snapshot) => {
    const rooms = snapshot.docs.map(d => d.data());
    callback(rooms);
  }, (error) => {
    console.error(`Error listening to rooms for office ${officeId}:`, error);
    callback([]);
  });
}


export async function getRoomDetails(officeId: string, roomId: string): Promise<Room | null> {
  if (!officeId || !roomId) throw new Error("Office ID and Room ID are required.");
  const docRef = roomDocRef(officeId, roomId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}

export async function deleteRoomFromOffice(
  officeId: string,
  roomId: string,
  actorId: string,
  actorName: string
  ): Promise<void> {
  const roomToDeleteSnap = await getDoc(roomDocRef(officeId, roomId));
  if (!roomToDeleteSnap.exists()) throw new Error("Room to delete not found.");
  const roomName = roomToDeleteSnap.data()?.name || "Unknown Room";

  await deleteDoc(roomDocRef(officeId, roomId));

  addActivityLog(officeId, {
    type: "room-new", 
    title: `Room Deleted: ${roomName}`,
    description: `Deleted by ${actorName}`,
    iconName: "Trash2", 
    actorId: actorId,
    actorName: actorName,
    entityId: roomId,
    entityType: "room",
  });
}

export function onMembersUpdate(
  officeId: string,
  callback: (members: OfficeMember[]) => void
): Unsubscribe {
  if (!officeId) {
    console.error("Office ID is required to listen for member updates.");
    return () => {};
  }
  return onSnapshot(query(membersCol(officeId), orderBy("joinedAt", "asc")), (snapshot) => {
    const members = snapshot.docs.map(d => d.data());
    callback(members);
  }, (error) => {
    console.error(`Error listening to members for office ${officeId}:`, error);
    callback([]);
  });
}

export async function updateMemberDetailsInOffice(
  officeId: string,
  memberUserId: string,
  details: { role?: MemberRole; workRole?: string | null },
  actorId: string,
  actorName: string
): Promise<void> {
  const memberToUpdateRef = memberDocRef(officeId, memberUserId);
  const memberToUpdateSnap = await getDoc(memberToUpdateRef);
  if (!memberToUpdateSnap.exists()) throw new Error("Member not found for update.");
  
  const oldDetails = memberToUpdateSnap.data();
  const memberName = oldDetails?.name || "A member";

  const updatePayload: Partial<OfficeMemberFirestoreData> = {};
  let changesDescription: string[] = [];

  if (details.hasOwnProperty('role') && details.role !== oldDetails?.role) {
    const officeData = await getOfficeDetails(officeId);
    if (officeData && officeData.ownerId === memberUserId && details.role !== "Owner") {
      throw new Error("The office owner's system role cannot be changed from Owner.");
    }
    updatePayload.role = details.role;
    changesDescription.push(`system role to ${details.role}`);
  }

  if (details.hasOwnProperty('workRole')) {
    const newWorkRole = details.workRole === null || details.workRole.trim() === "" ? null : details.workRole.trim();
    if (newWorkRole !== (oldDetails?.workRole || null)) { 
      updatePayload.workRole = newWorkRole === null ? deleteField() as unknown as string : newWorkRole;
      if (newWorkRole === null) {
        changesDescription.push(`work role removed (was "${oldDetails?.workRole || 'N/A'}")`);
      } else {
        changesDescription.push(`work role to "${newWorkRole}"`);
      }
    }
  }
  
  if (Object.keys(updatePayload).length === 0) {
    console.log("No actual changes to member details.");
    return; 
  }

  await updateDoc(memberToUpdateRef, updatePayload);

  if (updatePayload.role && oldDetails?.role !== updatePayload.role) {
    const userOfficeMemberRef = doc(userOfficesCol(memberUserId), officeId);
    const userOfficeMemberSnap = await getDoc(userOfficeMemberRef);
    if (userOfficeMemberSnap.exists()){
         await updateDoc(userOfficeMemberRef, { role: updatePayload.role });
    }
  }

  if (changesDescription.length > 0) {
    addActivityLog(officeId, {
        type: "member-role-updated", 
        title: `Details Updated: ${memberName}`,
        description: `${actorName} updated ${memberName}'s ${changesDescription.join(' and ')}.`,
        iconName: "Settings2",
        actorId: actorId,
        actorName: actorName,
        entityId: memberUserId,
        entityType: "member",
    });
  }
}

export async function removeMemberFromOffice(
  officeId: string,
  memberUserId: string,
  actorId: string,
  actorName: string
  ): Promise<void> {
    const officeDocSnap = await getDoc(officeDocRef(officeId));
    if (officeDocSnap.exists() && officeDocSnap.data().ownerId === memberUserId) {
        throw new Error("Cannot remove the office owner.");
    }

    const memberToRemoveSnap = await getDoc(memberDocRef(officeId, memberUserId));
    if (!memberToRemoveSnap.exists()) throw new Error("Member to remove not found.");
    const memberName = memberToRemoveSnap.data()?.name || "A member";

    const batch = writeBatch(db);
    batch.delete(memberDocRef(officeId, memberUserId));

    const userOfficeMemberRef = doc(userOfficesCol(memberUserId), officeId);
    batch.delete(userOfficeMemberRef);
    
    await batch.commit();

    addActivityLog(officeId, {
      type: "member-removed",
      title: `Member Removed: ${memberName}`,
      description: `${memberName} was removed from the office by ${actorName}`,
      iconName: "UserX", 
      actorId: actorId,
      actorName: actorName,
      entityId: memberUserId,
      entityType: "member",
  });
}

// Deprecated single-fetch functions (can be removed if onSnapshot versions are sufficient)
export async function getMembersForOffice(officeId: string): Promise<OfficeMember[]> {
  const snapshot = await getDocs(query(membersCol(officeId), orderBy("joinedAt", "asc")));
  return snapshot.docs.map(d => d.data());
}
export async function getRoomsForOffice(officeId: string): Promise<Room[]> {
  const snapshot = await getDocs(query(roomsCol(officeId), orderBy("createdAt", "asc")));
  return snapshot.docs.map(d => d.data());
}
export async function getPendingJoinRequestsForOffice(officeId: string): Promise<OfficeJoinRequest[]> {
  const q = query(joinRequestsCol(officeId), where("status", "==", "pending"), orderBy("requestedAt", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
}
