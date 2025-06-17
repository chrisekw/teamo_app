
import type { LucideIcon } from 'lucide-react';

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
  id: string;
  name: string;
  assignedTo: string;
  dueDate: Date;
  status: "To Do" | "In Progress" | "Done" | "Blocked";
  priority: "Low" | "Medium" | "High";
  progress: number;
  description?: string;
}
