
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
  writeBatch
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
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  }
};

const officeMemberConverter: FirestoreDataConverter<OfficeMember, OfficeMemberFirestoreData> = {
  toFirestore: (memberInput: Partial<OfficeMember>): DocumentData => { 
    const data: any = { ...memberInput };
    if (data.hasOwnProperty('userId')) delete data.userId;

    if (!memberInput.joinedAt) data.joinedAt = serverTimestamp();
    else if (memberInput.joinedAt instanceof Date) data.joinedAt = Timestamp.fromDate(memberInput.joinedAt);
    
    if (memberInput.avatarUrl === undefined) {
        delete data.avatarUrl; 
    } else {
        data.avatarUrl = memberInput.avatarUrl; 
    }
    return data;
  },
  fromFirestore: (snapshot, options): OfficeMember => {
    const data = snapshot.data(options)!;
    return {
      userId: snapshot.id,
      name: data.name,
      role: data.role as MemberRole,
      avatarUrl: data.avatarUrl,
      joinedAt: data.joinedAt instanceof Timestamp ? data.joinedAt.toDate() : new Date(),
    };
  }
};

const officeJoinRequestConverter: FirestoreDataConverter<OfficeJoinRequest, OfficeJoinRequestFirestoreData> = {
  toFirestore: (requestInput: Partial<OfficeJoinRequest>): DocumentData => {
    const data: any = { ...requestInput };
    delete data.id; // ID is document ID
    if (!requestInput.id) data.requestedAt = serverTimestamp(); // Set on creation
    
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
      officeName: data.officeName, // For displaying in user's request list or notifications
      requesterId: data.requesterId,
      requesterName: data.requesterName,
      requesterAvatarUrl: data.requesterAvatarUrl,
      status: data.status as OfficeJoinRequestStatus,
      requestedAt: data.requestedAt instanceof Timestamp ? data.requestedAt.toDate() : new Date(),
      processedAt: data.processedAt instanceof Timestamp ? data.processedAt.toDate() : undefined, // Timestamp when approved/rejected
      processedBy: data.processedBy, // User ID of the owner/admin who processed it
    };
  }
};


const officesCol = () => collection(db, 'offices').withConverter(officeConverter);
const officeDocRef = (officeId: string) => doc(db, 'offices', officeId).withConverter(officeConverter);

const roomsCol = (officeId: string) => collection(officeDocRef(officeId), 'rooms').withConverter(roomConverter);
const roomDocRef = (officeId: string, roomId: string) => doc(roomsCol(officeId), roomId).withConverter(roomConverter);

const membersCol = (officeId: string) => collection(officeDocRef(officeId), 'members').withConverter(officeMemberConverter);
const memberDocRef = (officeId: string, userId: string) => doc(membersCol(officeId), userId).withConverter(officeMemberConverter);

