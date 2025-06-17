
import { db, auth } from '@/lib/firebase/client';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, Timestamp, orderBy, serverTimestamp, type DocumentData, type FirestoreDataConverter } from 'firebase/firestore';
import type { Task } from '@/types';

// Firestore data converter
const taskConverter: FirestoreDataConverter<Task> = {
  toFirestore: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: any, updatedAt?: any }): DocumentData => {
    const data: any = { ...task };
    if (task.dueDate && task.dueDate instanceof Date) {
      data.dueDate = Timestamp.fromDate(task.dueDate);
    }
    if (!task.id) { // For new tasks
        data.createdAt = serverTimestamp();
    }
    data.updatedAt = serverTimestamp();
    return data;
  },
  fromFirestore: (snapshot, options): Task => {
    const data = snapshot.data(options);
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

export async function addTaskForUser(userId: string, taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  if (!userId) throw new Error("User ID is required to add a task.");
  const tasksCol = getTasksCollection(userId);
  // Firestore converter handles timestamp conversions and serverTimestamps
  const docRef = await addDoc(tasksCol, taskData); 
  
  // Fetch the newly created document to get its data including server-generated timestamps
  const newDocSnap = await getDoc(docRef.withConverter(taskConverter));
  if (!newDocSnap.exists()) {
    throw new Error("Failed to create and retrieve task.");
  }
  return newDocSnap.data();
}

export async function updateTaskForUser(userId: string, taskId: string, taskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  if (!userId || !taskId) throw new Error("User ID and Task ID are required for update.");
  const taskDocRef = getTaskDoc(userId, taskId);
  const updatePayload: any = { ...taskData };
   if (taskData.dueDate && taskData.dueDate instanceof Date) {
      updatePayload.dueDate = Timestamp.fromDate(taskData.dueDate);
    }
  updatePayload.updatedAt = serverTimestamp(); // Ensure updatedAt is always set
  await updateDoc(taskDocRef, updatePayload);
}

export async function deleteTaskForUser(userId: string, taskId: string): Promise<void> {
  if (!userId || !taskId) throw new Error("User ID and Task ID are required for delete.");
  const taskDocRef = getTaskDoc(userId, taskId);
  await deleteDoc(taskDocRef);
}

// Status colors can be co-located or imported from a central UI config
export const statusColors: Record<Task["status"], string> = {
  "To Do": "bg-gray-500",
  "In Progress": "bg-blue-500",
  "Done": "bg-green-500",
  "Blocked": "bg-red-500",
};
