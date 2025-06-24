
import { db } from '@/lib/firebase/client';
import {
  collection,
  addDoc,
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
  where,
  or,
} from 'firebase/firestore';
import type { Goal, GoalFirestoreData } from '@/types';
import { addActivityLog } from './activity';
import { addUserNotification } from './notifications';

const goalConverter: FirestoreDataConverter<Goal, GoalFirestoreData> = {
  toFirestore: (goalInput: Partial<Goal>): DocumentData => {
    const data: any = { ...goalInput };
    delete data.id;

    if (goalInput.deadline && goalInput.deadline instanceof Date) {
      data.deadline = Timestamp.fromDate(goalInput.deadline);
    } else if (goalInput.hasOwnProperty('deadline') && goalInput.deadline === undefined) {
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
      officeId: data.officeId,
      creatorUserId: data.creatorUserId, 
      name: data.name,
      description: data.description,
      targetValue: data.targetValue,
      currentValue: data.currentValue,
      unit: data.unit,
      deadline: data.deadline instanceof Timestamp ? data.deadline.toDate() : undefined,
      participantIds: data.participantIds || [],
      participantsDisplay: data.participantsDisplay || "No participants",
      status: data.status,
      progress: data.progress,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  }
};

const getGoalsCollection = (officeId: string) => {
  return collection(db, 'offices', officeId, 'goals').withConverter(goalConverter);
};

const getGoalDoc = (officeId: string, goalId: string) => {
  return doc(db, 'offices', officeId, 'goals', goalId).withConverter(goalConverter);
};

export function onGoalsUpdate(officeId: string, currentUserId: string, callback: (goals: Goal[]) => void): Unsubscribe {
  if (!officeId) {
    console.error("Office ID is required to listen for goal updates.");
    callback([]);
    return () => {};
  }
  const goalsCol = getGoalsCollection(officeId);
  // This query gets all goals for an office. Filtering by participant could be done if needed.
  const q = query(goalsCol, orderBy("createdAt", "desc"));
  
  return onSnapshot(q, (snapshot) => {
    const goals = snapshot.docs.map(doc => doc.data());
    callback(goals);
  }, (error) => {
    console.error("Error listening for goal updates:", error);
    callback([]);
  });
}

export async function addGoalToOffice(
  officeId: string,
  creatorUserId: string,
  goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'creatorUserId' | 'officeId'>,
  actorName: string,
  officeName?: string
): Promise<Goal> {
  if (!officeId || !creatorUserId) throw new Error("Office ID and actor User ID are required to add a goal.");
  const goalsCol = getGoalsCollection(officeId);
  const fullGoalData = { ...goalData, officeId, creatorUserId };
  const docRef = await addDoc(goalsCol, fullGoalData as Goal); 
  
  const newDocSnap = await getDoc(docRef);
  if (!newDocSnap.exists()) {
    throw new Error("Failed to create and retrieve goal.");
  }
  const newGoal = newDocSnap.data()!;

  addActivityLog(officeId, {
    type: "goal-new",
    title: `New Goal Set: ${newGoal.name}`,
    description: `Target: ${newGoal.targetValue} ${newGoal.unit}. Set by ${actorName}. Participants: ${newGoal.participantsDisplay || 'None'}`,
    iconName: "Target",
    actorId: creatorUserId,
    actorName,
    entityId: newGoal.id,
    entityType: "goal",
  });

  if (newGoal.participantIds && newGoal.participantIds.length > 0) {
      for (const participantId of newGoal.participantIds) {
          if (participantId !== creatorUserId) {
              try {
                  await addUserNotification(participantId, {
                      type: "goal-new",
                      title: `New Goal in ${officeName || 'Office'}: ${newGoal.name}`,
                      message: `${actorName} set a new goal: "${newGoal.name}". You are a participant.`,
                      link: `/goals?officeId=${officeId}`, 
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
  return newGoal;
}

export async function updateGoalInOffice(
  officeId: string,
  goalId: string, 
  goalData: Partial<Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'creatorUserId' | 'officeId'>>,
  actorName: string,
  actorId: string,
  officeName?: string
): Promise<void> {
  if (!officeId || !goalId) throw new Error("Office ID and Goal ID are required for update.");
  const goalDocRef = getGoalDoc(officeId, goalId);
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
      actorId: actorId,
      actorName,
      entityId: goalId,
      entityType: "goal",
    });

    const involvedUserIds = new Set<string>();
    if (originalGoal.participantIds) originalGoal.participantIds.forEach(id => involvedUserIds.add(id));
    if (goalData.participantIds) goalData.participantIds.forEach(id => involvedUserIds.add(id));

    for (const notifiedUserId of involvedUserIds) {
      if (notifiedUserId !== actorId) { 
        try {
            await addUserNotification(notifiedUserId, {
                type: "goal-updated",
                title: `Goal Update in ${officeName || 'Office'}: ${originalGoal.name}`,
                message: activityDescription,
                link: `/goals?officeId=${officeId}`,
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

export async function deleteGoalFromOffice(officeId: string, goalId: string, actorId: string, actorName: string): Promise<void> {
  if (!officeId || !goalId) throw new Error("Office ID and Goal ID are required for delete.");
  const goalDocRef = getGoalDoc(officeId, goalId);
  const goalSnap = await getDoc(goalDocRef);
  if (!goalSnap.exists()) throw new Error("Goal not found for deletion.");
  
  await deleteDoc(goalDocRef);

  addActivityLog(officeId, {
    type: 'goal-new', // Should be 'goal-deleted' but using existing type
    title: `Goal Deleted: ${goalSnap.data().name}`,
    description: `Deleted by ${actorName}`,
    iconName: 'Trash2',
    actorId: actorId,
    actorName: actorName,
    entityId: goalId,
    entityType: 'goal',
  });
}
