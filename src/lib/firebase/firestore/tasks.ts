
import { db } from '@/lib/firebase/client';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, Timestamp, orderBy, serverTimestamp, type DocumentData, type FirestoreDataConverter } from 'firebase/firestore';
import type { Task, TaskFirestoreData } from '@/types';
import { addActivityLog } from './activity';
import { getMembersForOffice } from './offices';
import { addUserNotification } from './notifications';

const taskConverter: FirestoreDataConverter<Task, TaskFirestoreData> = {
  toFirestore: (taskInput: Partial<Task>): DocumentData => {
    const data: any = { ...taskInput };
    delete data.id;
    delete data.userId;

    if (taskInput.dueDate && taskInput.dueDate instanceof Date) {
      data.dueDate = Timestamp.fromDate(taskInput.dueDate);
    }
    
    if (!taskInput.id) { 
        data.createdAt = serverTimestamp();
    }
    data.updatedAt = serverTimestamp();
    return data;
  },
  fromFirestore: (snapshot, options): Task => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      name: data.name,
      assignedTo: data.assignedTo,
      dueDate: data.dueDate instanceof Timestamp ? data.dueDate.toDate() : new Date(),
      status: data.status,
      priority: data.priority,
      progress: data.progress,
      description: data.description || "",
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  }
};

const getTasksCollection = (userId: string) => {
  return collection(db, 'users', userId, 'tasks').withConverter(taskConverter);
};

const getTaskDoc = (userId: string, taskId: string) => {
  return doc(db, 'users', userId, 'tasks', taskId).withConverter(taskConverter);
};

export async function getTasksForUser(userId: string): Promise<Task[]> {
  if (!userId) throw new Error("User ID is required to fetch tasks.");
  const tasksCol = getTasksCollection(userId);
  const q = query(tasksCol, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
}

export async function getTaskByIdForUser(userId: string, taskId: string): Promise<Task | null> {
  if (!userId || !taskId) throw new Error("User ID and Task ID are required.");
  const taskDocRef = getTaskDoc(userId, taskId);
  const docSnap = await getDoc(taskDocRef);
  return docSnap.exists() ? docSnap.data() : null;
}

export async function addTaskForUser(
  actorUserId: string, 
  taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
  actorName: string,
  officeId?: string,
  officeName?: string
): Promise<Task> {
  if (!actorUserId) throw new Error("Actor User ID is required to add a task.");
  const tasksCol = getTasksCollection(actorUserId);
  const docRef = await addDoc(tasksCol, taskData as Task); 
  
  const newDocSnap = await getDoc(docRef);
  if (!newDocSnap.exists()) {
    throw new Error("Failed to create and retrieve task.");
  }
  const newTask = newDocSnap.data()!;

  if (officeId) {
    addActivityLog(officeId, {
      type: "task-new",
      title: `New Task: ${newTask.name}`,
      description: `Assigned to: ${newTask.assignedTo || 'Unassigned'} by ${actorName}`,
      iconName: "ListChecks",
      actorId: actorUserId,
      actorName: actorName,
      entityId: newTask.id,
      entityType: "task",
    });

    try {
      const members = await getMembersForOffice(officeId);
      for (const member of members) {
        if (member.userId !== actorUserId) { 
          await addUserNotification(member.userId, {
            type: "task-new",
            title: `New Task in ${officeName || 'Office'}: ${newTask.name}`,
            message: `${actorName} created task: "${newTask.name}". Assigned to: ${newTask.assignedTo || 'Unassigned'}.`,
            link: `/tasks/${newTask.id}`, 
            officeId: officeId,
            actorName: actorName,
            entityId: newTask.id,
            entityType: "task"
          });
        }
      }
    } catch (error) {
      console.error("Failed to send task creation notifications for office members:", error);
    }
  }

  return newTask;
}

export async function updateTaskForUser(
  userId: string, 
  taskId: string, 
  taskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>,
  actorName: string,
  officeId?: string 
): Promise<void> {
  if (!userId || !taskId) throw new Error("User ID and Task ID are required for update.");
  const taskDocRef = getTaskDoc(userId, taskId);
  const originalTaskSnap = await getDoc(taskDocRef);
  const originalTask = originalTaskSnap.exists() ? originalTaskSnap.data() : null;

  const updatePayload: any = { ...taskData };
  if (taskData.dueDate && taskData.dueDate instanceof Date) {
    updatePayload.dueDate = Timestamp.fromDate(taskData.dueDate);
  }
  await updateDoc(taskDocRef, updatePayload);

  if (officeId && originalTask) {
    if (taskData.status && taskData.status !== originalTask.status) {
      const activityType = taskData.status === "Done" ? "task-completed" : "task-status-update";
      const iconName = taskData.status === "Done" ? "CheckSquare" : "Edit3";
      addActivityLog(officeId, {
        type: activityType,
        title: `Task ${taskData.status === "Done" ? 'Completed' : 'Update'}: ${originalTask.name}`,
        description: `Status changed to ${taskData.status} by ${actorName}`,
        iconName: iconName,
        actorId: userId,
        actorName,
        entityId: taskId,
        entityType: "task",
      });
    }
  }
}

export async function deleteTaskForUser(userId: string, taskId: string): Promise<void> {
  if (!userId || !taskId) throw new Error("User ID and Task ID are required for delete.");
  const taskDocRef = getTaskDoc(userId, taskId);
  await deleteDoc(taskDocRef);
}

export const statusColors: Record<Task["status"], string> = {
  "To Do": "bg-gray-500",
  "In Progress": "bg-blue-500",
  "Done": "bg-green-500",
  "Blocked": "bg-red-500",
};

