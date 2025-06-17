
import type { LucideIcon } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon | React.ElementType;
  label?: string;
  disabled?: boolean;
  external?: boolean;
  variant?: "default" | "ghost";
  children?: NavItem[];
}

export interface Task {
  id: string; // Firestore document ID
  name: string;
  assignedTo: string;
  dueDate: Date; // Converted from Firestore Timestamp client-side
  status: "To Do" | "In Progress" | "Done" | "Blocked";
  priority: "Low" | "Medium" | "High";
  progress: number;
  description?: string;
  createdAt?: Date; // Converted from Firestore Timestamp
  updatedAt?: Date; // Converted from Firestore Timestamp
}

// For writing to Firestore, we might use a slightly different type
// if we're sending Timestamps directly. The converter handles this.
export type TaskFirestoreData = Omit<Task, 'id' | 'dueDate' | 'createdAt' | 'updatedAt'> & {
  dueDate: Timestamp;
  createdAt?: Timestamp; // Optional if using serverTimestamp on creation
  updatedAt?: Timestamp; // Optional if using serverTimestamp on update
};
