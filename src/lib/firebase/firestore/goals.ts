
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
import type { Goal, GoalFirestoreData } from '@/types';

// Firestore data converter for Goal
const goalConverter: FirestoreDataConverter<Goal, GoalFirestoreData> = {
  toFirestore: (goalInput: Partial<Goal>): DocumentData => {
    const data: any = { ...goalInput };
    delete data.id; // ID is not stored in the document data itself

    if (goalInput.deadline && goalInput.deadline instanceof Date) {
      data.deadline = Timestamp.fromDate(goalInput.deadline);
    } else if (goalInput.deadline === undefined && data.deadline !== undefined) {
      // If deadline is explicitly set to undefined, prepare to remove it or handle accordingly
      // For serverTimestamp based updates, it might be better to explicitly use deleteField()
      // For now, if it's undefined on input, it won't be included or will be whatever it was
    }


    // Handle createdAt for new documents, updatedAt for all writes
    if (!goalInput.id) { // Assuming new goal if no ID
      data.createdAt = serverTimestamp();
    }
    data.updatedAt = serverTimestamp();
    
    return data;
  },
  fromFirestore: (snapshot, options): Goal => {
    const data = snapshot.data(options)!; // data() will not be undefined with a converter
    return {
      id: snapshot.id,
      name: data.name,
      description: data.description,
      targetValue: data.targetValue,
      currentValue: data.currentValue,
      unit: data.unit,
      deadline: data.deadline instanceof Timestamp ? data.deadline.toDate() : undefined,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  }
};

const getGoalsCollection = (userId: string) => {
  return collection(db, 'users', userId, 'goals').withConverter(goalConverter);
};

const getGoalDoc = (userId: string, goalId: string) => {
  return doc(db, 'users', userId, 'goals', goalId).withConverter(goalConverter);
};

export async function getGoalsForUser(userId: string): Promise<Goal[]> {
  if (!userId) throw new Error("User ID is required to fetch goals.");
  const goalsCol = getGoalsCollection(userId);
  const q = query(goalsCol, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
}

export async function addGoalForUser(userId: string, goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> {
  if (!userId) throw new Error("User ID is required to add a goal.");
  const goalsCol = getGoalsCollection(userId);
  // The converter handles timestamp conversions and serverTimestamps
  const docRef = await addDoc(goalsCol, goalData as Goal); // Cast to Goal for converter, ID handled by Firestore
  
  const newDocSnap = await getDoc(docRef); // Re-fetch to get server-generated fields
  if (!newDocSnap.exists()) {
    throw new Error("Failed to create and retrieve goal.");
  }
  return newDocSnap.data()!;
}

export async function updateGoalForUser(userId: string, goalId: string, goalData: Partial<Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  if (!userId || !goalId) throw new Error("User ID and Goal ID are required for update.");
  const goalDocRef = getGoalDoc(userId, goalId);
  const updatePayload: Partial<GoalFirestoreData> = { ...goalData } as Partial<GoalFirestoreData>;

  if (goalData.deadline && goalData.deadline instanceof Date) {
    updatePayload.deadline = Timestamp.fromDate(goalData.deadline);
  } else if (goalData.hasOwnProperty('deadline') && goalData.deadline === undefined) {
     // If deadline is explicitly set to undefined, it will be removed if using {merge: true} or handled by converter
     // Or use deleteField() if specifically removing. For now, converter path handles undefined.
  }
  
  // `updatedAt` is handled by the converter
  await updateDoc(goalDocRef, updatePayload);
}

export async function deleteGoalForUser(userId: string, goalId: string): Promise<void> {
  if (!userId || !goalId) throw new Error("User ID and Goal ID are required for delete.");
  const goalDocRef = getGoalDoc(userId, goalId);
  await deleteDoc(goalDocRef);
}
