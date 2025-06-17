
import { db } from '@/lib/firebase/client';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  where,
  limit,
  setDoc,
  collectionGroup,
  writeBatch,
} from 'firebase/firestore';
import type { ChatMessage, ChatMessageFirestoreData, ChatThread, ChatThreadFirestoreData, ChatUser } from '@/types';
import { addUserNotification } from './notifications';

// --- Converters ---

const chatMessageConverter: FirestoreDataConverter<ChatMessage, ChatMessageFirestoreData> = {
  toFirestore: (chatMessage: Omit<ChatMessage, 'id' | 'timestamp'>): DocumentData => {
    // chatThreadId is part of the path, not stored in the message doc itself.
    const { chatThreadId, ...rest } = chatMessage;
    return {
      ...rest,
      timestamp: serverTimestamp(), // Always set server timestamp on creation
    };
  },
  fromFirestore: (snapshot, options): ChatMessage => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      chatThreadId: snapshot.ref.parent.parent!.id, // Assumes chatThreads/{threadId}/messages structure
      text: data.text,
      senderId: data.senderId,
      senderName: data.senderName,
      timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
      avatarUrl: data.avatarUrl,
      type: data.type || 'text',
      callDuration: data.callDuration,
      voiceNoteDuration: data.voiceNoteDuration,
    };
  }
};

const chatThreadConverter: FirestoreDataConverter<ChatThread, ChatThreadFirestoreData> = {
  toFirestore: (chatThreadInput: Partial<ChatThread>): DocumentData => {
    const { id, lastMessageTimestamp, updatedAt, ...rest } = chatThreadInput; // Exclude local/client-side fields
    const data: Partial<ChatThreadFirestoreData> = { ...rest };
    
    if (lastMessageTimestamp instanceof Date) {
      data.lastMessageTimestamp = Timestamp.fromDate(lastMessageTimestamp);
    } else if (lastMessageTimestamp === undefined && chatThreadInput.hasOwnProperty('lastMessageTimestamp')) {
        data.lastMessageTimestamp = undefined; // Explicitly handle setting to undefined
    }

    data.updatedAt = serverTimestamp(); // Always update this on any change
    
    return data as DocumentData;
  },
  fromFirestore: (snapshot, options): ChatThread => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      participantIds: data.participantIds || [],
      participantInfo: data.participantInfo || {},
      lastMessageText: data.lastMessageText,
      lastMessageSenderName: data.lastMessageSenderName,
      lastMessageTimestamp: data.lastMessageTimestamp instanceof Timestamp ? data.lastMessageTimestamp.toDate() : undefined,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  }
};

// --- Collection/Document References ---

const chatThreadsColRef = () => collection(db, 'chatThreads').withConverter(chatThreadConverter);
const chatThreadDocRef = (threadId: string) => doc(db, 'chatThreads', threadId).withConverter(chatThreadConverter);

const messagesColRef = (threadId: string) => collection(chatThreadDocRef(threadId).path, 'messages').withConverter(chatMessageConverter);


// --- Service Functions ---

export function getDmThreadId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

export async function getOrCreateDmThread(user1: ChatUser, user2: ChatUser): Promise<ChatThread> {
  const threadId = getDmThreadId(user1.id, user2.id);
  const threadRef = chatThreadDocRef(threadId);
  const threadSnap = await getDoc(threadRef);

  if (threadSnap.exists()) {
    return threadSnap.data();
  } else {
    const newThreadData: Omit<ChatThread, 'id' | 'updatedAt'> = {
      participantIds: [user1.id, user2.id],
      participantInfo: {
        [user1.id]: { name: user1.name, avatarUrl: user1.avatarUrl },
        [user2.id]: { name: user2.name, avatarUrl: user2.avatarUrl },
      },
      // lastMessage fields will be undefined initially
    };
    await setDoc(threadRef, newThreadData); // setDoc is used because we define the ID
    const newlyCreatedSnap = await getDoc(threadRef); // Re-fetch to get server timestamps
    if (!newlyCreatedSnap.exists()) throw new Error("Failed to create DM thread.");
    return newlyCreatedSnap.data();
  }
}

