
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
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Goal, GoalFirestoreData } from '@/types';
import { addActivityLog } from './activity';
import { getMembersForOffice } from './offices'; 
import { addUserNotification } from './notifications';

const goalConverter: FirestoreDataConverter<Goal, GoalFirestoreData> = {
  toFirestore: (goalInput: Partial<Goal>): DocumentData => {
    const data: any = { ...goalInput };
    delete data.id;

    if (goalInput.deadline && goalInput.deadline instanceof Date) {
      data.deadline = Timestamp.fromDate(goalInput.deadline);
    }
    if (goalInput.hasOwnProperty('deadline') && goalInput.deadline === undefined) {
      delete data.deadline;
    }
    
    if (goalInput.participantIds && Array.isArray(goalInput.participantIds)) {
      data.participantIds = goalInput.participantIds;
    } else {
      delete data.participantIds;
    }

    if (typeof goalInput.participantsDisplay === 'string') {
        data.participantsDisplay = goalInput.participantsDisplay;
    } else {
        delete data.participantsDisplay;
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
      participantIds: data.participantIds || [],
      participantsDisplay: data.participantsDisplay || "No participants",
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
      creatorUserId: data.creatorUserId, 
    };
  }
};

const getGoalsCollection = (userId: string) => {
  return collection(db, 'users', userId, 'goals').withConverter(goalConverter);
};

const getGoalDoc = (userId: string, goalId: string) => {
  return doc(db, 'users', userId, 'goals', goalId).withConverter(goalConverter);
};

export function onGoalsUpdate(userId: string, callback: (goals: Goal[]) => void): Unsubscribe {
  if (!userId) {
    console.error("User ID is required to listen for goal updates.");
    callback([]);
    return () => {};
  }
  const goalsCol = getGoalsCollection(userId);
  const q = query(goalsCol, orderBy("createdAt", "desc"));
  
  return onSnapshot(q, (snapshot) => {
    const goals = snapshot.docs.map(doc => doc.data());
    callback(goals);
  }, (error) => {
    console.error("Error listening for goal updates:", error);
    callback([]);
  });
}

export async function addGoalForUser(
  actorUserId: string, 
  goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'creatorUserId'>,
  actorName: string,
  officeId?: string,
  officeName?: string
): Promise<Goal> {
  if (!actorUserId) throw new Error("Actor User ID is required to add a goal.");
  const goalsCol = getGoalsCollection(actorUserId);
  const fullGoalData = { ...goalData, creatorUserId: actorUserId };
  const docRef = await addDoc(goalsCol, fullGoalData as Goal); 
  
  const newDocSnap = await getDoc(docRef);
  if (!newDocSnap.exists()) {
    throw new Error("Failed to create and retrieve goal.");
  }
  const newGoal = newDocSnap.data()!;

  if (officeId) {
    addActivityLog(officeId, {
      type: "goal-new",
      title: `New Goal Set: ${newGoal.name}`,
      description: `Target: ${newGoal.targetValue} ${newGoal.unit}. Set by ${actorName}. Participants: ${newGoal.participantsDisplay || 'None'}`,
      iconName: "Target",
      actorId: actorUserId,
      actorName,
      entityId: newGoal.id,
      entityType: "goal",
    });

    if (newGoal.participantIds && newGoal.participantIds.length > 0) {
        for (const participantId of newGoal.participantIds) {
            if (participantId !== actorUserId) {
                try {
                    await addUserNotification(participantId, {
                        type: "goal-new",
                        title: `New Goal in ${officeName || 'Office'}: ${newGoal.name}`,
                        message: `${actorName} set a new goal: "${newGoal.name}". You are a participant.`,
                        link: `/goals`, 
                        officeId: officeId,
                        actorName: actorName,
                        entityId: newGoal.id,
                        entityType: "goal"
                    });
                } catch (error) {
                    console.error(`Failed to send goal creation notification to participant ${participantId}:`, error);
                }
            }
        }
    }
  }
  return newGoal;
}

export async function updateGoalForUser(
  userId: string, 
  goalId: string, 
  goalData: Partial<Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'creatorUserId'>>,
  actorName: string,
  officeId?: string,
  officeName?: string
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

  if (officeId && originalGoal) {
    let activityType: "goal-achieved" | "goal-progress-update" = "goal-progress-update";
    let activityTitle = `Goal Update: ${originalGoal.name}`;
    let activityDescription = `${actorName} updated the goal "${originalGoal.name}".`;
    let iconName = "TrendingUp";

    if (goalData.currentValue !== undefined && goalData.currentValue !== originalGoal.currentValue) {
      const progress = (goalData.currentValue / originalGoal.targetValue) * 100;
      const isAchieved = progress >= 100 && !originalGoal.unit.toLowerCase().includes("lower is better") || (originalGoal.unit.toLowerCase().includes("lower is better") && goalData.currentValue <= originalGoal.targetValue);
      
      activityDescription = `Progress: ${goalData.currentValue} / ${originalGoal.targetValue} ${originalGoal.unit} (${Math.round(progress)}%). Updated by ${actorName}.`;
      if(isAchieved) {
        activityType = "goal-achieved";
        activityTitle = `Goal Achieved: ${originalGoal.name}`;
        iconName = "CheckSquare";
      }
    } else if (goalData.participantsDisplay && goalData.participantsDisplay !== originalGoal.participantsDisplay) {
        activityDescription = `Participants for goal "${originalGoal.name}" updated to: ${goalData.participantsDisplay || 'None'}. By ${actorName}.`;
    }
    
    addActivityLog(officeId, {
      type: activityType,
      title: activityTitle,
      description: activityDescription,
      iconName: iconName,
      actorId: userId,
      actorName,
      entityId: goalId,
      entityType: "goal",
    });

    const involvedUserIds = new Set<string>();
    if (originalGoal.participantIds) originalGoal.participantIds.forEach(id => involvedUserIds.add(id));
    if (goalData.participantIds) goalData.participantIds.forEach(id => involvedUserIds.add(id));

    for (const notifiedUserId of involvedUserIds) {
      if (notifiedUserId !== userId) { 
        try {
            await addUserNotification(notifiedUserId, {
                type: "goal-updated",
                title: `Goal Update in ${officeName || 'Office'}: ${originalGoal.name}`,
                message: activityDescription,
                link: `/goals`,
                officeId: officeId,
                actorName: actorName,
                entityId: goalId,
                entityType: "goal"
            });
        } catch (error) {
            console.error(`Failed to send goal update notification to ${notifiedUserId}:`, error);
        }
      }
    }
  }
}

export async function deleteGoalForUser(userId: string, goalId: string): Promise<void> {
  if (!userId || !goalId) throw new Error("User ID and Goal ID are required for delete.");
  const goalDocRef = getGoalDoc(userId, goalId);
  await deleteDoc(goalDocRef);
}
