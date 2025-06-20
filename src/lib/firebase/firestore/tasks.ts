
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
    Timestamp, 
    orderBy, 
    serverTimestamp, 
    type DocumentData, 
    type FirestoreDataConverter,
    where,
    or // Added for OR queries
} from 'firebase/firestore';
import type { Task, TaskFirestoreData } from '@/types';
import { addActivityLog } from './activity';
// getMembersForOffice is not directly used here anymore for notifications, but kept for potential future use.
// import { getMembersForOffice } from './offices'; 
import { addUserNotification } from './notifications';

const taskConverter: FirestoreDataConverter<Task, TaskFirestoreData> = {
  toFirestore: (taskInput: Partial<Task>): DocumentData => {
    const data: any = { ...taskInput };
    delete data.id; 

    if (taskInput.dueDate && taskInput.dueDate instanceof Date) {
      data.dueDate = Timestamp.fromDate(taskInput.dueDate);
    } else if (taskInput.hasOwnProperty('dueDate') && !taskInput.dueDate) {
      delete data.dueDate;
    }
    
    if (!taskInput.id) { 
        data.createdAt = serverTimestamp();
    }
    data.updatedAt = serverTimestamp();

    if (taskInput.assigneeIds && Array.isArray(taskInput.assigneeIds)) {
      data.assigneeIds = taskInput.assigneeIds;
    } else {
      delete data.assigneeIds; 
    }
    if (typeof taskInput.assigneesDisplay === 'string') {
      data.assigneesDisplay = taskInput.assigneesDisplay;
    } else {
      delete data.assigneesDisplay; 
    }

    // Ensure officeId and creatorUserId are part of the data if provided
    if (taskInput.officeId) data.officeId = taskInput.officeId;
    if (taskInput.creatorUserId) data.creatorUserId = taskInput.creatorUserId;

    return data;
  },
  fromFirestore: (snapshot, options): Task => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      officeId: data.officeId, // Added
      creatorUserId: data.creatorUserId, // Added
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
    };
  }
};

// Changed: Collection path is now offices/{officeId}/tasks
const getTasksCollection = (officeId: string) => {
  if (!officeId) throw new Error("Office ID is required for task operations.");
  return collection(db, 'offices', officeId, 'tasks').withConverter(taskConverter);
};

// Changed: Document path is now offices/{officeId}/tasks/{taskId}
const getTaskDoc = (officeId: string, taskId: string) => {
  if (!officeId || !taskId) throw new Error("Office ID and Task ID are required.");
  return doc(db, 'offices', officeId, 'tasks', taskId).withConverter(taskConverter);
};