export async function addChatMessageAndNotify(
  threadId: string,
  messageText: string,
  sender: ChatUser,
  participantsInThread: ChatUser[], // All participants including sender
  officeContext?: { officeId: string; officeName: string }
): Promise<ChatMessage> {
  if (!threadId || !messageText.trim() || !sender) {
    throw new Error("Thread ID, message text, and sender are required.");
  }

  const messagesCollection = messagesColRef(threadId);
  const messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'chatThreadId'> = {
    text: messageText,
    senderId: sender.id,
    senderName: sender.name,
    avatarUrl: sender.avatarUrl,
    type: 'text', // Assuming text messages for now
  };

  const messageDocRef = await addDoc(messagesCollection, messageData);
  
  // Update the thread's last message and updatedAt timestamp
  const threadRef = chatThreadDocRef(threadId);
  await updateDoc(threadRef, {
    lastMessageText: messageText,
    lastMessageSenderName: sender.name,
    lastMessageTimestamp: serverTimestamp(), // Firestore will convert this
    updatedAt: serverTimestamp()
  });

  const recipients = participantsInThread.filter(p => p.id !== sender.id);
  for (const recipient of recipients) {
    try {
      await addUserNotification(recipient.id, {
        type: "chat-new-message",
        title: `New message from ${sender.name}`,
        message: messageText.length > 100 ? `${messageText.substring(0, 97)}...` : messageText,
        link: `/chat?threadId=${threadId}`,
        actorName: sender.name,
        entityId: threadId,
        entityType: "chat-thread",
        officeId: officeContext?.officeId, // Optional, if chat is within an office
      });
    } catch (error) {
      console.error(`Failed to send chat notification to ${recipient.id}`, error);
    }
  }
  const newMsgSnap = await getDoc(messageDocRef);
  if (!newMsgSnap.exists()) throw new Error("Failed to send message");
  return newMsgSnap.data();
}

export async function getMessagesForThread(threadId: string, count: number = 25): Promise<ChatMessage[]> {
  if (!threadId) return [];
  const messagesCollection = messagesColRef(threadId);
  const q = query(messagesCollection, orderBy("timestamp", "desc"), limit(count));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data()).reverse(); // Reverse to show oldest first
}

export async function getChatThreadsForUser(userId: string, count: number = 20): Promise<ChatThread[]> {
  if (!userId) return [];
  const q = query(
    chatThreadsColRef(),
    where("participantIds", "array-contains", userId),
    orderBy("updatedAt", "desc"),
    limit(count)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
}


// General Office Chat specific functions (Simplified, no individual user notifications from these)
const generalMessagesColRef = (officeId: string) => 
    collection(db, 'offices', officeId, 'generalMessages').withConverter(chatMessageConverter);

export async function addGeneralOfficeMessage(
  officeId: string,
  messageText: string,
  sender: ChatUser
): Promise<ChatMessage> {
  if (!officeId || !messageText.trim() || !sender) {
    throw new Error("Office ID, message text, and sender are required for general chat.");
  }
  const messagesCollection = generalMessagesColRef(officeId);
  const messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'chatThreadId'> = {
    text: messageText,
    senderId: sender.id,
    senderName: sender.name,
    avatarUrl: sender.avatarUrl,
    type: 'text',
    chatThreadId: `general-${officeId}` // For client-side consistency if needed
  };
  const messageDocRef = await addDoc(messagesCollection, messageData);
  // No update to a "thread" document for general chat here, could be added if needed
  const newMsgSnap = await getDoc(messageDocRef);
  if (!newMsgSnap.exists()) throw new Error("Failed to send general office message");
  return newMsgSnap.data();
}

export async function getGeneralOfficeMessages(officeId: string, count: number = 25): Promise<ChatMessage[]> {
  if (!officeId) return [];
  const messagesCollection = generalMessagesColRef(officeId);
  const q = query(messagesCollection, orderBy("timestamp", "desc"), limit(count));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data()).reverse();
}
