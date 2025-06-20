
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
    } else if (taskInput.hasOwnProperty('dueDate') && !taskInput.dueDate) {
      delete data.dueDate;
    }
    
    if (!taskInput.id) { 
        data.createdAt = serverTimestamp();
    }
    data.updatedAt = serverTimestamp();

    // Ensure assigneeIds and assigneesDisplay are handled correctly
    if (taskInput.assigneeIds && Array.isArray(taskInput.assigneeIds)) {
      data.assigneeIds = taskInput.assigneeIds;
    } else {
      delete data.assigneeIds; // Remove if not provided or invalid
    }
    if (typeof taskInput.assigneesDisplay === 'string') {
      data.assigneesDisplay = taskInput.assigneesDisplay;
    } else {
      delete data.assigneesDisplay; // Remove if not a string
    }


    return data;
  },
  fromFirestore: (snapshot, options): Task => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      name: data.name,
      assigneeIds: data.assigneeIds || [],
      assigneesDisplay: data.assigneesDisplay || "Unassigned",
      dueDate: data.dueDate instanceof Timestamp ? data.dueDate.toDate() : undefined,
      status: data.status,
      priority: data.priority,
      progress: data.progress,
      description: data.description || "",
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
      userId: snapshot.ref.parent.parent!.id, // Assuming tasks are under /users/{userId}/tasks
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
  const docRef = await addDoc(tasksCol, { ...taskData, userId: actorUserId } as Task); 
  
  const newDocSnap = await getDoc(docRef);
  if (!newDocSnap.exists()) {
    throw new Error("Failed to create and retrieve task.");
  }
  const newTask = newDocSnap.data()!;

  if (officeId) {
    addActivityLog(officeId, {
      type: "task-new",
      title: `New Task: ${newTask.name}`,
      description: `Assigned to: ${newTask.assigneesDisplay || 'Unassigned'}. Created by ${actorName}.`,
      iconName: "ListChecks",
      actorId: actorUserId,
      actorName: actorName,
      entityId: newTask.id,
      entityType: "task",
    });

    if (newTask.assigneeIds && newTask.assigneeIds.length > 0) {
      for (const assigneeId of newTask.assigneeIds) {
        if (assigneeId !== actorUserId) { 
          try {
            await addUserNotification(assigneeId, {
              type: "task-new",
              title: `New Task in ${officeName || 'Office'}: ${newTask.name}`,
              message: `${actorName} assigned you a new task: "${newTask.name}".`,
              link: `/tasks/${newTask.id}`, 
              officeId: officeId,
              actorName: actorName,
              entityId: newTask.id,
              entityType: "task"
            });
          } catch (error) {
            console.error(`Failed to send task creation notification to assignee ${assigneeId}:`, error);
          }
        }
      }
    }
  }

  return newTask;
}

export async function updateTaskForUser(
  userId: string, 
  taskId: string, 
  taskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>,
  actorName: string,
  officeId?: string,
  officeName?: string
): Promise<void> {
  if (!userId || !taskId) throw new Error("User ID and Task ID are required for update.");
  const taskDocRef = getTaskDoc(userId, taskId);
  const originalTaskSnap = await getDoc(taskDocRef);
  const originalTask = originalTaskSnap.exists() ? originalTaskSnap.data() : null;

  const updatePayload: any = { ...taskData };
  if (taskData.dueDate && taskData.dueDate instanceof Date) {
    updatePayload.dueDate = Timestamp.fromDate(taskData.dueDate);
  } else if (taskData.hasOwnProperty('dueDate') && !taskData.dueDate) {
    updatePayload.dueDate = undefined; 
  }
  
  await updateDoc(taskDocRef, updatePayload);

  if (officeId && originalTask) {
    let activityType: "task-completed" | "task-status-update" = "task-status-update";
    let activityTitle = `Task Update: ${originalTask.name}`;
    let activityDescription = `${actorName} updated task: "${originalTask.name}".`;
    let iconName = "Edit3";

    if (taskData.status && taskData.status !== originalTask.status) {
      activityDescription = `Status changed to ${taskData.status} by ${actorName}.`;
      if (taskData.status === "Done") {
        activityType = "task-completed";
        activityTitle = `Task Completed: ${originalTask.name}`;
        iconName = "CheckSquare";
      }
    } else if (taskData.assigneesDisplay && taskData.assigneesDisplay !== originalTask.assigneesDisplay) {
        activityDescription = `Task "${originalTask.name}" assignment changed to ${taskData.assigneesDisplay} by ${actorName}.`;
    } else if (taskData.name && taskData.name !== originalTask.name) {
        activityDescription = `Task name changed from "${originalTask.name}" to "${taskData.name}" by ${actorName}.`;
    }
    
    addActivityLog(officeId, {
      type: activityType,
      title: activityTitle,
      description: activityDescription,
      iconName: iconName,
      actorId: userId,
      actorName,
      entityId: taskId,
      entityType: "task",
    });
    
    const involvedUserIds = new Set<string>();
    if (originalTask.assigneeIds) originalTask.assigneeIds.forEach(id => involvedUserIds.add(id));
    if (taskData.assigneeIds) taskData.assigneeIds.forEach(id => involvedUserIds.add(id));

    for (const notifiedUserId of involvedUserIds) {
      if (notifiedUserId !== userId) { // Don't notify the actor
        try {
            await addUserNotification(notifiedUserId, {
                type: "task-updated",
                title: `Task Update in ${officeName || 'Office'}: ${originalTask.name}`,
                message: activityDescription,
                link: `/tasks/${taskId}`,
                officeId: officeId,
                actorName: actorName,
                entityId: taskId,
                entityType: "task"
            });
        } catch (error) {
            console.error(`Failed to send task update notification to ${notifiedUserId}:`, error);
        }
      }
    }
  }
}

export async function deleteTaskForUser(userId: string, taskId: string): Promise<void> {
  if (!userId || !taskId) throw new Error("User ID and Task ID are required for delete.");
  const taskDocRef = getTaskDoc(userId, taskId);
  await deleteDoc(taskDocRef);
  // Consider adding an activity log for deletion if officeId is available
}

export const statusColors: Record<Task["status"], string> = {
  "To Do": "bg-gray-500",
  "In Progress": "bg-blue-500",
  "Done": "bg-green-500",
  "Blocked": "bg-red-500",
};

    