// Renamed and refactored: Fetches tasks visible to a user within a specific office
export async function getTasksVisibleToUserInOffice(officeId: string, currentUserId: string): Promise<Task[]> {
  if (!officeId || !currentUserId) throw new Error("Office ID and User ID are required to fetch tasks.");
  
  const tasksCol = getTasksCollection(officeId);
  // Query for tasks where user is creator OR an assignee
  // Firestore OR queries are limited, but this specific pattern (array-contains OR == on different fields) should work.
  const q = query(tasksCol, 
    or(
      where("creatorUserId", "==", currentUserId),
      where("assigneeIds", "array-contains", currentUserId)
    ),
    orderBy("createdAt", "desc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
}


// Renamed and refactored: Fetches a specific task by ID from an office
export async function getTaskByIdFromOffice(officeId: string, taskId: string): Promise<Task | null> {
  if (!officeId || !taskId) throw new Error("Office ID and Task ID are required.");
  const taskDocRef = getTaskDoc(officeId, taskId);
  const docSnap = await getDoc(taskDocRef);
  return docSnap.exists() ? docSnap.data() : null;
}

// Renamed and refactored: Adds a task to a specific office
export async function addTaskToOffice(
  officeId: string, 
  creatorUserId: string,
  taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'officeId' | 'creatorUserId'>,
  actorName: string, // actorName is creatorName here
  officeName?: string
): Promise<Task> {
  if (!officeId || !creatorUserId) throw new Error("Office ID and Creator User ID are required to add a task.");
  
  const tasksCol = getTasksCollection(officeId);
  const fullTaskData = { 
    ...taskData, 
    officeId: officeId, 
    creatorUserId: creatorUserId 
  };
  const docRef = await addDoc(tasksCol, fullTaskData as Task); 
  
  const newDocSnap = await getDoc(docRef);
  if (!newDocSnap.exists()) {
    throw new Error("Failed to create and retrieve task.");
  }
  const newTask = newDocSnap.data()!;

  addActivityLog(officeId, {
    type: "task-new",
    title: `New Task: ${newTask.name}`,
    description: `Assigned to: ${newTask.assigneesDisplay || 'Unassigned'}. Created by ${actorName}.`,
    iconName: "ListChecks",
    actorId: creatorUserId,
    actorName: actorName,
    entityId: newTask.id,
    entityType: "task",
  });

  if (newTask.assigneeIds && newTask.assigneeIds.length > 0) {
    for (const assigneeId of newTask.assigneeIds) {
      if (assigneeId !== creatorUserId) { 
        try {
          await addUserNotification(assigneeId, {
            type: "task-new",
            title: `New Task in ${officeName || 'Office'}: ${newTask.name}`,
            message: `${actorName} assigned you a new task: "${newTask.name}".`,
            link: `/tasks/${officeId}/${newTask.id}`, 
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
  return newTask;
}

// Renamed and refactored: Updates a task within a specific office
export async function updateTaskInOffice(
  officeId: string, 
  taskId: string, 
  taskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'officeId' | 'creatorUserId'>>,
  actorId: string, // The user performing the update
  actorName: string,
  officeName?: string
): Promise<void> {
  if (!officeId || !taskId || !actorId) throw new Error("Office ID, Task ID, and Actor ID are required for update.");
  
  const taskDocRef = getTaskDoc(officeId, taskId);
  const originalTaskSnap = await getDoc(taskDocRef);
  if (!originalTaskSnap.exists()) throw new Error("Task not found for update.");
  const originalTask = originalTaskSnap.data()!;

  const updatePayload: any = { ...taskData };
  if (taskData.dueDate && taskData.dueDate instanceof Date) {
    updatePayload.dueDate = Timestamp.fromDate(taskData.dueDate);
  } else if (taskData.hasOwnProperty('dueDate') && !taskData.dueDate) {
    updatePayload.dueDate = undefined; 
  }
  updatePayload.updatedAt = serverTimestamp();
  
  await updateDoc(taskDocRef, updatePayload);

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
    actorId: actorId,
    actorName,
    entityId: taskId,
    entityType: "task",
  });
  
  const involvedUserIds = new Set<string>();
  if (originalTask.creatorUserId) involvedUserIds.add(originalTask.creatorUserId);
  if (originalTask.assigneeIds) originalTask.assigneeIds.forEach(id => involvedUserIds.add(id));
  if (taskData.assigneeIds) taskData.assigneeIds.forEach(id => involvedUserIds.add(id));
  // Also notify the new assignees if they changed
  if (updatePayload.assigneeIds) updatePayload.assigneeIds.forEach((id: string) => involvedUserIds.add(id));


  for (const notifiedUserId of involvedUserIds) {
    if (notifiedUserId !== actorId) { 
      try {
          await addUserNotification(notifiedUserId, {
              type: "task-updated",
              title: `Task Update in ${officeName || 'Office'}: ${originalTask.name}`,
              message: activityDescription,
              link: `/tasks/${officeId}/${taskId}`,
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

// Renamed and refactored: Deletes a task from a specific office
export async function deleteTaskFromOffice(
  officeId: string, 
  taskId: string,
  actorId: string, // The user performing the delete
  actorName: string
): Promise<void> {
  if (!officeId || !taskId || !actorId) throw new Error("Office ID, Task ID, and Actor ID are required for delete.");
  const taskDocRef = getTaskDoc(officeId, taskId);
  const taskSnap = await getDoc(taskDocRef);
  if (!taskSnap.exists()) throw new Error("Task not found for deletion.");
  const taskName = taskSnap.data()?.name || "Unknown Task";

  await deleteDoc(taskDocRef);
  
  addActivityLog(officeId, {
    type: "task-new", // Consider a "task-deleted" type
    title: `Task Deleted: ${taskName}`,
    description: `Task "${taskName}" was deleted by ${actorName}.`,
    iconName: "Trash2",
    actorId: actorId,
    actorName: actorName,
    entityId: taskId,
    entityType: "task",
  });
}

export const statusColors: Record<Task["status"], string> = {
  "To Do": "bg-gray-500",
  "In Progress": "bg-blue-500",
  "Done": "bg-green-500",
  "Blocked": "bg-red-500",
};
