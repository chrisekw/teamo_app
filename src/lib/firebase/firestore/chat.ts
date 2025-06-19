
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
    const { chatThreadId, ...rest } = chatMessage;
    const data: Partial<ChatMessageFirestoreData> = {
      ...rest,
      timestamp: serverTimestamp(), // Always set server timestamp on creation
    };
    if (chatMessage.audioDataUrl) {
      data.audioDataUrl = chatMessage.audioDataUrl;
    }
    if (chatMessage.voiceNoteDuration) {
      data.voiceNoteDuration = chatMessage.voiceNoteDuration;
    }
    if (chatMessage.type) {
      data.type = chatMessage.type;
    }
    return data as DocumentData;
  },
  fromFirestore: (snapshot, options): ChatMessage => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      chatThreadId: snapshot.ref.parent.parent!.id, 
      text: data.text,
      senderId: data.senderId,
      senderName: data.senderName,
      timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
      avatarUrl: data.avatarUrl,
      type: data.type || 'text',
      callDuration: data.callDuration,
      voiceNoteDuration: data.voiceNoteDuration,
      audioDataUrl: data.audioDataUrl,
    };
  }
};

const chatThreadConverter: FirestoreDataConverter<ChatThread, ChatThreadFirestoreData> = {
  toFirestore: (chatThreadInput: Partial<ChatThread>): DocumentData => {
    const { id, lastMessageTimestamp, updatedAt, ...rest } = chatThreadInput; 
    const data: Partial<ChatThreadFirestoreData> = { ...rest };
    
    if (lastMessageTimestamp instanceof Date) {
      data.lastMessageTimestamp = Timestamp.fromDate(lastMessageTimestamp);
    } else if (lastMessageTimestamp === undefined && chatThreadInput.hasOwnProperty('lastMessageTimestamp')) {
        data.lastMessageTimestamp = undefined; 
    }

    data.updatedAt = serverTimestamp(); 
    
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
    };
    await setDoc(threadRef, newThreadData); 
    const newlyCreatedSnap = await getDoc(threadRef); 
    if (!newlyCreatedSnap.exists()) throw new Error("Failed to create DM thread.");
    return newlyCreatedSnap.data();
  }
}

export async function addChatMessageAndNotify(
  threadId: string,
  messageContent: { text: string; type: 'text' } | { text: string; type: 'voice_note'; audioDataUrl: string; voiceNoteDuration: string },
  sender: ChatUser,
  participantsInThread: ChatUser[], 
  officeContext?: { officeId: string; officeName: string }
): Promise<ChatMessage> {
  if (!threadId || !sender) {
    throw new Error("Thread ID and sender are required.");
  }
  if (messageContent.type === 'text' && !messageContent.text.trim()) {
    throw new Error("Text message cannot be empty.");
  }
  if (messageContent.type === 'voice_note' && !messageContent.audioDataUrl) {
    throw new Error("Voice note requires audio data.");
  }


  const messagesCollection = messagesColRef(threadId);
  let messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'chatThreadId'>;

  if (messageContent.type === 'text') {
    messageData = {
      text: messageContent.text,
      senderId: sender.id,
      senderName: sender.name,
      avatarUrl: sender.avatarUrl,
      type: 'text',
    };
  } else { // voice_note
    messageData = {
      text: messageContent.text, // e.g., "Voice Note"
      senderId: sender.id,
      senderName: sender.name,
      avatarUrl: sender.avatarUrl,
      type: 'voice_note',
      audioDataUrl: messageContent.audioDataUrl,
      voiceNoteDuration: messageContent.voiceNoteDuration,
    };
  }

  const messageDocRef = await addDoc(messagesCollection, messageData);
  
  const threadRef = chatThreadDocRef(threadId);
  const lastMessageText = messageContent.type === 'voice_note' ? "Voice Note" : messageContent.text;
  await updateDoc(threadRef, {
    lastMessageText: lastMessageText,
    lastMessageSenderName: sender.name,
    lastMessageTimestamp: serverTimestamp(), 
    updatedAt: serverTimestamp()
  });

  const recipients = participantsInThread.filter(p => p.id !== sender.id);
  const notificationMessage = messageContent.type === 'voice_note' ? "Sent a voice note" : (messageContent.text.length > 100 ? `${messageContent.text.substring(0, 97)}...` : messageContent.text);

  for (const recipient of recipients) {
    try {
      await addUserNotification(recipient.id, {
        type: "chat-new-message",
        title: `New message from ${sender.name}`,
        message: notificationMessage,
        link: `/chat?threadId=${threadId}`,
        actorName: sender.name,
        entityId: threadId,
        entityType: "chat-thread",
        officeId: officeContext?.officeId,
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
  return snapshot.docs.map(doc => doc.data()).reverse(); 
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


const generalMessagesColRef = (officeId: string) => 
    collection(db, 'offices', officeId, 'generalMessages').withConverter(chatMessageConverter);

export async function addGeneralOfficeMessage(
  officeId: string,
  messageContent: { text: string; type: 'text' } | { text: string; type: 'voice_note'; audioDataUrl: string; voiceNoteDuration: string },
  sender: ChatUser
): Promise<ChatMessage> {
  if (!officeId || !sender) {
    throw new Error("Office ID and sender are required for general chat.");
  }
    if (messageContent.type === 'text' && !messageContent.text.trim()) {
    throw new Error("Text message cannot be empty.");
  }
  if (messageContent.type === 'voice_note' && !messageContent.audioDataUrl) {
    throw new Error("Voice note requires audio data.");
  }

  const messagesCollection = generalMessagesColRef(officeId);
  let messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'chatThreadId'>;

  if (messageContent.type === 'text') {
    messageData = {
      text: messageContent.text,
      senderId: sender.id,
      senderName: sender.name,
      avatarUrl: sender.avatarUrl,
      type: 'text',
      chatThreadId: `general-${officeId}`
    };
  } else { // voice_note
    messageData = {
      text: messageContent.text, // e.g., "Voice Note"
      senderId: sender.id,
      senderName: sender.name,
      avatarUrl: sender.avatarUrl,
      type: 'voice_note',
      audioDataUrl: messageContent.audioDataUrl,
      voiceNoteDuration: messageContent.voiceNoteDuration,
      chatThreadId: `general-${officeId}`
    };
  }
  
  const messageDocRef = await addDoc(messagesCollection, messageData);
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

