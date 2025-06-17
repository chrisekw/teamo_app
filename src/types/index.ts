
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
  participants: string[]; // Consider changing to userId[] if participants are app users
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
export interface ChatUser { // This type is used by ChatPage, ensure consistency
  id: string;
  name: string;
  role: string; // Role within the office or general user
  avatarUrl?: string;
}

export interface ChatMessage {
  id: string; // Firestore document ID
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Date; // JS Date object for client
  avatarUrl?: string;
  type?: 'text' | 'voice_note' | 'call_event'; // Keep for UI differentiation
  callDuration?: string; // For call_event type
  voiceNoteDuration?: string; // For voice_note type
  chatThreadId: string; // Parent thread ID
  // No createdAt here, timestamp serves as the creation time for messages
}

// Firestore representation of a ChatMessage
export type ChatMessageFirestoreData = Omit<ChatMessage, 'id' | 'timestamp' > & {
  timestamp: Timestamp; // Firestore Timestamp for server
};


export interface ChatThread {
  id: string; // Firestore document ID
  participantIds: string[]; // Array of user IDs in the thread
  participantInfo: { [userId: string]: Pick<ChatUser, 'name' | 'avatarUrl'> }; // Quick access to names/avatars
  lastMessageText?: string;
  lastMessageSenderName?: string;
  lastMessageTimestamp?: Date;
  updatedAt: Date; // Timestamp of the last activity
  // For unread counts per user (more complex, for future enhancement):
  // unreadCounts?: { [userId: string]: number };
  // lastReadTimestamps?: { [userId: string]: Timestamp };
}

export type ChatThreadFirestoreData = Omit<ChatThread, 'id' | 'lastMessageTimestamp' | 'updatedAt'> & {
  lastMessageTimestamp?: Timestamp;
  updatedAt: Timestamp;
};


// --- User Notification Types ---
export type UserNotificationType =
  | "task-new"
  | "goal-new"
  | "meeting-new"
  | "chat-new-message" // New type for chat
  | "office-invite" // Example for future use
  | "generic";

export interface UserNotification {
  id: string;
  userId: string; // The ID of the user this notification is for
  type: UserNotificationType;
  title: string;
  message: string;
  link?: string; // Optional link to navigate to (e.g., /tasks/taskId or /chat?threadId=xyz)
  timestamp: Date;
  isRead: boolean;
  officeId?: string; // Optional: context if it's an office-related notification
  actorName?: string; // Optional: name of the user who triggered the event
  entityId?: string; // ID of the related task, goal, meeting, chat thread etc.
  entityType?: 'task' | 'goal' | 'meeting' | 'office' | 'chat-thread'; // Type of the related entity
}

export type UserNotificationFirestoreData = Omit<UserNotification, 'id' | 'timestamp' | 'userId'> & {
  timestamp: Timestamp;
};
