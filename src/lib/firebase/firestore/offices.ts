
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
  orderBy
} from 'firebase/firestore';
import type { Office, OfficeFirestoreData, Room, RoomFirestoreData, OfficeMember, OfficeMemberFirestoreData, RoomType, MemberRole } from '@/types';
import { addActivityLog } from './activity';

const officeConverter: FirestoreDataConverter<Office, OfficeFirestoreData> = {
  toFirestore: (officeInput: Partial<Office>): DocumentData => {
    const data: any = { ...officeInput };
    delete data.id;
    if (!officeInput.id) data.createdAt = serverTimestamp();
    data.updatedAt = serverTimestamp();
    
    if (officeInput.sector === undefined) delete data.sector;
    if (officeInput.companyName === undefined) delete data.companyName;
    
    if (officeInput.logoUrl === undefined) {
        delete data.logoUrl;
    } else {
        data.logoUrl = officeInput.logoUrl;
    }
    if (officeInput.bannerUrl === undefined) {
        delete data.bannerUrl;
    } else {
        data.bannerUrl = officeInput.bannerUrl;
    }
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
  toFirestore: (memberInput: Partial<OfficeMember> & { invitationCodeUsedToJoin?: string }): DocumentData => { 
    const data: any = { ...memberInput };
    if (data.hasOwnProperty('userId')) delete data.userId; // userId is the doc ID, not a field in the doc

    if (!memberInput.joinedAt) data.joinedAt = serverTimestamp();
    else if (memberInput.joinedAt instanceof Date) data.joinedAt = Timestamp.fromDate(memberInput.joinedAt);
    
    // Explicitly delete avatarUrl if it's undefined to avoid Firestore error
    if (memberInput.avatarUrl === undefined) {
        delete data.avatarUrl; 
    } else {
        data.avatarUrl = memberInput.avatarUrl; 
    }
    
    // invitationCodeUsedToJoin is passed through if present, used for rule validation
    if (memberInput.invitationCodeUsedToJoin) {
        data.invitationCodeUsedToJoin = memberInput.invitationCodeUsedToJoin;
    }

    return data;
  },
  fromFirestore: (snapshot, options): OfficeMember => {
    const data = snapshot.data(options)!;
    return {
      userId: snapshot.id,
      name: data.name,
      role: data.role,
      avatarUrl: data.avatarUrl, // Will be undefined if not present in Firestore
      joinedAt: data.joinedAt instanceof Timestamp ? data.joinedAt.toDate() : new Date(),
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
  console.log('[Firebase Debug] Starting office creation for user:', currentUserId, 'Office Name:', officeName);
  if (!currentUserId || !officeName) {
    console.error('[Firebase Debug] User ID or office name is missing for createOffice.');
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
  
  console.log('[Firebase Debug] Attempting to write to `offices` collection with data:', newOfficeData);
  const newOfficeDocRef = await addDoc(officesCol(), newOfficeData as Office);
  console.log('[Firebase Debug] New office document created with ID:', newOfficeDocRef.id);
  
  const ownerMemberData: Omit<OfficeMember, 'joinedAt' | 'userId'> = {
    name: currentUserName,
    role: "Owner",
    avatarUrl: currentUserAvatar, // This can be undefined if user has no photoURL
  };

  console.log('[Firebase Debug] Attempting to write owner member data to `members` subcollection:', ownerMemberData);
  await setDoc(memberDocRef(newOfficeDocRef.id, currentUserId), ownerMemberData);
  console.log('[Firebase Debug] Owner added as member.');

  console.log('[Firebase Debug] Attempting to write office reference to user\'s `memberOfOffices` list.');
  await setDoc(doc(userOfficesCol(currentUserId), newOfficeDocRef.id), { officeId: newOfficeDocRef.id, officeName: officeName, role: "Owner", joinedAt: serverTimestamp() });
  console.log('[Firebase Debug] Office reference added to user\'s list.');

  addActivityLog(newOfficeDocRef.id, {
      type: "office-created",
      title: `Office Created: ${officeName}`,
      description: `Created by ${currentUserName}. Sector: ${sector || 'N/A'}, Company: ${companyName || 'N/A'}`,
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
  console.log('[Firebase Debug] Activity logs added.');

  const newOfficeSnap = await getDoc(newOfficeDocRef);
  if (!newOfficeSnap.exists()) {
    console.error('[Firebase Debug] CRITICAL: New office document does not exist after creation attempt.');
    throw new Error("Failed to create office.");
  }
  console.log('[Firebase Debug] Office creation successful. Returning office data.');
  return newOfficeSnap.data()!;
}

export async function joinOfficeByCode(currentUserId: string, currentUserName: string, currentUserAvatar: string | undefined, invitationCode: string): Promise<Office | null> {
  if (!currentUserId || !invitationCode) throw new Error("User ID and invitation code are required.");
  
  const q = query(officesCol(), where("invitationCode", "==", invitationCode));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const officeToJoin = snapshot.docs[0];
  const officeId = officeToJoin.id;
  const officeData = officeToJoin.data();

  const memberSnap = await getDoc(memberDocRef(officeId, currentUserId));
  if (memberSnap.exists()) throw new Error("User is already a member of this office.");

  const newMemberData: Omit<OfficeMember, 'joinedAt' | 'userId'> & { invitationCodeUsedToJoin: string } = {
    name: currentUserName,
    role: "Member",
    avatarUrl: currentUserAvatar, // This can be undefined
    invitationCodeUsedToJoin: invitationCode, // Pass the code for rule validation
  };
  await setDoc(memberDocRef(officeId, currentUserId), newMemberData);
  
  await setDoc(doc(userOfficesCol(currentUserId), officeId), { officeId: officeId, officeName: officeData.name, role: "Member", joinedAt: serverTimestamp() });
  
  addActivityLog(officeId, {
      type: "member-join",
      title: `${currentUserName} joined the office`,
      description: `Welcome to ${officeData.name}!`,
      iconName: "UserPlus",
      actorId: currentUserId,
      actorName: currentUserName,
      entityId: currentUserId,
      entityType: "member",
  });

  return officeData;
}

export async function getOfficesForUser(userId: string): Promise<Office[]> {
  if (!userId) return [];
  const userOfficeRefsSnapshot = await getDocs(query(userOfficesCol(userId), orderBy("joinedAt", "asc")));
  if (userOfficeRefsSnapshot.empty) return [];

  const officeIds = userOfficeRefsSnapshot.docs.map(d => d.data().officeId as string);
  
  if (officeIds.length === 0) return [];

  // Limit concurrent fetches if officeIds is very large, Firestore has limits.
  // For now, fetching all, but consider batching for > 10-30.
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
    type: "room-new", // Re-using type, or could make specific "room-delete"
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

  await updateDoc(memberDocRef(officeId, memberUserId), { role: newRole, updatedAt: serverTimestamp() });
  
  // Update the role in the user's memberOfOffices collection as well
  const userOfficeQuery = query(userOfficesCol(memberUserId), where("officeId", "==", officeId));
  const userOfficeSnap = await getDocs(userOfficeQuery);
  if (!userOfficeSnap.empty) {
      const userOfficeDocToUpdateRef = userOfficeSnap.docs[0].ref;
      await updateDoc(userOfficeDocToUpdateRef, { role: newRole });
  }
  addActivityLog(officeId, {
      type: "member-join", // Can be re-used or create a "member-role-update" type
      title: `Member Role Update: ${memberName}`,
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
    const office = await getDoc(officeDocRef(officeId));
    if (office.exists() && office.data().ownerId === memberUserId) {
        throw new Error("Cannot remove the office owner.");
    }

    const memberToRemoveSnap = await getDoc(memberDocRef(officeId, memberUserId));
    if (!memberToRemoveSnap.exists()) throw new Error("Member to remove not found.");
    const memberName = memberToRemoveSnap.data()?.name || "A member";

    await deleteDoc(memberDocRef(officeId, memberUserId));

    // Remove the office from the user's memberOfOffices collection
    const userOfficeQuery = query(userOfficesCol(memberUserId), where("officeId", "==", officeId));
    const userOfficeSnap = await getDocs(userOfficeQuery);
    if (!userOfficeSnap.empty) {
        await deleteDoc(userOfficeSnap.docs[0].ref);
    }

    addActivityLog(officeId, {
      type: "member-join", // Can be re-used or create "member-remove" type
      title: `Member Removed: ${memberName}`,
      description: `${memberName} was removed from the office by ${actorName}`,
      iconName: "UserPlus", // Or UserMinus if available/appropriate
      actorId: actorId,
      actorName: actorName,
      entityId: memberUserId,
      entityType: "member",
  });
}

