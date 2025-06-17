
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
  // userId is implicitly known by the collection path users/{userId}/tasks
}

export type TaskFirestoreData = Omit<Task, 'id' | 'dueDate' | 'createdAt' | 'updatedAt'> & {
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
  // userId is implicitly known by the collection path users/{userId}/goals
}

export type GoalFirestoreData = Omit<Goal, 'id' | 'deadline' | 'createdAt' | 'updatedAt'> & {
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
  participants: string[]; // Store as an array of participant names or IDs
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // userId is implicitly known by the collection path users/{userId}/meetings
}

export type MeetingFirestoreData = Omit<Meeting, 'id' | 'dateTime' | 'createdAt' | 'updatedAt'> & {
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
  ownerId: string; // User ID of the creator/owner
  invitationCode: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Rooms and Members will be subcollections
}

export type OfficeFirestoreData = Omit<Office, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  iconName: string; // Store Lucide icon name as string
  officeId: string; // Parent office ID
  createdAt?: Date;
  updatedAt?: Date;
}

export type RoomFirestoreData = Omit<Room, 'id' | 'officeId' | 'createdAt' | 'updatedAt'> & {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export interface OfficeMember {
  userId: string; // Firebase Auth User ID
  name: string; // Denormalized user display name
  role: MemberRole;
  avatarUrl?: string; // Denormalized user avatar URL
  joinedAt?: Date;
}

export type OfficeMemberFirestoreData = Omit<OfficeMember, 'joinedAt'> & {
  joinedAt?: Timestamp;
};


// --- Chat Types (Primarily for structure, full Firebase integration deferred) ---
export interface ChatUser { // Renamed from Member to avoid confusion with OfficeMember
  id: string; // User ID
  name: string;
  role: string; // Could be simplified or derived from OfficeMember role
  avatarUrl?: string;
}

export interface ChatMessage {
  id: string; // Firestore document ID for the message
  text: string;
  senderId: string; // User ID of the sender
  senderName: string; // Denormalized sender name
  timestamp: Date; // Converted from Firestore Timestamp
  avatarUrl?: string; // Denormalized sender avatar
  type?: 'text' | 'voice_note' | 'call_event';
  callDuration?: string;
  voiceNoteDuration?: string;
  chatThreadId: string; // ID of the chat thread this message belongs to
  // Add other fields as necessary, e.g., reactions, read receipts
  createdAt?: Date; // Firestore timestamp for message creation
}

// For writing ChatMessage to Firestore
export type ChatMessageFirestoreData = Omit<ChatMessage, 'id' | 'timestamp' | 'createdAt'> & {
  timestamp: Timestamp; // Or use serverTimestamp for creation
  createdAt?: Timestamp;
};

export interface ChatThread {
  id: string; // Firestore document ID for the chat thread
  participantIds: string[]; // Array of user IDs in the chat
  lastMessage?: Pick<ChatMessage, 'text' | 'senderName' | 'timestamp'>; // Snippet of last message
  updatedAt?: Date; // Timestamp of the last activity
  // For group chats, could add:
  // name?: string;
  // groupAvatarUrl?: string;
  // type: 'dm' | 'group';
}
