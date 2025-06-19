
import { db } from '@/lib/firebase/client';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
} from 'firebase/firestore';
import type { UserProfile, UserProfileFirestoreData } from '@/types';

const userProfileConverter: FirestoreDataConverter<UserProfile, UserProfileFirestoreData> = {
  toFirestore: (profileInput: Partial<UserProfile>): DocumentData => {
    const data: any = { ...profileInput };
    delete data.id; // ID is document ID

    if (profileInput.birthday && profileInput.birthday instanceof Date) {
      data.birthday = Timestamp.fromDate(profileInput.birthday);
    }
    
    // Set timestamps
    if (!profileInput.createdAt && !data.createdAt) { // Only set createdAt if not already set (for creation)
        data.createdAt = serverTimestamp();
    }
    data.updatedAt = serverTimestamp();
    
    return data;
  },
  fromFirestore: (snapshot, options): UserProfile => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      displayName: data.displayName,
      email: data.email,
      avatarUrl: data.avatarUrl,
      phoneNumber: data.phoneNumber,
      profession: data.profession,
      birthday: data.birthday instanceof Timestamp ? data.birthday.toDate() : undefined,
      bio: data.bio,
      resumeUrl: data.resumeUrl,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  }
};

const userProfileDocRef = (userId: string) => {
  if (!userId) throw new Error("User ID is required for profile operations.");
  return doc(db, 'userProfiles', userId).withConverter(userProfileConverter);
};

export async function getOrCreateUserProfile(
  userId: string, 
  initialData?: Partial<Pick<UserProfile, 'displayName' | 'email' | 'avatarUrl'>>
): Promise<UserProfile> {
  const docRef = userProfileDocRef(userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    const newProfileData: Partial<UserProfile> = {
      id: userId,
      displayName: initialData?.displayName || 'New User',
      email: initialData?.email || '',
      avatarUrl: initialData?.avatarUrl || undefined,
      // Initialize other fields as needed or leave them undefined
    };
    // Use setDoc with merge:true to avoid overwriting if somehow created concurrently,
    // and to ensure serverTimestamp is applied correctly on creation.
    await setDoc(docRef, newProfileData, { merge: true });
    const newSnap = await getDoc(docRef);
    if (!newSnap.exists()) throw new Error("Failed to create user profile.");
    return newSnap.data();
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const docRef = userProfileDocRef(userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}

export async function updateUserProfile(
  userId: string,
  profileData: Partial<Omit<UserProfile, 'id' | 'email' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const docRef = userProfileDocRef(userId);
  // Ensure email and createdAt are not part of the update payload from client
  const { email, createdAt, ...updatableData } = profileData as any; 
  
  const firestoreData: Partial<UserProfileFirestoreData> = {
    ...updatableData,
    updatedAt: serverTimestamp() as Timestamp // For type consistency, actual value is server-generated
  };

  if (updatableData.birthday && updatableData.birthday instanceof Date) {
    firestoreData.birthday = Timestamp.fromDate(updatableData.birthday);
  } else if (updatableData.hasOwnProperty('birthday') && updatableData.birthday === undefined) {
    firestoreData.birthday = undefined; // Or use deleteField() if you want to remove it completely
  }

  await updateDoc(docRef, firestoreData);
}
