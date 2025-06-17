
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from "next/link"; // Added missing import
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
import type { ChatMessage, ChatUser, Office, OfficeMember } from "@/types";
import { getOfficesForUser, getMembersForOffice } from '@/lib/firebase/firestore/offices'; // To get members for DMs

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [activeChatId, setActiveChatId] = useState<string>("initial-placeholder"); 
  const [allMessages, setAllMessages] = useState<Record<string, ChatMessage[]>>({}); 
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const [currentUserForChat, setCurrentUserForChat] = useState<ChatUser | null>(null);
  const [currentOfficeMembers, setCurrentOfficeMembers] = useState<ChatUser[]>([]); 
  const [activeOfficeForChat, setActiveOfficeForChat] = useState<Office | null>(null);


  const [isCallActiveForChat, setIsCallActiveForChat] = useState<Record<string, boolean>>({});
  const [isRecordingVoiceNote, setIsRecordingVoiceNote] = useState(false);
  const voiceRecordingStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchInitialChatContext = async () => {
      if (user) {
        const offices = await getOfficesForUser(user.uid);
        if (offices.length > 0) {
          const firstOffice = offices[0];
          setActiveOfficeForChat(firstOffice);
          setActiveChatId(`general-${firstOffice.id}`); 

          const members = await getMembersForOffice(firstOffice.id);
          const chatUsers: ChatUser[] = members.map(m => ({
            id: m.userId,
            name: m.name,
            role: m.role,
            avatarUrl: m.avatarUrl,
          }));
          setCurrentOfficeMembers(chatUsers.filter(m => m.id !== user.uid));
        } else {
          setActiveOfficeForChat(null);
          setCurrentOfficeMembers([]);
          setActiveChatId("initial-placeholder");
        }
      }
    };
    if (user && !authLoading) {
      fetchInitialChatContext();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      const chatUser: ChatUser = {
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'You',
        role: 'Lead', 
        avatarUrl: user.photoURL || `https://placehold.co/40x40.png?text=${(user.displayName || 'U').substring(0,1)}`,
      };
      setCurrentUserForChat(chatUser);

      if (activeOfficeForChat && currentOfficeMembers.length >= 0) { // Allow empty currentOfficeMembers for general chat
          const member1 = currentOfficeMembers.find(m => m.id !== user.uid);

          setAllMessages({
            [`general-${activeOfficeForChat.id}`]: [
              { id: 'g1', text: `Welcome to ${activeOfficeForChat.name} general chat!`, senderId: 'system', timestamp: new Date(Date.now() - 1000 * 60 * 5), senderName: 'System', type: 'text', chatThreadId: `general-${activeOfficeForChat.id}` },
            ],
            ...(member1 ? {
                [member1.id]: [ 
                { id: 'dm1-1', text: `Hi ${member1.name}, let's chat.`, senderId: chatUser.id, timestamp: new Date(Date.now() - 1000 * 60 * 10), avatarUrl: chatUser.avatarUrl, senderName: chatUser.name, type: 'text', chatThreadId: member1.id },
                ]
            } : {})
          });
          if (activeChatId === "initial-placeholder") { // If was initial, now set to general
            setActiveChatId(`general-${activeOfficeForChat.id}`);
          }

      } else {
         setAllMessages({
            "initial-placeholder": [
                 { id: 'g1', text: `Select an office or join one to start chatting.`, senderId: 'system', timestamp: new Date(Date.now() - 1000 * 60 * 5), senderName: 'System', type: 'text', chatThreadId: "initial-placeholder" },
            ]
         });
         setActiveChatId("initial-placeholder");
      }
    }
  }, [user, activeOfficeForChat, currentOfficeMembers]);


  useEffect(() => {
    if (isMobile === undefined) return; 
    if (isMobile) {
      if (mobileView !== 'list' && !activeChatId) {
        setMobileView('list');
      }
    } else { 
      if (!activeChatId && activeOfficeForChat) {
        setActiveChatId(`general-${activeOfficeForChat.id}`); 
      } else if (!activeChatId && !activeOfficeForChat){
        setActiveChatId("initial-placeholder");
      }
    }
  }, [isMobile, activeChatId, mobileView, activeOfficeForChat]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [allMessages, activeChatId, mobileView]); 


  const handleSendMessage = () => {
    if (newMessage.trim() === "" || !activeChatId || !currentUserForChat) return;
    if (activeChatId === "initial-placeholder") {
        toast({title: "No Chat Selected", description: "Please select or join an office."});
        return;
    }
    
    const message: ChatMessage = {
      id: Date.now().toString(), 
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
      [activeChatId]: [...(prev[activeChatId] || []), message]
    }));
    setNewMessage("");
  };

  const addSystemMessage = (chatId: string, text: string, callDuration?: string) => {
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      senderId: 'system', 
      timestamp: new Date(),
      senderName: 'System', 
      type: 'call_event',
      callDuration,
      chatThreadId: chatId,
    };
    setAllMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), systemMessage]
    }));
  };

  const handleToggleVideoCall = () => {
    if (!activeChatId || activeChatId.startsWith("general-") || activeChatId === "initial-placeholder") return;

    const callActive = !!isCallActiveForChat[activeChatId];
    const targetMember = currentOfficeMembers.find(m => m.id === activeChatId);
    const targetName = targetMember?.name || "user";

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
    if (!currentUserForChat || !activeChatId || activeChatId === "initial-placeholder") return;

    if (isRecordingVoiceNote) {
      setIsRecordingVoiceNote(false);
      const endTime = Date.now();
      const durationMs = endTime - (voiceRecordingStartTimeRef.current || endTime);
      const durationSec = Math.max(1, Math.round(durationMs / 1000));
      voiceRecordingStartTimeRef.current = null;

      const voiceNote: ChatMessage = {
        id: Date.now().toString(),
        text: `Voice Note`,
        senderId: currentUserForChat.id,
        timestamp: new Date(),
        senderName: currentUserForChat.name,
        avatarUrl: currentUserForChat.avatarUrl,
        type: 'voice_note',
        voiceNoteDuration: `${String(Math.floor(durationSec / 60)).padStart(2, '0')}:${String(durationSec % 60).padStart(2, '0')}`,
        chatThreadId: activeChatId,
      };
      setAllMessages(prev => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), voiceNote]
      }));
      toast({ title: "Voice Note Sent", description: `Duration: ${voiceNote.voiceNoteDuration}`});
    } else {
      setIsRecordingVoiceNote(true);
      voiceRecordingStartTimeRef.current = Date.now();
      toast({ title: "Recording Started", description: "Recording voice note..."});
    }
  };


  const getChatTitle = () => {
    if (activeChatId === "initial-placeholder") return "Select a Chat";
    if (activeChatId.startsWith("general-") && activeOfficeForChat) return `${activeOfficeForChat.name} General`;
    const member = currentOfficeMembers.find(m => m.id === activeChatId);
    return member ? `${member.name}` : "Chat";
  };
  
  const handleMobileChatSelect = (id: string) => {
    setActiveChatId(id);
    setMobileView('chat');
  };

  const displayedMessages = allMessages[activeChatId] || [];

  if (authLoading || !currentUserForChat) { 
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const renderChatList = (isMobileLayout: boolean) => (
    <Card className={cn(
      "flex flex-col",
      isMobileLayout ? "flex-1 rounded-none border-0" : "w-64 sm:w-72 md:w-1/4 lg:w-1/5 mr-2 shadow-lg"
    )}>
      <CardHeader className="p-3 border-b">
        <CardTitle className="font-headline text-lg">
          {activeOfficeForChat ? `${activeOfficeForChat.name} Chats` : "Chats"}
        </CardTitle>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="p-2 space-y-1">
          {activeOfficeForChat ? (
            <>
              <Button
                variant={activeChatId === `general-${activeOfficeForChat.id}` ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => isMobileLayout ? handleMobileChatSelect(`general-${activeOfficeForChat.id}`) : setActiveChatId(`general-${activeOfficeForChat.id}`)}
              >
                <Users className="mr-2 h-4 w-4" /> General
              </Button>
              <Separator className="my-2" />
              <p className="text-sm font-medium text-muted-foreground px-1 py-1">Direct Messages</p>
              {currentOfficeMembers.map(member => (
                <Button
                  key={member.id}
                  variant={activeChatId === member.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => isMobileLayout ? handleMobileChatSelect(member.id) : setActiveChatId(member.id)}
                >
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="person avatar" />
                    <AvatarFallback>{member.name.substring(0,1)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate flex-1 text-left">{member.name}</span>
                  <Badge variant="outline" className="ml-2 text-xs whitespace-nowrap">{member.role}</Badge>
                </Button>
              ))}
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

  const renderMessageView = (isMobileLayout: boolean) => (
     <Card className={cn(
        "flex-1 flex flex-col h-full",
        isMobileLayout ? "rounded-none border-0" : "shadow-lg" 
     )}>
        <CardHeader className={cn(
            "border-b flex flex-row items-center justify-between", 
            isMobileLayout ? "py-3 px-2 sm:px-4 space-x-2" : "py-4 px-4" 
        )}>
            <div className="flex items-center space-x-2">
                {isMobileLayout && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileView('list')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                )}
                <CardTitle className={cn("font-headline", isMobileLayout ? "text-lg" : "text-xl")}>{getChatTitle()}</CardTitle>
            </div>
            {activeChatId && !activeChatId.startsWith("general-") && activeChatId !== "initial-placeholder" && (
                 <Button variant="ghost" size="icon" onClick={handleToggleVideoCall} aria-label={isCallActiveForChat[activeChatId] ? "End Call" : "Start Video Call"}>
                    {isCallActiveForChat[activeChatId] ? <PhoneOff className="h-5 w-5 text-destructive" /> : <Video className="h-5 w-5 text-primary" />}
                </Button>
            )}
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
            {displayedMessages.map((msg) => {
              const isUserSender = msg.senderId === currentUserForChat?.id;
              if (msg.type === 'call_event') {
                return (
                  <div key={msg.id} className="text-center my-2">
                    <p className="text-xs text-muted-foreground italic px-2 py-1 bg-muted/50 rounded-md inline-block">
                      {msg.text} {msg.callDuration && `(Duration: ${msg.callDuration})`}
                    </p>
                  </div>
                );
              }
              if (msg.type === 'voice_note') {
                 return (
                    <div
                        key={msg.id}
                        className={`flex items-end space-x-2 ${isUserSender ? 'justify-end' : ''}`}
                    >
                        {!isUserSender && (
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={msg.avatarUrl} alt={msg.senderName} data-ai-hint="person avatar"/>
                                <AvatarFallback>{msg.senderName?.substring(0,1) || 'S'}</AvatarFallback>
                            </Avatar>
                        )}
                        <div
                            className={`flex items-center space-x-2 max-w-xs lg:max-w-md px-3 py-2 sm:px-4 sm:py-2 rounded-lg shadow ${
                            isUserSender ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            }`}
                        >
                            <Button variant="ghost" size="icon" className={`h-7 w-7 ${isUserSender ? 'text-primary-foreground hover:bg-primary/80' : 'text-foreground hover:bg-muted/80'}`} aria-label="Play voice note">
                                <Play className="h-4 w-4" />
                            </Button>
                            <div className="flex flex-col">
                                <span className="text-sm">{msg.text}</span>
                                <span className={`text-xs ${isUserSender ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>{msg.voiceNoteDuration}</span>
                            </div>
                        </div>
                         {isUserSender && (
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={msg.avatarUrl} alt={msg.senderName} data-ai-hint="person avatar"/>
                                <AvatarFallback>{msg.senderName.substring(0,1)}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                 );
              }
              return (
                <div
                key={msg.id}
                className={`flex items-end space-x-2 ${
                    isUserSender ? 'justify-end' : ''
                }`}
                >
                {!isUserSender && (
                    <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.avatarUrl} alt={msg.senderName} data-ai-hint="person avatar"/>
                    <AvatarFallback>{msg.senderName?.substring(0,1) || 'S'}</AvatarFallback>
                    </Avatar>
                )}
                <div
                    className={`max-w-xs lg:max-w-md px-3 py-2 sm:px-4 sm:py-2 rounded-lg shadow ${ 
                    isUserSender
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                >
                    {!isUserSender && <p className="text-xs font-semibold mb-1">{msg.senderName}</p>}
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-xs mt-1 ${isUserSender ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                {isUserSender && (
                    <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.avatarUrl} alt={msg.senderName} data-ai-hint="person avatar"/>
                    <AvatarFallback>{msg.senderName.substring(0,1)}</AvatarFallback>
                    </Avatar>
                )}
                </div>
            );
            })}
            {displayedMessages.length === 0 && (
                <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-full pt-10">
                    <MessageSquareText className="h-12 w-12 mb-2"/>
                    <p>No messages in this chat yet.</p>
                    <p className="text-xs">Start the conversation!</p>
                </div>
            )}
            </div>
        </ScrollArea>
        </CardContent>
        <div className={cn("border-t bg-background", isMobileLayout ? "p-2" : "p-4")}>
            <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" aria-label="Attach file" className={cn(isMobileLayout && "h-8 w-8")}>
                    <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleToggleVoiceRecording} aria-label={isRecordingVoiceNote ? "Stop recording" : "Record voice note"} className={cn(isMobileLayout && "h-8 w-8", isRecordingVoiceNote && "text-destructive animate-pulse")}>
                    {isRecordingVoiceNote ? <Square className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
                </Button>
                {isRecordingVoiceNote ? (
                     <p className="text-sm text-muted-foreground flex-1">Recording voice note...</p>
                ) : (
                    <Input
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isRecordingVoiceNote && handleSendMessage()}
                        className="flex-1"
                        disabled={!activeChatId || isRecordingVoiceNote || activeChatId === "initial-placeholder"}
                    />
                )}
                <Button onClick={handleSendMessage} aria-label="Send message" disabled={!activeChatId || isRecordingVoiceNote || newMessage.trim() === "" || activeChatId === "initial-placeholder"} className={cn(isMobileLayout && "h-9 px-3")}>
                    <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
            </div>
        </div>
    </Card>
  );

  return (
    <div className={cn("h-full", !isMobile ? "flex p-2" : "flex flex-col")}>
      {isMobile ? (
        mobileView === 'list' ? renderChatList(true) : renderMessageView(true)
      ) : (
        <>
          {renderChatList(false)}
          <div className="flex-1 flex flex-col h-full">
            {renderMessageView(false)}
          </div>
        </>
      )}
    </div>
  );
}

