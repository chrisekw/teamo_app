
"use client";

import { useState, useEffect, useRef } from 'react';
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

// --- Enums and Types ---
type MemberRole = "Owner" | "Admin" | "Member" | "Tech" | "Designer" | "Lead";

interface Member {
  id: string;
  name: string;
  role: MemberRole;
  avatarUrl?: string;
}

interface Office {
  id: string;
  name: string;
  members: Member[];
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'other' | 'system';
  timestamp: Date;
  avatarUrl?: string;
  senderName: string;
  type?: 'text' | 'voice_note' | 'call_event';
  callDuration?: string; // For call_event type
  voiceNoteDuration?: string; // For voice_note type
}
// --- End Types ---

// Mock Office Data
const mockCurrentUser: Member = {
  id: 'user-current',
  name: 'You',
  role: 'Lead', 
  avatarUrl: 'https://placehold.co/40x40.png?text=YU',
};

const mockOffice: Office = {
  id: 'office-1',
  name: 'Teamo HQ',
  members: [
    mockCurrentUser,
    { id: 'member-1', name: 'Jane Doe', role: 'Tech', avatarUrl: 'https://placehold.co/40x40.png?text=JD' },
    { id: 'member-2', name: 'Steve Miller', role: 'Designer', avatarUrl: 'https://placehold.co/40x40.png?text=SM' },
    { id: 'member-3', name: 'Alice Wonderland', role: 'Member', avatarUrl: 'https://placehold.co/40x40.png?text=AW' },
    { id: 'member-4', name: 'Bob The Builder', role: 'Tech', avatarUrl: 'https://placehold.co/40x40.png?text=BB' },
  ],
};
// --- End Mock Data ---


