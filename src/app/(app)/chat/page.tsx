
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from "next/link";
import { useSearchParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, Users, MessageSquareText, ArrowLeft, Loader2, Video, PhoneOff, Mic, Square, Play, Pause, AlertTriangle, VideoOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/firebase/auth";
import type { ChatMessage, ChatUser, Office, ChatThread } from "@/types";
import { getOfficesForUser, getMembersForOffice, onUserOfficesUpdate } from '@/lib/firebase/firestore/offices';
import {
  getOrCreateDmThread,
  addChatMessageAndNotify,
  onMessagesUpdate,
  addGeneralOfficeMessage,
  onGeneralOfficeMessagesUpdate,
  onChatThreadDocUpdate,
  updateCallState
} from '@/lib/firebase/firestore/chat';
import { markNotificationsAsReadByLink } from '@/lib/firebase/firestore/notifications';
import { doc, getDoc, type Unsubscribe } from 'firebase/firestore'; 
import { db } from '@/lib/firebase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";


export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChatType, setActiveChatType] = useState<'dm' | 'general' | null>(null);
  const [activeChatTargetUser, setActiveChatTargetUser] = useState<ChatUser | null>(null);
  const [activeThreadDetails, setActiveThreadDetails] = useState<ChatThread | null>(null);

  const [allMessages, setAllMessages] = useState<Record<string, ChatMessage[]>>({});
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [currentUserForChat, setCurrentUserForChat] = useState<ChatUser | null>(null);
  const [currentOfficeMembers, setCurrentOfficeMembers] = useState<ChatUser[]>([]);
  const [activeOfficeForChat, setActiveOfficeForChat] = useState<Office | null | undefined>(undefined);

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const isCallActive = activeChatType === 'dm' && !!activeThreadDetails?.callState?.active;

  const [isRecordingVoiceNote, setIsRecordingVoiceNote] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceRecordingStartTimeRef = useRef<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const [currentlyPlayingAudioId, setCurrentlyPlayingAudioId] = useState<string | null>(null);
  const [userOfficesList, setUserOfficesList] = useState<Office[]>([]);


  useEffect(() => {
    if (user && !authLoading) {
      setCurrentUserForChat({
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'You',
        role: 'User',
        avatarUrl: user.photoURL || `https://placehold.co/40x40.png?text=${(user.displayName || 'U').substring(0,1)}`,
      });
    }
  }, [user, authLoading]);

  // Combined effect to handle initial data loading and chat initialization
  useEffect(() => {
    if (!user || authLoading) return;

    // 1. Fetch user's offices and set an initial active office.
    const unsubOffices = onUserOfficesUpdate(user.uid, async (offices) => {
      setUserOfficesList(offices);
      
      const threadIdFromUrl = searchParams.get('threadId');
      const officeGeneralFromUrl = searchParams.get('officeGeneral');
      
      let currentActiveOffice = offices.find(o => o.id === officeGeneralFromUrl) || offices[0] || null;
      setActiveOfficeForChat(currentActiveOffice);

      // 2. Fetch members for the determined active office
      if (currentActiveOffice) {
        const members = await getMembersForOffice(currentActiveOffice.id);
        const chatUsers: ChatUser[] = members.map(m => ({
          id: m.userId, name: m.name, role: m.role, avatarUrl: m.avatarUrl,
        }));
        setCurrentOfficeMembers(chatUsers.filter(m => m.id !== user.uid));
      } else {
        setCurrentOfficeMembers([]);
      }
      
      // 3. Initialize chat based on URL params or default to general chat
      if (threadIdFromUrl) {
          try {
            const threadDataSnap = await getDoc(doc(db, 'chatThreads', threadIdFromUrl));
            if (threadDataSnap.exists()) {
              const threadData = threadDataSnap.data() as ChatThread;
              const targetId = threadData.participantIds.find(pid => pid !== user?.uid);
              let targetUserInfo: ChatUser | undefined;
              if (targetId && threadData.participantInfo && threadData.participantInfo[targetId]) {
                targetUserInfo = { id: targetId, name: threadData.participantInfo[targetId].name, role: 'User', avatarUrl: threadData.participantInfo[targetId].avatarUrl };
              }
              if (targetUserInfo) {
                await selectChat(threadIdFromUrl, 'dm', targetUserInfo);
              } else {
                console.warn(`Could not find target user info for thread ${threadIdFromUrl}`);
                if (currentActiveOffice) await selectChat(`general-${currentActiveOffice.id}`, 'general');
              }
            } else {
              if (currentActiveOffice) await selectChat(`general-${currentActiveOffice.id}`, 'general');
            }
          } catch (e) {
            console.error("Error fetching thread from URL:", e);
            if (currentActiveOffice) await selectChat(`general-${currentActiveOffice.id}`, 'general');
          }
      } else if (currentActiveOffice) {
        await selectChat(`general-${currentActiveOffice.id}`, 'general');
      } else {
        setActiveChatId(null);
      }
    });

    return () => unsubOffices();
  }, [user, authLoading, searchParams]); // Depends on user and URL params to start


  const selectChat = useCallback(async (chatId: string, type: 'dm' | 'general', targetUser?: ChatUser) => {
    if (!user || !currentUserForChat) return;

    setActiveChatId(chatId);
    setActiveChatType(type);
    setActiveChatTargetUser(targetUser || null);

    if (type === 'dm') {
      await markNotificationsAsReadByLink(user.uid, `/chat?threadId=${chatId}`);
      router.replace(`/chat?threadId=${chatId}`, { scroll: false });
    } else if (type === 'general' && activeOfficeForChat) {
      router.replace(`/chat?officeGeneral=${activeOfficeForChat.id}`, { scroll: false });
    }

    if (isMobile) setMobileView('chat');
  }, [user, currentUserForChat, activeOfficeForChat, isMobile, router]);


  // Real-time message listener
  useEffect(() => {
    if (!activeChatId) return;

    let unsubscribe: Unsubscribe = () => {};
    let unsubscribeThread: Unsubscribe = () => {};
    
    setIsLoadingMessages(true);

    if (activeChatType === 'dm') {
      unsubscribe = onMessagesUpdate(activeChatId, (messages) => {
        setAllMessages(prev => ({ ...prev, [activeChatId]: messages }));
        setIsLoadingMessages(false);
      });
      unsubscribeThread = onChatThreadDocUpdate(activeChatId, setActiveThreadDetails);

    } else if (activeChatType === 'general' && activeOfficeForChat) {
      unsubscribe = onGeneralOfficeMessagesUpdate(activeOfficeForChat.id, (messages) => {
        setAllMessages(prev => ({ ...prev, [`general-${activeOfficeForChat.id}`]: messages }));
        setIsLoadingMessages(false);
      });
      setActiveThreadDetails(null); // No call state for general chat
    }

    return () => {
        unsubscribe();
        unsubscribeThread();
    };
  }, [activeChatId, activeChatType, activeOfficeForChat?.id]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [allMessages, activeChatId, mobileView, isLoadingMessages]);


  const handleSendTextMessage = async () => {
    if (!newMessage.trim() || !activeChatId || !currentUserForChat || isSendingMessage) return;
    if (!activeChatType) {
        toast({title: "No Chat Selected", description: "Please select a chat."});
        return;
    }

    setIsSendingMessage(true);
    const currentMsgText = newMessage;
    setNewMessage("");

    const tempMessageId = Date.now().toString();
    const optimisticMessage: ChatMessage = {
      id: tempMessageId, text: currentMsgText, senderId: currentUserForChat.id,
      timestamp: new Date(), senderName: currentUserForChat.name, avatarUrl: currentUserForChat.avatarUrl,
      type: 'text', chatThreadId: activeChatId,
    };
    setAllMessages(prev => ({
      ...prev, [activeChatId]: [...(prev[activeChatId] || []), optimisticMessage]
    }));

    try {
      const messageContent = { text: currentMsgText, type: 'text' as const };
      if (activeChatType === 'dm' && activeChatTargetUser) {
        await addChatMessageAndNotify(
            activeChatId,
            messageContent,
            currentUserForChat,
            [currentUserForChat, activeChatTargetUser],
            activeOfficeForChat ? {officeId: activeOfficeForChat.id, officeName: activeOfficeForChat.name } : undefined
        );
      } else if (activeChatType === 'general' && activeOfficeForChat) {
        await addGeneralOfficeMessage(activeOfficeForChat.id, messageContent, currentUserForChat);
      }
      setAllMessages(prev => ({
         ...prev, [activeChatId]: (prev[activeChatId] || []).filter(m => m.id !== tempMessageId || m.text !== currentMsgText)
      }));


    } catch (error) {
      console.error("Error sending message:", error);
      toast({ variant: "destructive", title: "Send Error", description: "Failed to send message." });
      setAllMessages(prev => ({
        ...prev, [activeChatId]: (prev[activeChatId] || []).filter(m => m.id !== tempMessageId)
      }));
      setNewMessage(currentMsgText);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendVoiceNote = async (audioDataUrl: string, durationSeconds: number) => {
    if (!activeChatId || !currentUserForChat || isSendingMessage) return;
    if (!activeChatType) {
      toast({ title: "No Chat Selected", description: "Please select a chat." });
      return;
    }
    setIsSendingMessage(true);

    const durationFormatted = `${String(Math.floor(durationSeconds / 60)).padStart(2, '0')}:${String(durationSeconds % 60).padStart(2, '0')}`;
    
    const tempMessageId = Date.now().toString();
    const optimisticMessage: ChatMessage = {
      id: tempMessageId, text: `Voice Note (${durationFormatted})`, senderId: currentUserForChat.id,
      timestamp: new Date(), senderName: currentUserForChat.name, avatarUrl: currentUserForChat.avatarUrl,
      type: 'voice_note', audioDataUrl: audioDataUrl, voiceNoteDuration: durationFormatted, chatThreadId: activeChatId,
    };
    setAllMessages(prev => ({
        ...prev, [activeChatId]: [...(prev[activeChatId] || []), optimisticMessage]
    }));

    try {
      const messageContent = { text: `Voice Note`, type: 'voice_note' as const, audioDataUrl, voiceNoteDuration: durationFormatted };

      if (activeChatType === 'dm' && activeChatTargetUser) {
        await addChatMessageAndNotify(
          activeChatId, messageContent, currentUserForChat,
          [currentUserForChat, activeChatTargetUser],
          activeOfficeForChat ? { officeId: activeOfficeForChat.id, officeName: activeOfficeForChat.name } : undefined
        );
      } else if (activeChatType === 'general' && activeOfficeForChat) {
        await addGeneralOfficeMessage(activeOfficeForChat.id, messageContent, currentUserForChat);
      }
      
      setAllMessages(prev => ({
         ...prev, [activeChatId]: (prev[activeChatId] || []).filter(m => m.id !== tempMessageId)
      }));
      toast({
        title: "Voice Note Sent",
        description: `Duration: ${durationFormatted}. (Note: Audio stored in Firestore for prototype - consider Firebase Storage for production.)`,
        variant: "default", duration: 7000,
      });
    } catch (error) {
      console.error("Error sending voice note:", error);
      toast({ variant: "destructive", title: "Send Error", description: "Failed to send voice note." });
       setAllMessages(prev => ({
        ...prev, [activeChatId]: (prev[activeChatId] || []).filter(m => m.id !== tempMessageId)
      }));
    } finally {
      setIsSendingMessage(false);
    }
  };


  const addSystemMessage = (chatId: string, text: string, callDuration?: string) => {
    const systemMessage: ChatMessage = {
      id: Date.now().toString(), text, senderId: 'system', timestamp: new Date(), senderName: 'System', type: 'call_event', callDuration, chatThreadId: chatId, avatarUrl: undefined
    };
    setAllMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), systemMessage] }));
  };
  
  const handleStartVideoCall = async () => {
    if (!activeChatId || !currentUserForChat || activeChatType !== 'dm') return;
    try {
        await updateCallState(activeChatId, {
            active: true,
            initiatedBy: currentUserForChat.id,
        });
        addSystemMessage(activeChatId, "You started a video call.");
        toast({ title: "Video Call Started", description: "The video call is now active." });
    } catch(error) {
        console.error("Error starting video call:", error);
        toast({ variant: "destructive", title: "Call Error", description: "Could not start video call." });
    }
  };

  const handleEndVideoCall = async () => {
    if (!activeChatId || activeChatType !== 'dm') return;
    try {
        await updateCallState(activeChatId, null); // This will delete the field
        const targetName = activeChatTargetUser?.name || 'the other person';
        const mockDuration = `${Math.floor(Math.random() * 5) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
        addSystemMessage(activeChatId, `Video call with ${targetName} ended.`, mockDuration);
        toast({ title: "Video Call Ended" });
    } catch(error) {
        console.error("Error ending video call:", error);
        toast({ variant: "destructive", title: "Call Error", description: "Could not end video call." });
    }
  };

  const handleToggleVoiceRecording = async () => {
    if (!currentUserForChat || !activeChatId || !activeChatType) return;

    if (isRecordingVoiceNote) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setIsRecordingVoiceNote(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64AudioDataUrl = reader.result as string;
            const durationMs = Date.now() - (voiceRecordingStartTimeRef.current || Date.now());
            const durationSec = Math.max(1, Math.round(durationMs / 1000));
            handleSendVoiceNote(base64AudioDataUrl, durationSec);
            audioChunksRef.current = [];
          };
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.onerror = (event) => {
            console.error("MediaRecorder error:", event);
            toast({variant: "destructive", title: "Recording Error", description: "Something went wrong during recording."});
            setIsRecordingVoiceNote(false);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        }

        mediaRecorderRef.current.start();
        voiceRecordingStartTimeRef.current = Date.now();
        setRecordingDuration(0);
        recordingIntervalRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
        setIsRecordingVoiceNote(true);
        toast({ title: "Recording Started", description: "Recording voice note..." });
      } catch (error) {
        console.error("Error accessing microphone:", error);
        toast({ variant: "destructive", title: "Mic Access Denied", description: "Please enable microphone permissions." });
      }
    }
  };

  const playAudio = (messageId: string) => {
    const audioEl = audioElementsRef.current[messageId];
    if (audioEl) {
      if (currentlyPlayingAudioId && currentlyPlayingAudioId !== messageId && audioElementsRef.current[currentlyPlayingAudioId]) {
        audioElementsRef.current[currentlyPlayingAudioId].pause();
      }
      audioEl.play().then(() => {
        setCurrentlyPlayingAudioId(messageId);
      }).catch(e => console.error("Error playing audio:", e));
    }
  };

  const pauseAudio = (messageId: string) => {
    const audioEl = audioElementsRef.current[messageId];
    if (audioEl) {
      audioEl.pause();
      setCurrentlyPlayingAudioId(null);
    }
  };

  const handleAudioEnded = (messageId: string) => {
    if (currentlyPlayingAudioId === messageId) {
        setCurrentlyPlayingAudioId(null);
    }
  };


  const getChatTitle = () => {
    if (!activeChatId) return "Select a Chat";
    if (activeChatType === 'general' && activeOfficeForChat) return `${activeOfficeForChat.name} General`;
    if (activeChatType === 'dm' && activeChatTargetUser) return activeChatTargetUser.name;
    if (activeChatType === 'dm' && !activeChatTargetUser) return "Direct Message";
    return "Chat";
  };

  const handleMobileChatSelect = async (type: 'dm' | 'general', member?: ChatUser) => {
    if (!currentUserForChat || (type === 'general' && !activeOfficeForChat)) return;

    if (type === 'dm' && member) {
      const thread = await getOrCreateDmThread(currentUserForChat, member);
      await selectChat(thread.id, 'dm', member);
    } else if (type === 'general' && activeOfficeForChat) {
      await selectChat(`general-${activeOfficeForChat.id}`, 'general');
    }
  };

  const handleOfficeChange = async (officeId: string) => {
    const newActiveOffice = userOfficesList.find(o => o.id === officeId);
    if (newActiveOffice && newActiveOffice.id !== activeOfficeForChat?.id) {
        setActiveOfficeForChat(newActiveOffice); // Triggers re-render and member fetch
        if (currentUserForChat) {
          const members = await getMembersForOffice(newActiveOffice.id);
          const chatUsers: ChatUser[] = members.map(m => ({
            id: m.userId, name: m.name, role: m.role, avatarUrl: m.avatarUrl,
          }));
          setCurrentOfficeMembers(chatUsers.filter(m => m.id !== user?.uid));
          await selectChat(`general-${newActiveOffice.id}`, 'general');
        }
    }
  };

  const displayedMessages = activeChatId ? (allMessages[activeChatId] || []) : [];

  if (authLoading || !currentUserForChat || activeOfficeForChat === undefined) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  const VideoCallInterface = () => (
    <div className="flex flex-col items-center justify-center h-full bg-muted/50 p-4 text-center">
        <Video className="h-16 w-16 text-primary mb-4" />
        <h3 className="text-2xl font-bold font-headline">Video Call in Progress</h3>
        <p className="text-muted-foreground mt-2">
            This is a placeholder for the real-time video stream.
        </p>
        <p className="text-sm mt-1 text-muted-foreground">
            You are in a call with {activeChatTargetUser?.name}.
        </p>
        <div className="mt-6 flex gap-4">
            <Button variant="outline"><Mic className="mr-2 h-4 w-4" /> Mute</Button>
            <Button variant="outline"><VideoOff className="mr-2 h-4 w-4" /> Stop Video</Button>
        </div>
    </div>
  );

  const renderChatList = (isMobileLayout: boolean) => {
    return (
      <Card className={cn("flex flex-col", isMobileLayout ? "flex-1 rounded-none border-0" : "w-64 sm:w-72 md:w-1/4 lg:w-1/5 mr-2 shadow-lg")}>
        <CardHeader className="p-3 border-b space-y-2">
          <CardTitle className="font-headline text-lg">Chats</CardTitle>
           {userOfficesList.length > 0 && (
            <div>
              <Label htmlFor="office-chat-switcher" className="text-xs text-muted-foreground">Active Office</Label>
              <Select value={activeOfficeForChat?.id || ''} onValueChange={handleOfficeChange} disabled={userOfficesList.length <= 1}>
                <SelectTrigger id="office-chat-switcher" className="h-9 mt-1">
                  <SelectValue placeholder="Select an office" />
                </SelectTrigger>
                <SelectContent>
                  {userOfficesList.map(office => (
                      <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <ScrollArea className="flex-1">
          <CardContent className="p-2 space-y-1">
            {activeOfficeForChat ? (
              <>
                <Button
                  variant={activeChatId === `general-${activeOfficeForChat.id}` ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handleMobileChatSelect('general')}
                >
                  <Users className="mr-2 h-4 w-4" /> General
                </Button>
                <Separator className="my-2" />
                <p className="text-sm font-medium text-muted-foreground px-1 py-1">Direct Messages</p>
                {currentOfficeMembers.map(member => (
                  <Button
                    key={member.id}
                    variant={(activeChatType === 'dm' && activeChatTargetUser?.id === member.id) ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => handleMobileChatSelect('dm', member)}
                  >
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="person avatar"/>
                      <AvatarFallback>{member.name.substring(0,1)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate flex-1 text-left">{member.name}</span>
                    <Badge variant="outline" className="ml-2 text-xs whitespace-nowrap">{member.role}</Badge>
                  </Button>
                ))}
                {currentOfficeMembers.length === 0 && <p className="text-xs text-muted-foreground p-2 text-center">No other members in this office for DMs.</p>}
              </>
            ) : userOfficesList.length > 0 ? (
                 <div className="text-sm text-muted-foreground p-4 text-center">
                     <p>Select an office to view chats.</p>
                 </div>
            ) : (
              <div className="text-sm text-muted-foreground p-4 text-center">
                <p>Join or create an office to start chatting.</p>
                <Button variant="link" asChild className="block mx-auto mt-2">
                  <Link href="/office-designer">Go to Offices</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </ScrollArea>
      </Card>
    );
  };

  const renderMessageView = (isMobileLayout: boolean) => {
    return (
      <Card className={cn("flex-1 flex flex-col h-full", isMobileLayout ? "rounded-none border-0" : "shadow-lg")}>
          <CardHeader className={cn("border-b flex flex-row items-center justify-between", isMobileLayout ? "py-3 px-2 sm:px-4 space-x-2" : "py-4 px-4")}>
              <div className="flex items-center space-x-2">
                  {isMobileLayout && (<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileView('list')}><ArrowLeft className="h-5 w-5" /></Button>)}
                  <CardTitle className={cn("font-headline", isMobileLayout ? "text-lg" : "text-xl")}>{getChatTitle()}</CardTitle>
              </div>
              {activeChatId && activeChatType === 'dm' && (
                  <Button variant="ghost" size="icon" onClick={isCallActive ? handleEndVideoCall : handleStartVideoCall} aria-label={isCallActive ? "End Call" : "Start Video Call"}>
                      {isCallActive ? <PhoneOff className="h-5 w-5 text-destructive" /> : <Video className="h-5 w-5 text-primary" />}
                  </Button>
              )}
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            {isCallActive ? (
                <VideoCallInterface />
            ) : (
                <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
                    <div className="space-y-4">
                    {isLoadingMessages && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
                    {!isLoadingMessages && displayedMessages.map((msg) => {
                        const isUserSender = msg.senderId === currentUserForChat?.id;
                        return (
                        <div key={msg.id} className={`flex items-end space-x-2 ${isUserSender ? 'justify-end' : ''}`}>
                        {!isUserSender && msg.senderId !== 'system' && (<Avatar className="h-8 w-8"><AvatarImage src={msg.avatarUrl} alt={msg.senderName} data-ai-hint="person avatar"/><AvatarFallback>{msg.senderName?.substring(0,1) || 'S'}</AvatarFallback></Avatar>)}
                        <div className={`max-w-xs lg:max-w-md px-3 py-2 sm:px-4 sm:py-2 rounded-lg shadow ${isUserSender ? 'bg-primary text-primary-foreground' : msg.senderId === 'system' ? 'bg-transparent w-full text-center' : 'bg-muted'}`}>
                            {!isUserSender && msg.senderId !== 'system' && <p className="text-xs font-semibold mb-1">{msg.senderName}</p>}

                            {msg.type === 'voice_note' && msg.audioDataUrl ? (
                                <div className="flex items-center space-x-2">
                                <audio
                                    ref={el => { if (el) audioElementsRef.current[msg.id] = el; }}
                                    src={msg.audioDataUrl}
                                    onEnded={() => handleAudioEnded(msg.id)}
                                    className="hidden"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => currentlyPlayingAudioId === msg.id ? pauseAudio(msg.id) : playAudio(msg.id)}
                                >
                                    {currentlyPlayingAudioId === msg.id ? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4"/>}
                                </Button>
                                <span className="text-sm">{msg.voiceNoteDuration || "Voice Note"}</span>
                                </div>
                            ) : msg.type === 'call_event' ? (
                                <p className="text-sm italic text-muted-foreground/80">{msg.text} {msg.callDuration && `(Duration: ${msg.callDuration})`}</p>
                            ) : (
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            )}

                            {msg.senderId !== 'system' && <p className={`text-xs mt-1 ${isUserSender ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                        </div>
                        {isUserSender && (<Avatar className="h-8 w-8"><AvatarImage src={msg.avatarUrl} alt={msg.senderName} data-ai-hint="person avatar"/><AvatarFallback>{currentUserForChat?.name.substring(0,1)}</AvatarFallback></Avatar>)}
                        </div>
                        );
                    })}
                    {!isLoadingMessages && displayedMessages.length === 0 && activeChatId && (
                        <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-full pt-10">
                            <MessageSquareText className="h-12 w-12 mb-2"/><p>No messages in this chat yet.</p><p className="text-xs">Start the conversation!</p>
                        </div>
                    )}
                    {!activeChatId && !isLoadingMessages && (
                        <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-full pt-10">
                            <MessageSquareText className="h-12 w-12 mb-2"/><p>Select a chat to begin.</p>
                        </div>
                    )}
                    </div>
                </ScrollArea>
            )}
          </CardContent>
          <div className={cn("border-t bg-background", isMobileLayout ? "p-2" : "p-4")}>
              <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon" aria-label="Attach file" className={cn(isMobileLayout && "h-8 w-8")} disabled={!activeChatId || isRecordingVoiceNote}><Paperclip className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
                  <Button variant="ghost" size="icon" onClick={handleToggleVoiceRecording} aria-label={isRecordingVoiceNote ? "Stop recording" : "Record voice note"} className={cn(isMobileLayout && "h-8 w-8", isRecordingVoiceNote && "text-destructive animate-pulse")} disabled={!activeChatId || isSendingMessage}>
                    {isRecordingVoiceNote ? <Square className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </Button>
                  {isRecordingVoiceNote ? (
                    <div className="text-sm text-muted-foreground flex-1 flex items-center">
                        <span>Recording... </span>
                        <span className="ml-2 font-mono">{String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:{String(recordingDuration % 60).padStart(2, '0')}</span>
                    </div>
                    ) : (
                      <Input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && !isRecordingVoiceNote && !isSendingMessage && handleSendTextMessage()} className="flex-1" disabled={!activeChatId || isRecordingVoiceNote || isSendingMessage}/>
                  )}
                  <Button onClick={handleSendTextMessage} aria-label="Send message" disabled={!activeChatId || isRecordingVoiceNote || newMessage.trim() === "" || isSendingMessage} className={cn(isMobileLayout && "h-9 px-3")}>
                      {isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </Button>
              </div>
          </div>
      </Card>
    );
  };

  return (
    <div className={cn("h-full", !isMobile ? "flex p-2" : "flex flex-col")}>
      {isMobile ? (mobileView === 'list' ? renderChatList(true) : renderMessageView(true)) : (<>{renderChatList(false)}<div className="flex-1 flex flex-col h-full">{renderMessageView(false)}</div></>)}
    </div>
  );
}
