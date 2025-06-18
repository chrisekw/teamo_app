
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
import type { Office, OfficeFirestoreData, Room, RoomFirestoreData, OfficeMember, OfficeMemberFirestoreData, RoomType, User } from '@/types';
import { addActivityLog } from './activity';

const officeConverter: FirestoreDataConverter<Office, OfficeFirestoreData> = {
  toFirestore: (officeInput: Partial<Office>): DocumentData => {
    const data: any = { ...officeInput };
    delete data.id;
    if (!officeInput.id) data.createdAt = serverTimestamp();
    data.updatedAt = serverTimestamp();
    return data;
  },
  fromFirestore: (snapshot, options): Office => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      name: data.name,
      ownerId: data.ownerId,
      invitationCode: data.invitationCode,
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
    
    return data;
  },
  fromFirestore: (snapshot, options): OfficeMember => {
    const data = snapshot.data(options)!;
    return {
      userId: snapshot.id,
      name: data.name,
      role: data.role,
      avatarUrl: data.avatarUrl,
      joinedAt: data.joinedAt instanceof Timestamp ? data.joinedAt.toDate() : new Date(),
    };
  }
};

const officesCol = () => collection(db, 'offices').withConverter(officeConverter);
const officeDocRef = (officeId: string) => doc(db, 'offices', officeId).withConverter(officeConverter);

// Corrected: Pass DocumentReference to collection() for subcollections
const roomsCol = (officeId: string) => collection(officeDocRef(officeId), 'rooms').withConverter(roomConverter);
const roomDocRef = (officeId: string, roomId: string) => doc(roomsCol(officeId), roomId).withConverter(roomConverter);

// Corrected: Pass DocumentReference to collection() for subcollections
const membersCol = (officeId: string) => collection(officeDocRef(officeId), 'members').withConverter(officeMemberConverter);
const memberDocRef = (officeId: string, userId: string) => doc(membersCol(officeId), userId).withConverter(officeMemberConverter);

const userOfficesCol = (userId: string) => collection(db, 'users', userId, 'memberOfOffices');

export async function createOffice(currentUserId: string, currentUserName: string, currentUserAvatar: string | undefined, officeName: string): Promise<Office> {
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
  };
  
  console.log('[Firebase Debug] Office data prepared:', newOfficeData);
  console.log('[Firebase Debug] Attempting to write to `offices` collection. If this fails, check Firestore rules.');
  const newOfficeDocRef = await addDoc(officesCol(), newOfficeData as Office);
  console.log('[Firebase Debug] New office document created with ID:', newOfficeDocRef.id);
  
  const ownerMemberData: Omit<OfficeMember, 'joinedAt' | 'userId'> = {
    name: currentUserName,
    role: "Owner",
    avatarUrl: currentUserAvatar,
  };
  // Using setDoc with the specific memberDocRef to set the owner as a member
  console.log('[Firebase Debug] Attempting to add owner as member to office subcollection.');
  await setDoc(memberDocRef(newOfficeDocRef.id, currentUserId), officeMemberConverter.toFirestore(ownerMemberData));
  console.log('[Firebase Debug] Owner added as member to office subcollection.');

  console.log('[Firebase Debug] Attempting to add office reference to user\'s memberOfOffices.');
  await setDoc(doc(userOfficesCol(currentUserId), newOfficeDocRef.id), { officeId: newOfficeDocRef.id, officeName: officeName, role: "Owner", joinedAt: serverTimestamp() });
  console.log('[Firebase Debug] Office reference added to user\'s memberOfOffices subcollection.');

  addActivityLog(newOfficeDocRef.id, {
      type: "office-created",
      title: `Office Created: ${officeName}`,
      description: `Created by ${currentUserName}`,
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
    console.error('[Firebase Debug] Failed to re-fetch created office document.');
    throw new Error("Failed to create office.");
  }
  console.log('[Firebase Debug] Office creation successful, returning office data.');
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

  const newMemberData: Omit<OfficeMember, 'joinedAt' | 'userId'> = {
    name: currentUserName,
    role: "Member",
    avatarUrl: currentUserAvatar,
  };
  await setDoc(memberDocRef(officeId, currentUserId), officeMemberConverter.toFirestore(newMemberData));
  
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

  // Limit to fetching first 10 offices to avoid exceeding IN query limits if user is in many.
  // Adjust if users are expected to be in more. Firestore 'in' queries are limited to 30 items.
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

export async function deleteRoomFromOffice(officeId: string, roomId: string): Promise<void> {
  await deleteDoc(roomDocRef(officeId, roomId));
}

export async function getMembersForOffice(officeId: string): Promise<OfficeMember[]> {
  const snapshot = await getDocs(query(membersCol(officeId), orderBy("joinedAt", "asc")));
  return snapshot.docs.map(d => d.data());
}

export async function updateMemberRoleInOffice(officeId: string, memberUserId: string, newRole: MemberRole): Promise<void> {
  await updateDoc(memberDocRef(officeId, memberUserId), { role: newRole, updatedAt: serverTimestamp() });
  
  const userOfficeQuery = query(userOfficesCol(memberUserId), where("officeId", "==", officeId));
  const userOfficeSnap = await getDocs(userOfficeQuery);
  if (!userOfficeSnap.empty) {
      const userOfficeDocToUpdateRef = userOfficeSnap.docs[0].ref;
      await updateDoc(userOfficeDocToUpdateRef, { role: newRole });
  }
}

export async function removeMemberFromOffice(officeId: string, memberUserId: string): Promise<void> {
    const office = await getDoc(officeDocRef(officeId));
    if (office.exists() && office.data().ownerId === memberUserId) {
        throw new Error("Cannot remove the office owner.");
    }
    await deleteDoc(memberDocRef(officeId, memberUserId));

    const userOfficeQuery = query(userOfficesCol(memberUserId), where("officeId", "==", officeId));
    const userOfficeSnap = await getDocs(userOfficeQuery);
    if (!userOfficeSnap.empty) {
        await deleteDoc(userOfficeSnap.docs[0].ref);
    }
}

