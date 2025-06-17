
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from "next/link";
import { useSearchParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, Users, MessageSquareText, ArrowLeft, Loader2, Video, PhoneOff, Mic, Square, Play } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/firebase/auth";
import type { ChatMessage, ChatUser, Office, OfficeMember, ChatThread } from "@/types";
import { getOfficesForUser, getMembersForOffice } from '@/lib/firebase/firestore/offices';
import { 
  getOrCreateDmThread, 
  addChatMessageAndNotify, 
  getMessagesForThread,
  addGeneralOfficeMessage,
  getGeneralOfficeMessages 
} from '@/lib/firebase/firestore/chat';
import { markNotificationsAsReadByLink } from '@/lib/firebase/firestore/notifications';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';


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

  const [allMessages, setAllMessages] = useState<Record<string, ChatMessage[]>>({}); 
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const [currentUserForChat, setCurrentUserForChat] = useState<ChatUser | null>(null);
  const [currentOfficeMembers, setCurrentOfficeMembers] = useState<ChatUser[]>([]); 
  const [activeOfficeForChat, setActiveOfficeForChat] = useState<Office | null>(null);

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const [isCallActiveForChat, setIsCallActiveForChat] = useState<Record<string, boolean>>({});
  const [isRecordingVoiceNote, setIsRecordingVoiceNote] = useState(false);
  const voiceRecordingStartTimeRef = useRef<number | null>(null);
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

  useEffect(() => {
    const fetchInitialData = async () => {
      if (user && currentUserForChat) {
        const offices = await getOfficesForUser(user.uid);
        setUserOfficesList(offices);
        if (offices.length > 0) {
          const firstOffice = offices[0];
          setActiveOfficeForChat(firstOffice);
        } else {
          setActiveOfficeForChat(null);
          setCurrentOfficeMembers([]);
          setActiveChatId(null);
          setAllMessages({});
        }
      }
    };
    if (user && !authLoading && currentUserForChat) {
      fetchInitialData();
    }
  }, [user, authLoading, currentUserForChat]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (activeOfficeForChat && user) {
        const members = await getMembersForOffice(activeOfficeForChat.id);
        const chatUsers: ChatUser[] = members.map(m => ({
          id: m.userId,
          name: m.name,
          role: m.role,
          avatarUrl: m.avatarUrl,
        }));
        setCurrentOfficeMembers(chatUsers.filter(m => m.id !== user.uid));
      } else {
        setCurrentOfficeMembers([]);
      }
    };
    fetchMembers();
  }, [activeOfficeForChat, user]);


  const selectChat = useCallback(async (chatId: string, type: 'dm' | 'general', targetUser?: ChatUser) => {
    if (!user || !currentUserForChat) return;
    
    setActiveChatId(chatId);
    setActiveChatType(type);
    setActiveChatTargetUser(targetUser || null);
    setIsLoadingMessages(true);
    setAllMessages(prev => ({ ...prev, [chatId]: [] })); 

    try {
      let messages: ChatMessage[] = [];
      if (type === 'dm' && targetUser) {
        messages = await getMessagesForThread(chatId);
        await markNotificationsAsReadByLink(user.uid, `/chat?threadId=${chatId}`);
      } else if (type === 'general' && activeOfficeForChat) {
        messages = await getGeneralOfficeMessages(activeOfficeForChat.id);
      }
      setAllMessages(prev => ({ ...prev, [chatId]: messages }));
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load messages." });
    } finally {
      setIsLoadingMessages(false);
      if (isMobile) setMobileView('chat');
      
      if (type === 'dm') {
        router.replace(`/chat?threadId=${chatId}`, { scroll: false });
      } else if (type === 'general' && activeOfficeForChat) {
         router.replace(`/chat?officeGeneral=${activeOfficeForChat.id}`, { scroll: false });
      }
    }
  }, [user, currentUserForChat, activeOfficeForChat, isMobile, toast, router]);

  useEffect(() => {
    if (!user || !currentUserForChat || activeChatId || authLoading ) return;

    const threadIdFromUrl = searchParams.get('threadId');
    const officeGeneralFromUrl = searchParams.get('officeGeneral');

    const initializeChat = async () => {
        if (!activeOfficeForChat && userOfficesList.length === 0 && !threadIdFromUrl) { 
            setActiveChatId(null);
            setAllMessages({});
            setIsLoadingMessages(false);
            return;
        }

        setIsLoadingMessages(true);
        try {
            if (threadIdFromUrl) {
                const threadDataSnap = await getDoc(doc(db, 'chatThreads', threadIdFromUrl));
                if (threadDataSnap.exists()) {
                    const threadData = threadDataSnap.data() as ChatThread;
                    const targetId = threadData.participantIds.find(pid => pid !== user.uid);
                    
                    let targetUserInfo: ChatUser | undefined;
                    if (targetId && threadData.participantInfo && threadData.participantInfo[targetId]) {
                        targetUserInfo = { 
                            id: targetId, 
                            name: threadData.participantInfo[targetId].name, 
                            role: 'User', // Role might not be in threadData, default or fetch if needed
                            avatarUrl: threadData.participantInfo[targetId].avatarUrl 
                        };
                    } else if (targetId) { // Fallback if participantInfo is missing for target
                        const membersToSearch = activeOfficeForChat ? await getMembersForOffice(activeOfficeForChat.id) : [];
                        const memberDetails = membersToSearch.find(m => m.userId === targetId);
                        if(memberDetails) {
                             targetUserInfo = {id: memberDetails.userId, name: memberDetails.name, role: memberDetails.role, avatarUrl: memberDetails.avatarUrl};
                        }
                    }

                    if (targetUserInfo) {
                        await selectChat(threadIdFromUrl, 'dm', targetUserInfo);
                    } else if (activeOfficeForChat) {
                        console.warn("Target user for threadId not found. Defaulting to general chat.");
                        await selectChat(`general-${activeOfficeForChat.id}`, 'general');
                    } else {
                        setActiveChatId(null); setAllMessages({});
                    }
                } else if (activeOfficeForChat) {
                    console.warn("ThreadId from URL does not exist. Defaulting to general chat.");
                    await selectChat(`general-${activeOfficeForChat.id}`, 'general');
                } else {
                    setActiveChatId(null); setAllMessages({});
                }
            } else if (officeGeneralFromUrl && activeOfficeForChat && officeGeneralFromUrl === activeOfficeForChat.id) {
                await selectChat(`general-${activeOfficeForChat.id}`, 'general');
            } else if (activeOfficeForChat) {
                await selectChat(`general-${activeOfficeForChat.id}`, 'general');
            } else {
                setActiveChatId(null);
                setAllMessages({});
            }
        } catch (error) {
            console.error("Error initializing chat from URL:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not initialize chat." });
            if (activeOfficeForChat) {
                await selectChat(`general-${activeOfficeForChat.id}`, 'general');
            } else {
                setActiveChatId(null); setAllMessages({});
            }
        } finally {
            setIsLoadingMessages(false);
        }
    };
    
    // Ensure activeOfficeForChat status is determined (null or an office) before initializing
    if (activeOfficeForChat !== undefined || threadIdFromUrl) {
        initializeChat();
    }

}, [user, currentUserForChat, activeOfficeForChat, userOfficesList, searchParams, selectChat, activeChatId, toast, authLoading, router]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [allMessages, activeChatId, mobileView, isLoadingMessages]); 


  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChatId || !currentUserForChat || isSendingMessage) return;
    if (!activeChatType) {
        toast({title: "No Chat Selected", description: "Please select a chat."});
        return;
    }
    
    setIsSendingMessage(true);
    const tempMessageId = Date.now().toString();
    const optimisticMessage: ChatMessage = {
      id: tempMessageId, 
      text: newMessage,
      senderId: currentUserForChat.id,
      timestamp: new Date(),
      senderName: currentUserForChat.name,
      avatarUrl: currentUserForChat.avatarUrl,
      type: 'text',
      chatThreadId: activeChatId,
    };

    setAllMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), optimisticMessage]
    }));
    const currentMsgText = newMessage;
    setNewMessage("");

    try {
      let sentMessage: ChatMessage | null = null;
      if (activeChatType === 'dm' && activeChatTargetUser) {
        sentMessage = await addChatMessageAndNotify(activeChatId, currentMsgText, currentUserForChat, [currentUserForChat, activeChatTargetUser], activeOfficeForChat ? {officeId: activeOfficeForChat.id, officeName: activeOfficeForChat.name } : undefined);
      } else if (activeChatType === 'general' && activeOfficeForChat) {
        sentMessage = await addGeneralOfficeMessage(activeOfficeForChat.id, currentMsgText, currentUserForChat);
      }
      
      if (sentMessage) {
         setAllMessages(prev => ({
            ...prev,
            [activeChatId]: (prev[activeChatId] || []).map(m => m.id === tempMessageId ? sentMessage! : m)
         }));
      }

    } catch (error) {
      console.error("Error sending message:", error);
      toast({ variant: "destructive", title: "Send Error", description: "Failed to send message." });
      setAllMessages(prev => ({
        ...prev,
        [activeChatId]: (prev[activeChatId] || []).filter(m => m.id !== tempMessageId)
      }));
      setNewMessage(currentMsgText); 
    } finally {
      setIsSendingMessage(false);
    }
  };

  const addSystemMessage = (chatId: string, text: string, callDuration?: string) => {
    const systemMessage: ChatMessage = {
      id: Date.now().toString(), text, senderId: 'system', timestamp: new Date(), senderName: 'System', type: 'call_event', callDuration, chatThreadId: chatId,
    };
    setAllMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), systemMessage] }));
  };

  const handleToggleVideoCall = () => {
    if (!activeChatId || activeChatType !== 'dm' || !activeChatTargetUser) return;
    const callActive = !!isCallActiveForChat[activeChatId];
    const targetName = activeChatTargetUser.name;

    if (callActive) {
      const mockDuration = `${Math.floor(Math.random() * 5) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
      addSystemMessage(activeChatId, `Video call with ${targetName} ended.`, mockDuration);
      setIsCallActiveForChat(prev => ({ ...prev, [activeChatId]: false }));
      toast({ title: "Video Call Ended", description: `Call with ${targetName} has ended.` });
    } else {
      addSystemMessage(activeChatId, `Video call started with ${targetName}.`);
      setIsCallActiveForChat(prev => ({ ...prev, [activeChatId]: true }));
      toast({ title: "Video Call Started", description: `Attempting to call ${targetName}...` });
    }
  };

  const handleToggleVoiceRecording = () => {
     if (!currentUserForChat || !activeChatId || !activeChatType) return;

    if (isRecordingVoiceNote) {
      setIsRecordingVoiceNote(false);
      const endTime = Date.now();
      const durationMs = endTime - (voiceRecordingStartTimeRef.current || endTime);
      const durationSec = Math.max(1, Math.round(durationMs / 1000));
      voiceRecordingStartTimeRef.current = null;

      const voiceNoteText = `Voice Note (${String(Math.floor(durationSec / 60)).padStart(2, '0')}:${String(durationSec % 60).padStart(2, '0')})`;
      
      const tempMessageId = Date.now().toString();
      const optimisticMessage: ChatMessage = {
        id: tempMessageId,
        text: voiceNoteText,
        senderId: currentUserForChat.id,
        timestamp: new Date(),
        senderName: currentUserForChat.name,
        avatarUrl: currentUserForChat.avatarUrl,
        type: 'voice_note',
        voiceNoteDuration: `${String(Math.floor(durationSec / 60)).padStart(2, '0')}:${String(durationSec % 60).padStart(2, '0')}`,
        chatThreadId: activeChatId,
      };
      setAllMessages(prev => ({...prev, [activeChatId]: [...(prev[activeChatId] || []), optimisticMessage] }));
      
      if (activeChatType === 'dm' && activeChatTargetUser) {
          console.log("Sending voice note to DM:", voiceNoteText);
          toast({ title: "Voice Note Sent (Mock)", description: `Duration: ${optimisticMessage.voiceNoteDuration}`});
      } else if (activeChatType === 'general' && activeOfficeForChat) {
          console.log("Sending voice note to General:", voiceNoteText);
          toast({ title: "Voice Note Sent (Mock)", description: `Duration: ${optimisticMessage.voiceNoteDuration}`});
      }

    } else {
      setIsRecordingVoiceNote(true);
      voiceRecordingStartTimeRef.current = Date.now();
      toast({ title: "Recording Started", description: "Recording voice note..."});
    }
  };

  const getChatTitle = () => {
    if (!activeChatId) return "Select a Chat";
    if (activeChatType === 'general' && activeOfficeForChat) return `${activeOfficeForChat.name} General`;
    if (activeChatType === 'dm' && activeChatTargetUser) return activeChatTargetUser.name;
    return "Chat";
  };
  
  const handleMobileChatSelect = async (type: 'dm' | 'general', member?: ChatUser) => { // Changed member to ChatUser from OfficeMember
    if (!currentUserForChat || (type === 'general' && !activeOfficeForChat)) return;

    if (type === 'dm' && member) {
      const thread = await getOrCreateDmThread(currentUserForChat, member);
      await selectChat(thread.id, 'dm', member);
    } else if (type === 'general' && activeOfficeForChat) {
      await selectChat(`general-${activeOfficeForChat.id}`, 'general');
    }
  };

  const displayedMessages = activeChatId ? (allMessages[activeChatId] || []) : [];

  if (authLoading || !currentUserForChat) { 
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const renderChatList = (isMobileLayout: boolean) => {
    return (
      <Card className={cn("flex flex-col", isMobileLayout ? "flex-1 rounded-none border-0" : "w-64 sm:w-72 md:w-1/4 lg:w-1/5 mr-2 shadow-lg")}>
        <CardHeader className="p-3 border-b">
          <CardTitle className="font-headline text-lg">{activeOfficeForChat ? `${activeOfficeForChat.name} Chats` : "Chats"}</CardTitle>
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
                    key={member.id} // Changed from member.userId
                    variant={(activeChatType === 'dm' && activeChatTargetUser?.id === member.id) ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => handleMobileChatSelect('dm', member)}
                  >
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="person avatar" />
                      <AvatarFallback>{member.name.substring(0,1)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate flex-1 text-left">{member.name}</span>
                    <Badge variant="outline" className="ml-2 text-xs whitespace-nowrap">{member.role}</Badge>
                  </Button>
                ))}
                {currentOfficeMembers.length === 0 && <p className="text-xs text-muted-foreground p-2 text-center">No other members in this office for DMs.</p>}
              </>
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
                  <Button variant="ghost" size="icon" onClick={handleToggleVideoCall} aria-label={isCallActiveForChat[activeChatId] ? "End Call" : "Start Video Call"}>
                      {isCallActiveForChat[activeChatId] ? <PhoneOff className="h-5 w-5 text-destructive" /> : <Video className="h-5 w-5 text-primary" />}
                  </Button>
              )}
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
              {isLoadingMessages && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
              {!isLoadingMessages && displayedMessages.map((msg) => {
                const isUserSender = msg.senderId === currentUserForChat?.id;
                return (
                  <div key={msg.id} className={`flex items-end space-x-2 ${isUserSender ? 'justify-end' : ''}`}>
                  {!isUserSender && (<Avatar className="h-8 w-8"><AvatarImage src={msg.avatarUrl} alt={msg.senderName} data-ai-hint="person avatar"/><AvatarFallback>{msg.senderName?.substring(0,1) || 'S'}</AvatarFallback></Avatar>)}
                  <div className={`max-w-xs lg:max-w-md px-3 py-2 sm:px-4 sm:py-2 rounded-lg shadow ${isUserSender ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {!isUserSender && <p className="text-xs font-semibold mb-1">{msg.senderName}</p>}
                      
                      {msg.type === 'voice_note' && msg.voiceNoteDuration ? (
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Play className="h-4 w-4"/></Button>
                          <span className="text-sm">{msg.voiceNoteDuration}</span>
                        </div>
                      ) : msg.type === 'call_event' ? (
                        <p className="text-sm italic text-muted-foreground/80">{msg.text} {msg.callDuration && `(Duration: ${msg.callDuration})`}</p>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      )}

                      <p className={`text-xs mt-1 ${isUserSender ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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
          </CardContent>
          <div className={cn("border-t bg-background", isMobileLayout ? "p-2" : "p-4")}>
              <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon" aria-label="Attach file" className={cn(isMobileLayout && "h-8 w-8")} disabled={!activeChatId}><Paperclip className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
                  <Button variant="ghost" size="icon" onClick={handleToggleVoiceRecording} aria-label={isRecordingVoiceNote ? "Stop recording" : "Record voice note"} className={cn(isMobileLayout && "h-8 w-8", isRecordingVoiceNote && "text-destructive animate-pulse")} disabled={!activeChatId || isSendingMessage}><mrowisRecordingVoiceNote ? <Square className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />} </Button>
                  {isRecordingVoiceNote ? (<p className="text-sm text-muted-foreground flex-1">Recording voice note...</p>) : (
                      <Input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && !isRecordingVoiceNote && !isSendingMessage && handleSendMessage()} className="flex-1" disabled={!activeChatId || isRecordingVoiceNote || isSendingMessage}/>
                  )}
                  <Button onClick={handleSendMessage} aria-label="Send message" disabled={!activeChatId || isRecordingVoiceNote || newMessage.trim() === "" || isSendingMessage} className={cn(isMobileLayout && "h-9 px-3")}>
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
    