export default function ChatPage() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  
  const [activeChatId, setActiveChatId] = useState<string>("general");
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>({});
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [currentOfficeMembers, setCurrentOfficeMembers] = useState<Member[]>([]);

  // Video call and voice note states
  const [isCallActiveForChat, setIsCallActiveForChat] = useState<Record<string, boolean>>({}); // { [chatId]: boolean }
  const [isRecordingVoiceNote, setIsRecordingVoiceNote] = useState(false);
  const voiceRecordingStartTimeRef = useRef<number | null>(null);


  useEffect(() => {
    if (isMobile === undefined) return; 

    if (isMobile) {
      if (mobileView !== 'list' && !activeChatId) {
        setMobileView('list');
      }
    } else { 
      if (!activeChatId) {
        setActiveChatId("general"); 
      }
    }
  }, [isMobile, activeChatId, mobileView]);


  useEffect(() => {
    setCurrentOfficeMembers(mockOffice.members.filter(m => m.id !== mockCurrentUser.id));

    const member1 = mockOffice.members.find(m => m.id === 'member-1');
    const member2 = mockOffice.members.find(m => m.id === 'member-2');

    setAllMessages({
      "general": [
        { id: 'g1', text: 'Hey team, how is the project going?', sender: 'other', timestamp: new Date(Date.now() - 1000 * 60 * 5), avatarUrl: member1?.avatarUrl, senderName: member1?.name || 'Jane Doe', type: 'text' },
        { id: 'g2', text: 'Making good progress on my end! Should have the UI mockups ready by EOD.', sender: 'other', timestamp: new Date(Date.now() - 1000 * 60 * 3), avatarUrl: member2?.avatarUrl, senderName: member2?.name || 'Steve Miller', type: 'text' },
        { id: 'g3', text: 'Great to hear, Steve! I am working on the backend API integration.', sender: 'user', timestamp: new Date(Date.now() - 1000 * 60 * 1), avatarUrl: mockCurrentUser.avatarUrl, senderName: mockCurrentUser.name, type: 'text' },
      ],
      "member-1": [
        { id: 'dm1-1', text: 'Hi Jane, need your help with the API.', sender: 'user', timestamp: new Date(Date.now() - 1000 * 60 * 10), avatarUrl: mockCurrentUser.avatarUrl, senderName: mockCurrentUser.name, type: 'text' },
        { id: 'dm1-2', text: 'Sure, what do you need?', sender: 'other', timestamp: new Date(Date.now() - 1000 * 60 * 8), avatarUrl: member1?.avatarUrl, senderName: member1?.name || 'Jane Doe', type: 'text'},
      ]
    });
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [allMessages, activeChatId, mobileView]); 


  const handleSendMessage = () => {
    if (newMessage.trim() === "" || !activeChatId) return;
    
    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date(),
      senderName: mockCurrentUser.name,
      avatarUrl: mockCurrentUser.avatarUrl,
      type: 'text',
    };

    setAllMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), message]
    }));
    setNewMessage("");
  };

  const addSystemMessage = (chatId: string, text: string, callDuration?: string) => {
    const systemMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'system',
      timestamp: new Date(),
      senderName: 'System', // System messages don't typically have avatars or distinct sender names
      type: 'call_event',
      callDuration,
    };
    setAllMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), systemMessage]
    }));
  };

  const handleToggleVideoCall = () => {
    if (!activeChatId || activeChatId === "general") return;

    const callActive = !!isCallActiveForChat[activeChatId];
    const targetMember = mockOffice.members.find(m => m.id === activeChatId);
    const targetName = targetMember?.name || "user";

    if (callActive) {
      // End call
      const mockDuration = `${Math.floor(Math.random() * 5) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
      addSystemMessage(activeChatId, `Video call with ${targetName} ended.`, mockDuration);
      setIsCallActiveForChat(prev => ({ ...prev, [activeChatId]: false }));
      toast({ title: "Video Call Ended", description: `Call with ${targetName} has ended.` });
    } else {
      // Start call
      addSystemMessage(activeChatId, `Video call started with ${targetName}.`);
      setIsCallActiveForChat(prev => ({ ...prev, [activeChatId]: true }));
      toast({ title: "Video Call Started", description: `Attempting to call ${targetName}...` });
    }
  };

  const handleToggleVoiceRecording = () => {
    if (isRecordingVoiceNote) {
      // Stop recording
      setIsRecordingVoiceNote(false);
      const endTime = Date.now();
      const durationMs = endTime - (voiceRecordingStartTimeRef.current || endTime);
      const durationSec = Math.max(1, Math.round(durationMs / 1000)); // Min 1 sec
      voiceRecordingStartTimeRef.current = null;

      const voiceNote: Message = {
        id: Date.now().toString(),
        text: `Voice Note`,
        sender: 'user',
        timestamp: new Date(),
        senderName: mockCurrentUser.name,
        avatarUrl: mockCurrentUser.avatarUrl,
        type: 'voice_note',
        voiceNoteDuration: `${String(Math.floor(durationSec / 60)).padStart(2, '0')}:${String(durationSec % 60).padStart(2, '0')}`,
      };
      setAllMessages(prev => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), voiceNote]
      }));
      toast({ title: "Voice Note Sent", description: `Duration: ${voiceNote.voiceNoteDuration}`});
    } else {
      // Start recording
      setIsRecordingVoiceNote(true);
      voiceRecordingStartTimeRef.current = Date.now();
      toast({ title: "Recording Started", description: "Recording voice note..."});
    }
  };


  const getChatTitle = () => {
    if (activeChatId === "general") return "General Team Chat";
    const member = mockOffice.members.find(m => m.id === activeChatId);
    return member ? `${member.name}` : "Chat";
  };
  
  const handleMobileChatSelect = (id: string) => {
    setActiveChatId(id);
    setMobileView('chat');
  };

  const displayedMessages = allMessages[activeChatId] || [];

  if (isMobile === undefined) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const renderChatList = (isMobileLayout: boolean) => (
    <Card className={cn(
      "flex flex-col",
      isMobileLayout ? "flex-1 rounded-none border-0" : "w-64 sm:w-72 md:w-1/4 lg:w-1/5 mr-2 shadow-lg"
    )}>
      <CardHeader className="p-3 border-b">
        <CardTitle className="font-headline text-lg">Chats</CardTitle>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="p-2 space-y-1">
          <Button
            variant={activeChatId === "general" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => isMobileLayout ? handleMobileChatSelect("general") : setActiveChatId("general")}
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
            "border-b flex flex-row items-center justify-between", // Added justify-between
            isMobileLayout ? "py-3 px-2 sm:px-4 space-x-2" : "py-4 px-4" // Adjusted padding & space
        )}>
            <div className="flex items-center space-x-2">
                {isMobileLayout && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileView('list')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                )}
                <CardTitle className={cn("font-headline", isMobileLayout ? "text-lg" : "text-xl")}>{getChatTitle()}</CardTitle>
            </div>
            {activeChatId !== "general" && (
                 <Button variant="ghost" size="icon" onClick={handleToggleVideoCall} aria-label={isCallActiveForChat[activeChatId] ? "End Call" : "Start Video Call"}>
                    {isCallActiveForChat[activeChatId] ? <PhoneOff className="h-5 w-5 text-destructive" /> : <Video className="h-5 w-5 text-primary" />}
                </Button>
            )}
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
            {displayedMessages.map((msg) => {
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
                        className={`flex items-end space-x-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}
                    >
                        {msg.sender === 'other' && (
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={msg.avatarUrl} alt={msg.senderName} data-ai-hint="person avatar"/>
                                <AvatarFallback>{msg.senderName.substring(0,1)}</AvatarFallback>
                            </Avatar>
                        )}
                        <div
                            className={`flex items-center space-x-2 max-w-xs lg:max-w-md px-3 py-2 sm:px-4 sm:py-2 rounded-lg shadow ${
                            msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            }`}
                        >
                            <Button variant="ghost" size="icon" className={`h-7 w-7 ${msg.sender === 'user' ? 'text-primary-foreground hover:bg-primary/80' : 'text-foreground hover:bg-muted/80'}`} aria-label="Play voice note">
                                <Play className="h-4 w-4" />
                            </Button>
                            <div className="flex flex-col">
                                <span className="text-sm">{msg.text}</span>
                                <span className={`text-xs ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>{msg.voiceNoteDuration}</span>
                            </div>
                        </div>
                         {msg.sender === 'user' && (
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={msg.avatarUrl} alt={msg.senderName} data-ai-hint="person avatar"/>
                                <AvatarFallback>{msg.senderName.substring(0,1)}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                 );
              }
              // Default text message rendering
              return (
                <div
                key={msg.id}
                className={`flex items-end space-x-2 ${
                    msg.sender === 'user' ? 'justify-end' : ''
                }`}
                >
                {msg.sender === 'other' && (
                    <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.avatarUrl} alt={msg.senderName} data-ai-hint="person avatar"/>
                    <AvatarFallback>{msg.senderName.substring(0,1)}</AvatarFallback>
                    </Avatar>
                )}
                <div
                    className={`max-w-xs lg:max-w-md px-3 py-2 sm:px-4 sm:py-2 rounded-lg shadow ${ 
                    msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                >
                    {msg.sender === 'other' && <p className="text-xs font-semibold mb-1">{msg.senderName}</p>}
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                {msg.sender === 'user' && (
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
                    {isRecordingVoiceNote ? <Square className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm-w-5" />}
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
                        disabled={!activeChatId || isRecordingVoiceNote}
                    />
                )}
                <Button onClick={handleSendMessage} aria-label="Send message" disabled={!activeChatId || isRecordingVoiceNote || newMessage.trim() === ""} className={cn(isMobileLayout && "h-9 px-3")}>
                    <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
            </div>
        </div>
    </Card>
  );


  return (
    <div className={cn("h-full", !isMobile ? "flex p-2" : "flex flex-col")}>
      {/* Removed style jsx global as it was empty */}
      
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

