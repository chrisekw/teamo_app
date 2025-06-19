
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
import { addActivityLog } from './activity';
import { getMembersForOffice } from './offices';
import { addUserNotification } from './notifications';

const goalConverter: FirestoreDataConverter<Goal, GoalFirestoreData> = {
  toFirestore: (goalInput: Partial<Goal>): DocumentData => {
    const data: any = { ...goalInput };
    delete data.id;
    delete data.userId;

    if (goalInput.deadline && goalInput.deadline instanceof Date) {
      data.deadline = Timestamp.fromDate(goalInput.deadline);
    }
    
    if (!goalInput.id) { 
      data.createdAt = serverTimestamp();
    }
    data.updatedAt = serverTimestamp();
    
    return data;
  },
  fromFirestore: (snapshot, options): Goal => {
    const data = snapshot.data(options)!; 
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

export async function addGoalForUser(
  actorUserId: string, 
  goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
  actorName: string,
  officeId?: string,
  officeName?: string
): Promise<Goal> {
  if (!actorUserId) throw new Error("Actor User ID is required to add a goal.");
  const goalsCol = getGoalsCollection(actorUserId);
  const docRef = await addDoc(goalsCol, goalData as Goal); 
  
  const newDocSnap = await getDoc(docRef);
  if (!newDocSnap.exists()) {
    throw new Error("Failed to create and retrieve goal.");
  }
  const newGoal = newDocSnap.data()!;

  if (officeId) {
    addActivityLog(officeId, {
      type: "goal-new",
      title: `New Goal Set: ${newGoal.name}`,
      description: `Target: ${newGoal.targetValue} ${newGoal.unit}. Set by ${actorName}.`,
      iconName: "Target",
      actorId: actorUserId,
      actorName,
      entityId: newGoal.id,
      entityType: "goal",
    });

    try {
      const members = await getMembersForOffice(officeId);
      for (const member of members) {
        if (member.userId !== actorUserId) { 
          await addUserNotification(member.userId, {
            type: "goal-new",
            title: `New Goal in ${officeName || 'Office'}: ${newGoal.name}`,
            message: `${actorName} set a new goal: "${newGoal.name}". Target: ${newGoal.targetValue} ${newGoal.unit}.`,
            link: `/goals`, 
            officeId: officeId,
            actorName: actorName,
            entityId: newGoal.id,
            entityType: "goal"
          });
        }
      }
    } catch (error) {
      console.error("Failed to send goal creation notifications for office members:", error);
    }
  }
  return newGoal;
}

export async function updateGoalForUser(
  userId: string, 
  goalId: string, 
  goalData: Partial<Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>,
  actorName: string,
  officeId?: string
): Promise<void> {
  if (!userId || !goalId) throw new Error("User ID and Goal ID are required for update.");
  const goalDocRef = getGoalDoc(userId, goalId);
  const originalGoalSnap = await getDoc(goalDocRef);
  const originalGoal = originalGoalSnap.exists() ? originalGoalSnap.data() : null;

  const updatePayload: Partial<GoalFirestoreData> = { ...goalData } as Partial<GoalFirestoreData>;
  if (goalData.deadline && goalData.deadline instanceof Date) {
    updatePayload.deadline = Timestamp.fromDate(goalData.deadline);
  } else if (goalData.hasOwnProperty('deadline') && goalData.deadline === undefined) {
    // Handled by converter or could use deleteField()
  }
  
  await updateDoc(goalDocRef, updatePayload);

  if (officeId && originalGoal && goalData.currentValue !== undefined && goalData.currentValue !== originalGoal.currentValue) {
    const progress = (goalData.currentValue / originalGoal.targetValue) * 100;
    const isAchieved = progress >= 100 && !originalGoal.unit.toLowerCase().includes("lower is better") || (originalGoal.unit.toLowerCase().includes("lower is better") && goalData.currentValue <= originalGoal.targetValue);


    addActivityLog(officeId, {
      type: isAchieved ? "goal-achieved" : "goal-progress-update",
      title: isAchieved ? `Goal Achieved: ${originalGoal.name}` : `Goal Update: ${originalGoal.name}`,
      description: `Progress: ${goalData.currentValue} / ${originalGoal.targetValue} ${originalGoal.unit} (${Math.round(progress)}%). Updated by ${actorName}.`,
      iconName: isAchieved ? "CheckSquare" : "TrendingUp",
      actorId: userId,
      actorName,
      entityId: goalId,
      entityType: "goal",
    });
  }
}

export async function deleteGoalForUser(userId: string, goalId: string): Promise<void> {
  if (!userId || !goalId) throw new Error("User ID and Goal ID are required for delete.");
  const goalDocRef = getGoalDoc(userId, goalId);
  await deleteDoc(goalDocRef);
}

