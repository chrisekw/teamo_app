

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

// --- User Profile Types ---
export interface UserProfile {
  id: string; // Should be the same as Firebase Auth UID
  displayName: string;
  email: string; // Usually from Auth, stored for convenience
  avatarUrl?: string;
  phoneNumber?: string;
  profession?: string;
  birthday?: Date;
  bio?: string;
  resumeUrl?: string; // URL to the stored resume file
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserProfileFirestoreData = Omit<UserProfile, 'id' | 'birthday' | 'createdAt' | 'updatedAt'> & {
  birthday?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};


// --- Task Management Types ---
export interface Task {
  id: string;
  name: string;
  assignedTo: string; // Can be a user name, email, or comma-separated list for now
  dueDate?: Date;
  status: "To Do" | "In Progress" | "Done" | "Blocked";
  priority: "Low" | "Medium" | "High";
  progress: number;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  userId?: string; // The user who "owns" or created this task
}

export type TaskFirestoreData = Omit<Task, 'id' | 'dueDate' | 'createdAt' | 'updatedAt' | 'userId'> & {
  dueDate?: Timestamp;
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
  participants?: string[]; // Names or IDs of involved users/groups
  createdAt?: Date;
  updatedAt?: Date;
  userId?: string; // The user who "owns" or created this goal
}

export type GoalFirestoreData = Omit<Goal, 'id' | 'deadline' | 'createdAt' | 'updatedAt' | 'userId'> & {
  deadline?: Timestamp;
  participants?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

// --- Meetings Types ---
export interface Meeting {
  id: string;
  title: string;
  dateTime: Date; // Start date and time
  endDateTime: Date; // End date and time
  isRecurring?: boolean;
  participants: string[]; // Names or IDs of invited users/groups
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  userId?: string; // The user who "owns" or created this meeting
}

export type MeetingFirestoreData = Omit<Meeting, 'id' | 'dateTime' | 'endDateTime' | 'createdAt' | 'updatedAt' | 'userId'> & {
  dateTime: Timestamp;
  endDateTime: Timestamp;
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
  sector?: string;
  companyName?: string;
  logoUrl?: string;
  bannerUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type OfficeFirestoreData = Omit<Office, 'id' | 'createdAt' | 'updatedAt'> & {
  bannerUrl?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  iconName: string;
  coverImageUrl?: string;
  officeId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type RoomFirestoreData = Omit<Room, 'id' | 'officeId' | 'createdAt' | 'updatedAt'> & {
  coverImageUrl?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export interface OfficeMember {
  userId: string;
  name: string;
  role: MemberRole;
  workRole?: string;
  avatarUrl?: string;
  joinedAt?: Date;
}

export type OfficeMemberFirestoreData = Omit<OfficeMember, 'joinedAt' | 'userId'> & {
  workRole?: string;
  joinedAt?: Timestamp;
};

export type OfficeJoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface OfficeJoinRequest {
  id: string;
  officeId: string;
  officeName: string;
  requesterId: string;
  requesterName: string;
  requesterAvatarUrl?: string;
  status: OfficeJoinRequestStatus;
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
}

export type OfficeJoinRequestFirestoreData = Omit<OfficeJoinRequest, 'id' | 'requestedAt' | 'processedAt'> & {
  requestedAt: Timestamp;
  processedAt?: Timestamp;
};


// --- Activity Log Types ---
export type ActivityType =
  | "task-new" | "task-status-update" | "task-completed"
  | "goal-new" | "goal-progress-update" | "goal-achieved"
  | "meeting-new"
  | "office-created" | "member-join" | "room-new"
  | "office-join-request-sent" | "office-join-request-approved" | "office-join-request-rejected"
  | "member-role-updated" | "member-removed";


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
  entityType?: 'task' | 'goal' | 'meeting' | 'member' | 'room' | 'office' | 'joinRequest';
}

export type ActivityLogItemFirestoreData = Omit<ActivityLogItem, 'id' | 'timestamp' | 'officeId'> & {
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
  audioDataUrl?: string;
  chatThreadId: string;
}

export type ChatMessageFirestoreData = Omit<ChatMessage, 'id' | 'timestamp' | 'audioDataUrl' > & {
  timestamp: Timestamp;
  audioDataUrl?: string; 
};


export interface ChatThread {
  id: string;
  participantIds: string[];
  participantInfo: { [userId: string]: Pick<ChatUser, 'name' | 'avatarUrl'> };
  lastMessageText?: string;
  lastMessageSenderName?: string;
  lastMessageTimestamp?: Date;
  updatedAt: Date;
}

export type ChatThreadFirestoreData = Omit<ChatThread, 'id' | 'lastMessageTimestamp' | 'updatedAt'> & {
  lastMessageTimestamp?: Timestamp;
  updatedAt: Timestamp;
};


// --- User Notification Types ---
export type UserNotificationType =
  | "task-new" | "task-updated" // Added task-updated
  | "goal-new" | "goal-updated" // Added goal-updated
  | "meeting-new" | "meeting-updated" // Added meeting-updated
  | "chat-new-message"
  | "office-invite"
  | "office-join-request"
  | "office-join-approved"
  | "office-join-rejected"
  | "generic";

export interface UserNotification {
  id: string;
  userId: string;
  type: UserNotificationType;
  title: string;
  message: string;
  link?: string;
  timestamp: Date;
  isRead: boolean;
  officeId?: string;
  actorName?: string;
  entityId?: string;
  entityType?: 'task' | 'goal' | 'meeting' | 'office' | 'chat-thread' | 'joinRequest';
}

export type UserNotificationFirestoreData = Omit<UserNotification, 'id' | 'timestamp' | 'userId'> & {
  timestamp: Timestamp;
};

    
