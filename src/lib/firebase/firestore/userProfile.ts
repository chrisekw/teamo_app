
import { db } from '@/lib/firebase/client';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  query,
  where,
  limit
} from 'firebase/firestore';
import type { UserProfile, UserProfileFirestoreData } from '@/types';

const userProfileConverter: FirestoreDataConverter<UserProfile, UserProfileFirestoreData> = {
  toFirestore: (profileInput: Partial<UserProfile>): DocumentData => {
    const data: any = { ...profileInput };
    delete data.id; // ID is document ID

    if (profileInput.birthday && profileInput.birthday instanceof Date) {
      data.birthday = Timestamp.fromDate(profileInput.birthday);
    } else if (profileInput.hasOwnProperty('birthday') && !profileInput.birthday) {
        // If birthday is explicitly set to null or undefined in the input,
        // ensure it's not sent or explicitly deleted if your types allow for it.
        // Firestore handles 'undefined' by not writing the field.
        // If you need to remove an existing field, you'd use deleteField() with updateDoc.
        // For setDoc, just not including it or setting to undefined works.
        delete data.birthday;
    }
    
    // Ensure optional fields that are undefined are not sent as null
    for (const key in data) {
        if (data[key] === undefined) {
            delete data[key];
        }
    }

    if (!profileInput.createdAt && !data.createdAt) { 
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

const userProfilesColRef = () => collection(db, 'userProfiles').withConverter(userProfileConverter);
const userProfileDocRef = (userId: string) => {
  if (!userId || typeof userId !== 'string' || userId.trim() === "") { // Stricter check
    // console.error("UserProfile Error: Attempted to get docRef with invalid userId:", userId);
    throw new Error("User ID is invalid for profile operations.");
  }
  return doc(db, 'userProfiles', userId).withConverter(userProfileConverter);
};

export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
  if (!email) return null;
  const q = query(userProfilesColRef(), where("email", "==", email), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  return snapshot.docs[0].data();
}

export async function getOrCreateUserProfile(
  userId: string, 
  initialData?: Partial<Pick<UserProfile, 'displayName' | 'email' | 'avatarUrl'>>
): Promise<UserProfile> {
  if (!userId || typeof userId !== 'string' || userId.trim() === "") {
    // console.error("getOrCreateUserProfile Error: Invalid userId provided:", userId);
    throw new Error("User ID is invalid for profile creation/retrieval.");
  }

  const docRef = userProfileDocRef(userId); // This will throw if userId is invalid due to the check in userProfileDocRef
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    const displayNameFallback = `User-${userId.substring(0,4)}`;
    const emailFallback = `${userId.substring(0,5)}@example.com`;

    const profileToCreate: Partial<UserProfile> = {
      // id is not part of the data, it's the doc ID
      displayName: (initialData?.displayName?.trim() || "").trim() || displayNameFallback,
      email: initialData?.email || emailFallback,
      avatarUrl: initialData?.avatarUrl, // This can be undefined, converter handles it
      // Optional fields are left undefined; Firestore won't store them.
      // Timestamps (createdAt, updatedAt) are handled by the toFirestore converter.
    };
    
    // Ensure displayName and email are not empty strings before setting
    if (!profileToCreate.displayName) profileToCreate.displayName = displayNameFallback;
    if (!profileToCreate.email) profileToCreate.email = emailFallback;


    try {
      await setDoc(docRef, profileToCreate, { merge: true }); 
      const newSnap = await getDoc(docRef);
      if (!newSnap.exists()) {
        // console.error("getOrCreateUserProfile Error: Failed to retrieve profile immediately after creation for userId:", userId);
        throw new Error("Failed to create and then retrieve user profile.");
      }
      return newSnap.data();
    } catch (error) {
      // console.error("getOrCreateUserProfile Error: During setDoc or subsequent getDoc for userId:", userId, error);
      throw error; 
    }
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
  const { email, createdAt, ...updatableData } = profileData as any; 
  
  const firestoreData: Partial<UserProfileFirestoreData> = {
    ...updatableData,
    updatedAt: serverTimestamp() as Timestamp 
  };

  if (updatableData.birthday && updatableData.birthday instanceof Date) {
    firestoreData.birthday = Timestamp.fromDate(updatableData.birthday);
  } else if (updatableData.hasOwnProperty('birthday') && updatableData.birthday === undefined) {
    firestoreData.birthday = undefined; 
  }
  
  // Ensure truly undefined fields are not part of the update payload
  // to avoid accidentally writing nulls if that's not intended.
  // The converter should help, but this is an extra check.
  for (const key in firestoreData) {
    if ((firestoreData as any)[key] === undefined) {
        delete (firestoreData as any)[key];
    }
  }

  await updateDoc(docRef, firestoreData);
}

export async function saveUserFCMToken(userId: string, token: string): Promise<void> {
  if (!userId || !token) {
    console.error("User ID and FCM token are required to save.");
    return;
  }
  // Store the token in a subcollection, using the token itself as the document ID
  // This automatically handles duplicates - writing the same token again just updates the timestamp.
  const tokenDocRef = doc(db, 'userProfiles', userId, 'fcmTokens', token);
  try {
    await setDoc(tokenDocRef, {
      createdAt: serverTimestamp(),
      platform: 'web' // good practice to store the platform
    });
    console.log(`FCM token saved for user ${userId}`);
  } catch (error) {
    console.error("Failed to save FCM token:", error);
    // Don't re-throw, just log it. The user doesn't need to know if this failed.
  }
}
