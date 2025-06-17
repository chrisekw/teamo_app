
import { db, auth } from '@/lib/firebase/client';
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
  writeBatch,
  serverTimestamp,
  Timestamp,
  collectionGroup,
  type DocumentData,
  type FirestoreDataConverter,
  runTransaction,
} from 'firebase/firestore';
import type { Office, OfficeFirestoreData, Room, RoomFirestoreData, OfficeMember, OfficeMemberFirestoreData, RoomType } from '@/types';

// --- Converters ---
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
    delete data.officeId; // Not stored in room doc itself, part of path
    if (!roomInput.id) data.createdAt = serverTimestamp();
    data.updatedAt = serverTimestamp();
    return data;
  },
  fromFirestore: (snapshot, options): Room => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      officeId: snapshot.ref.parent.parent!.id, // Get officeId from path
      name: data.name,
      type: data.type as RoomType,
      iconName: data.iconName,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  }
};

const officeMemberConverter: FirestoreDataConverter<OfficeMember, OfficeMemberFirestoreData> = {
  toFirestore: (memberInput: OfficeMember): DocumentData => {
    const data: any = { ...memberInput };
    // userId is the doc ID, not stored in data
    if (!memberInput.joinedAt) data.joinedAt = serverTimestamp(); // Set joinedAt only if not present (e.g. on creation)
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

// --- Collection & Doc References ---
const officesCol = () => collection(db, 'offices').withConverter(officeConverter);
const officeDoc = (officeId: string) => doc(db, 'offices', officeId).withConverter(officeConverter);

const roomsCol = (officeId: string) => collection(officeDoc(officeId).path, 'rooms').withConverter(roomConverter);
const roomDoc = (officeId: string, roomId: string) => doc(roomsCol(officeId).path, roomId).withConverter(roomConverter);

const membersCol = (officeId: string) => collection(officeDoc(officeId).path, 'members').withConverter(officeMemberConverter);
const memberDoc = (officeId: string, userId: string) => doc(membersCol(officeId).path, userId).withConverter(officeMemberConverter);

const userOfficesCol = (userId: string) => collection(db, 'users', userId, 'memberOfOffices');


// --- Office Operations ---
export async function createOffice(userId: string, userName: string, userAvatar: string | undefined, officeName: string): Promise<Office> {
  if (!userId || !officeName) throw new Error("User ID and office name are required.");
  
  const invitationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const newOfficeData: Omit<Office, 'id' | 'createdAt' | 'updatedAt'> = {
    name: officeName,
    ownerId: userId,
    invitationCode,
  };

  const newOfficeRef = await addDoc(officesCol(), newOfficeData as Office);
  
  // Add owner as a member
  const ownerMemberData: OfficeMember = {
    userId: userId,
    name: userName,
    role: "Owner",
    avatarUrl: userAvatar,
  };
  await addDocToSubcollection('offices', newOfficeRef.id, 'members', userId, ownerMemberData, officeMemberConverter.toFirestore(ownerMemberData));

  // Add office to user's list of offices for easier querying later
  await addDoc(userOfficesCol(userId), { officeId: newOfficeRef.id, officeName: officeName, role: "Owner" });

  const newOfficeSnap = await getDoc(newOfficeRef);
  if (!newOfficeSnap.exists()) throw new Error("Failed to create office.");
  return newOfficeSnap.data()!;
}

export async function joinOfficeByCode(userId: string, userName: string, userAvatar: string | undefined, invitationCode: string): Promise<Office | null> {
  if (!userId || !invitationCode) throw new Error("User ID and invitation code are required.");
  
  const q = query(officesCol(), where("invitationCode", "==", invitationCode));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null; // No office found with this code

  const officeToJoin = snapshot.docs[0];
  const officeId = officeToJoin.id;

  // Check if user is already a member
  const memberSnap = await getDoc(memberDoc(officeId, userId));
  if (memberSnap.exists()) throw new Error("User is already a member of this office.");

  const newMemberData: OfficeMember = {
    userId,
    name: userName,
    role: "Member",
    avatarUrl: userAvatar,
  };
  await addDocToSubcollection('offices', officeId, 'members', userId, newMemberData, officeMemberConverter.toFirestore(newMemberData));
  
  // Add office to user's list of offices
  await addDoc(userOfficesCol(userId), { officeId: officeId, officeName: officeToJoin.data().name, role: "Member" });
  
  return officeToJoin.data();
}

export async function getOfficesForUser(userId: string): Promise<Office[]> {
  if (!userId) return [];
  const userOfficeRefsSnapshot = await getDocs(query(userOfficesCol(userId)));
  if (userOfficeRefsSnapshot.empty) return [];

  const officeIds = userOfficeRefsSnapshot.docs.map(doc => doc.data().officeId as string);
  
  if (officeIds.length === 0) return [];

  // Fetch actual office documents. Firestore 'in' query limit is 30. Handle if more needed.
  const officePromises = officeIds.slice(0,30).map(id => getDoc(officeDoc(id)));
  const officeSnapshots = await Promise.all(officePromises);
  
  return officeSnapshots.filter(snap => snap.exists()).map(snap => snap.data()!);
}

export async function getOfficeDetails(officeId: string): Promise<Office | null> {
    const snap = await getDoc(officeDoc(officeId));
    return snap.exists() ? snap.data() : null;
}


// --- Room Operations ---
export async function addRoomToOffice(officeId: string, roomData: Omit<Room, 'id' | 'officeId' | 'createdAt' | 'updatedAt'>): Promise<Room> {
  const newRoomRef = await addDoc(roomsCol(officeId), roomData as Room);
  const newRoomSnap = await getDoc(newRoomRef);
  if (!newRoomSnap.exists()) throw new Error("Failed to add room.");
  return newRoomSnap.data()!;
}

export async function getRoomsForOffice(officeId: string): Promise<Room[]> {
  const snapshot = await getDocs(query(roomsCol(officeId), orderBy("createdAt", "asc")));
  return snapshot.docs.map(doc => doc.data());
}

export async function deleteRoomFromOffice(officeId: string, roomId: string): Promise<void> {
  await deleteDoc(roomDoc(officeId, roomId));
}

// --- Member Operations ---
export async function getMembersForOffice(officeId: string): Promise<OfficeMember[]> {
  const snapshot = await getDocs(query(membersCol(officeId), orderBy("joinedAt", "asc")));
  return snapshot.docs.map(doc => doc.data());
}

export async function updateMemberRoleInOffice(officeId: string, memberUserId: string, newRole: MemberRole): Promise<void> {
  await updateDoc(memberDoc(officeId, memberUserId), { role: newRole });
  
  // Update role in user's list of offices
  const userOfficeQuery = query(userOfficesCol(memberUserId), where("officeId", "==", officeId));
  const userOfficeSnap = await getDocs(userOfficeQuery);
  if (!userOfficeSnap.empty) {
      const userOfficeDocRef = userOfficeSnap.docs[0].ref;
      await updateDoc(userOfficeDocRef, { role: newRole });
  }
}

export async function removeMemberFromOffice(officeId: string, memberUserId: string): Promise<void> {
    const office = await getDoc(officeDoc(officeId));
    if (office.exists() && office.data().ownerId === memberUserId) {
        throw new Error("Cannot remove the office owner.");
    }
    await deleteDoc(memberDoc(officeId, memberUserId));

    // Remove office from user's list of offices
    const userOfficeQuery = query(userOfficesCol(memberUserId), where("officeId", "==", officeId));
    const userOfficeSnap = await getDocs(userOfficeQuery);
    if (!userOfficeSnap.empty) {
        await deleteDoc(userOfficeSnap.docs[0].ref);
    }
}

// Helper to add a document to a subcollection with a specific ID
async function addDocToSubcollection<T>(
  parentCollection: string,
  parentId: string,
  subcollectionName: string,
  docId: string,
  data: T,
  convertedData: DocumentData
) {
  const subcollectionRef = collection(db, parentCollection, parentId, subcollectionName);
  const docRef = doc(subcollectionRef, docId);
  await setDoc(docRef, convertedData); // Use setDoc with specific ID
}

// Helper for Firestore 'set' operation (used when doc ID is known, e.g., for members where userId is the ID)
import { setDoc } from 'firebase/firestore';
