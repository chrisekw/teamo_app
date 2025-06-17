
// This file is deprecated for task data management.
// Task data is now managed by src/lib/firebase/firestore/tasks.ts
// Mock tasks and related functions have been removed.

// We can keep statusColors here if it's used by UI components directly
// or move it to a more general UI constants file. For now, it's also available
// in src/lib/firebase/firestore/tasks.ts
import type { Task } from "@/types";

export const statusColors: Record<Task["status"], string> = {
  "To Do": "bg-gray-500",
  "In Progress": "bg-blue-500",
  "Done": "bg-green-500",
  "Blocked": "bg-red-500",
};

// If you have other general, non-Firebase related data utilities, 
// they can remain here. Otherwise, this file might be removable
// if statusColors is relocated.
