
"use client";

import { type Task } from "@/types"; // Assuming Task type might be moved or already in types

// If Task interface is not in types/index.ts, define it here:
// export interface Task {
//   id: string;
//   name: string;
//   assignedTo: string;
//   dueDate: Date;
//   status: "To Do" | "In Progress" | "Done" | "Blocked";
//   priority: "Low" | "Medium" | "High";
//   progress: number;
//   description?: string;
// }

export let mockTasks: Task[] = [
  { id: "1", name: "Design homepage UI", assignedTo: "Alice", dueDate: new Date(new Date().setDate(new Date().getDate() + 5)), status: "In Progress", priority: "High", progress: 60, description: "Create high-fidelity mockups for the new homepage." },
  { id: "2", name: "Develop API endpoints", assignedTo: "Bob", dueDate: new Date(new Date().setDate(new Date().getDate() + 10)), status: "To Do", priority: "High", progress: 10, description: "Implement RESTful APIs for user authentication and data retrieval." },
  { id: "3", name: "Write user documentation", assignedTo: "Charlie", dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), status: "To Do", priority: "Medium", progress: 0, description: "Draft user guides and tutorials for the new features." },
  { id: "4", name: "Test payment gateway", assignedTo: "David", dueDate: new Date(new Date().setDate(new Date().getDate() + 3)), status: "Done", priority: "High", progress: 100, description: "Thoroughly test the new payment integration." },
  { id: "5", name: "Setup CI/CD pipeline", assignedTo: "Eve", dueDate: new Date(new Date().setDate(new Date().getDate() + 12)), status: "Blocked", priority: "Medium", progress: 30, description: "Configure continuous integration and deployment pipeline. Blocked by server access." },
];

export const statusColors: Record<Task["status"], string> = {
  "To Do": "bg-gray-500",
  "In Progress": "bg-blue-500",
  "Done": "bg-green-500",
  "Blocked": "bg-red-500",
};

export function getTaskById(id: string): Task | undefined {
  return mockTasks.find(task => task.id === id);
}

export function addTask(newTaskData: Omit<Task, 'id'>): Task {
  const newTask: Task = { ...newTaskData, id: Date.now().toString() };
  mockTasks.unshift(newTask); // Add to the beginning
  return newTask;
}

export function updateTask(updatedTask: Task): boolean {
  const index = mockTasks.findIndex(task => task.id === updatedTask.id);
  if (index !== -1) {
    mockTasks[index] = updatedTask;
    return true;
  }
  return false;
}

export function deleteTask(taskId: string): boolean {
  const initialLength = mockTasks.length;
  mockTasks = mockTasks.filter(task => task.id !== taskId);
  return mockTasks.length < initialLength;
}