const userOfficesCol = (userId: string) => collection(db, 'users', userId, 'memberOfOffices'); // No converter needed for simple refs

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
  
  const ownerMemberData: Omit<OfficeMember, 'joinedAt' | 'userId'> = {
    name: currentUserName,
    role: "Owner",
    avatarUrl: currentUserAvatar,
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

  // Check if user is already a member
  const memberSnap = await getDoc(memberDocRef(officeId, requester.id));
  if (memberSnap.exists()) {
    return { success: false, message: "You are already a member of this office." };
  }

  // Check for existing pending request
  const existingRequestQuery = query(
    joinRequestsCol(officeId),
    where("requesterId", "==", requester.id),
    where("status", "==", "pending")
  );
  const existingRequestSnap = await getDocs(existingRequestQuery);
  if (!existingRequestSnap.empty) {
    return { success: false, message: "You already have a pending request for this office." };
  }

  const joinRequestData: Omit<OfficeJoinRequest, 'id' | 'requestedAt'> = {
    officeId: officeId,
    officeName: officeData.name,
    requesterId: requester.id,
    requesterName: requester.name,
    requesterAvatarUrl: requester.avatarUrl, // This can be undefined if user has no avatar
    status: 'pending',
  };

  // The officeJoinRequestConverter will handle omitting requesterAvatarUrl if it's undefined.
  const requestRef = await addDoc(joinRequestsCol(officeId), joinRequestData as OfficeJoinRequest);


  // Notify office owner
  if (officeData.ownerId) {
    await addUserNotification(officeData.ownerId, {
      type: 'office-join-request',
      title: `Join Request for ${officeData.name}`,
      message: `${requester.name} has requested to join your office.`,
      link: `/office-designer?officeId=${officeId}`, // Link to office designer page for this office
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


export async function getPendingJoinRequestsForOffice(officeId: string): Promise<OfficeJoinRequest[]> {
  const q = query(joinRequestsCol(officeId), where("status", "==", "pending"), orderBy("requestedAt", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
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

  const newMemberData: Omit<OfficeMember, 'joinedAt' | 'userId'> = {
    name: requestData.requesterName,
    role: roleToAssign,
    avatarUrl: requestData.requesterAvatarUrl,
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

  const officePromises = officeIds.slice(0,30).map(id => getDoc(officeDocRef(id))); 
  const officeSnapshots = await Promise.all(officePromises);
  
  return officeSnapshots.filter(snap => snap.exists()).map(snap => snap.data()!);
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
    description: `Type: ${newRoom.type}, created by ${actorName}`,
    iconName: roomData.iconName, 
    actorId: actorId,
    actorName: actorName,
    entityId: newRoom.id,
    entityType: "room",
  });

  return newRoom;
}

export async function getRoomsForOffice(officeId: string): Promise<Room[]> {
  const snapshot = await getDocs(query(roomsCol(officeId), orderBy("createdAt", "asc")));
  return snapshot.docs.map(d => d.data());
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
    type: "room-new", // Could be "room-deleted"
    title: `Room Deleted: ${roomName}`,
    description: `Deleted by ${actorName}`,
    iconName: "Trash2", 
    actorId: actorId,
    actorName: actorName,
    entityId: roomId,
    entityType: "room",
  });
}

export async function getMembersForOffice(officeId: string): Promise<OfficeMember[]> {
  const snapshot = await getDocs(query(membersCol(officeId), orderBy("joinedAt", "asc")));
  return snapshot.docs.map(d => d.data());
}

export async function updateMemberRoleInOffice(
  officeId: string, 
  memberUserId: string, 
  newRole: MemberRole,
  actorId: string,
  actorName: string
  ): Promise<void> {
  const memberToUpdateSnap = await getDoc(memberDocRef(officeId, memberUserId));
  if (!memberToUpdateSnap.exists()) throw new Error("Member not found for role update.");
  const memberName = memberToUpdateSnap.data()?.name || "A member";
  const oldRole = memberToUpdateSnap.data()?.role;

  if (oldRole === newRole) return; // No change needed

  await updateDoc(memberDocRef(officeId, memberUserId), { role: newRole });
  
  const userOfficeQuery = query(userOfficesCol(memberUserId), where("officeId", "==", officeId));
  const userOfficeSnap = await getDocs(userOfficeQuery);
  if (!userOfficeSnap.empty) {
      const userOfficeDocToUpdateRef = userOfficeSnap.docs[0].ref;
      await updateDoc(userOfficeDocToUpdateRef, { role: newRole });
  }

  addActivityLog(officeId, {
      type: "member-role-updated",
      title: `Role Update: ${memberName}`,
      description: `${memberName}'s role changed from ${oldRole} to ${newRole} by ${actorName}`,
      iconName: "Settings2", 
      actorId: actorId,
      actorName: actorName,
      entityId: memberUserId,
      entityType: "member",
  });
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

    const userOfficeQuery = query(userOfficesCol(memberUserId), where("officeId", "==", officeId));
    const userOfficeSnap = await getDocs(userOfficeQuery);
    if (!userOfficeSnap.empty) {
        batch.delete(userOfficeSnap.docs[0].ref);
    }
    await batch.commit();

    addActivityLog(officeId, {
      type: "member-removed",
      title: `Member Removed: ${memberName}`,
      description: `${memberName} was removed from the office by ${actorName}`,
      iconName: "UserMinus",
      actorId: actorId,
      actorName: actorName,
      entityId: memberUserId,
      entityType: "member",
  });
}
    
