
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

// --- Task Management Types ---
export interface Task {
  id: string;
  name: string;
  assignedTo: string;
  dueDate: Date;
  status: "To Do" | "In Progress" | "Done" | "Blocked";
  priority: "Low" | "Medium" | "High";
  progress: number;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  userId?: string;
}

export type TaskFirestoreData = Omit<Task, 'id' | 'dueDate' | 'createdAt' | 'updatedAt' | 'userId'> & {
  dueDate: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};


// --- Goal Tracker Types ---
export interface Goal {
  id: string;
  name: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  userId?: string;
}

export type GoalFirestoreData = Omit<Goal, 'id' | 'deadline' | 'createdAt' | 'updatedAt' | 'userId'> & {
  deadline?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

// --- Meetings Types ---
export interface Meeting {
  id: string;
  title: string;
  dateTime: Date;
  durationMinutes: number;
  participants: string[];
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  userId?: string;
}

export type MeetingFirestoreData = Omit<Meeting, 'id' | 'dateTime' | 'createdAt' | 'updatedAt' | 'userId'> & {
  dateTime: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};


// --- Office Designer Types ---
export type RoomType = "Team Hub" | "Meeting Room" | "Focus Booth" | "Social Lounge";
export type MemberRole = "Owner" | "Admin" | "Member";

export interface Office {
  id: string;
  name: string;
  ownerId: string;
  invitationCode: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type OfficeFirestoreData = Omit<Office, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  iconName: string;
  officeId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type RoomFirestoreData = Omit<Room, 'id' | 'officeId' | 'createdAt' | 'updatedAt'> & {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export interface OfficeMember {
  userId: string;
  name: string;
  role: MemberRole;
  avatarUrl?: string;
  joinedAt?: Date;
}

export type OfficeMemberFirestoreData = Omit<OfficeMember, 'joinedAt'> & {
  joinedAt?: Timestamp;
};

// --- Activity Log Types ---
export type ActivityType =
  | "task-new" | "task-status-update" | "task-completed"
  | "goal-new" | "goal-progress-update" | "goal-achieved"
  | "meeting-new"
  | "office-created" | "member-join" | "room-new";

export interface ActivityLogItem {
  id: string;
  officeId: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  iconName: string;
  actorName?: string;
  actorId?: string;
  entityId?: string;
  entityType?: 'task' | 'goal' | 'meeting' | 'member' | 'room' | 'office';
}

export type ActivityLogItemFirestoreData = Omit<ActivityLogItem, 'id' | 'timestamp'> & {
  timestamp: Timestamp;
};


// --- Chat Types ---
export interface ChatUser {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  avatarUrl?: string;
  type?: 'text' | 'voice_note' | 'call_event';
  callDuration?: string;
  voiceNoteDuration?: string;
  chatThreadId: string;
  createdAt?: Date;
}

export type ChatMessageFirestoreData = Omit<ChatMessage, 'id' | 'timestamp' | 'createdAt'> & {
  timestamp: Timestamp;
  createdAt?: Timestamp;
};

export interface ChatThread {
  id: string;
  participantIds: string[];
  lastMessage?: Pick<ChatMessage, 'text' | 'senderName' | 'timestamp'>;
  updatedAt?: Date;
}

export type ChatThreadFirestoreData = Omit<ChatThread, 'id' | 'lastMessage' | 'updatedAt'> & {
  lastMessage?: {
      text: string;
      senderName: string;
      timestamp: Timestamp;
  };
  updatedAt?: Timestamp;
};

// --- User Notification Types ---
export type UserNotificationType =
  | "task-new"
  | "goal-new"
  | "meeting-new"
  | "office-invite" // Example for future use
  | "generic";

export interface UserNotification {
  id: string;
  userId: string; // The ID of the user this notification is for
  type: UserNotificationType;
  title: string;
  message: string;
  link?: string; // Optional link to navigate to (e.g., /tasks/taskId)
  timestamp: Date;
  isRead: boolean;
  officeId?: string; // Optional: context if it's an office-related notification
  actorName?: string; // Optional: name of the user who triggered the event
  entityId?: string; // ID of the related task, goal, meeting, etc.
  entityType?: 'task' | 'goal' | 'meeting' | 'office'; // Type of the related entity
}

export type UserNotificationFirestoreData = Omit<UserNotification, 'id' | 'timestamp' | 'userId'> & {
  timestamp: Timestamp;
};
