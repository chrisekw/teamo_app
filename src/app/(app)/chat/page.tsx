
"use client";

import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, Users, MessageSquareText, ArrowLeft, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// --- Enums and Types (Redefined for this page, ideally from a shared types file) ---
type MemberRole = "Owner" | "Admin" | "Member" | "Tech" | "Designer" | "Lead";

interface Member {
  id: string;
  name: string;
  role: MemberRole;
  avatarUrl?: string;
}

interface Office { // Simplified for chat context
  id: string;
  name: string;
  members: Member[];
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: Date;
  avatarUrl?: string;
  senderName: string;
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
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  
  const [activeChatId, setActiveChatId] = useState<string>("general");
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>({});
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [currentOfficeMembers, setCurrentOfficeMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (isMobile === undefined) return; // Wait for isMobile to be initialized

    if (isMobile) {
      if (mobileView !== 'list' && !activeChatId) { // If somehow in chat view without active chat, go to list
        setMobileView('list');
      }
    } else { // Desktop
      if (!activeChatId) {
        setActiveChatId("general"); // Ensure a chat is active
      }
    }
  }, [isMobile, activeChatId, mobileView]);


  useEffect(() => {
    setCurrentOfficeMembers(mockOffice.members.filter(m => m.id !== mockCurrentUser.id));

    const member1 = mockOffice.members.find(m => m.id === 'member-1');
    const member2 = mockOffice.members.find(m => m.id === 'member-2');

    setAllMessages({
      "general": [
        { id: 'g1', text: 'Hey team, how is the project going?', sender: 'other', timestamp: new Date(Date.now() - 1000 * 60 * 5), avatarUrl: member1?.avatarUrl, senderName: member1?.name || 'Jane Doe' },
        { id: 'g2', text: 'Making good progress on my end! Should have the UI mockups ready by EOD.', sender: 'other', timestamp: new Date(Date.now() - 1000 * 60 * 3), avatarUrl: member2?.avatarUrl, senderName: member2?.name || 'Steve Miller' },
        { id: 'g3', text: 'Great to hear, Steve! I am working on the backend API integration.', sender: 'user', timestamp: new Date(Date.now() - 1000 * 60 * 1), avatarUrl: mockCurrentUser.avatarUrl, senderName: mockCurrentUser.name },
      ],
      "member-1": [
        { id: 'dm1-1', text: 'Hi Jane, need your help with the API.', sender: 'user', timestamp: new Date(Date.now() - 1000 * 60 * 10), avatarUrl: mockCurrentUser.avatarUrl, senderName: mockCurrentUser.name },
        { id: 'dm1-2', text: 'Sure, what do you need?', sender: 'other', timestamp: new Date(Date.now() - 1000 * 60 * 8), avatarUrl: member1?.avatarUrl, senderName: member1?.name || 'Jane Doe'},
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
  }, [allMessages, activeChatId, mobileView]); // Re-check scroll on mobileView change too


  const handleSendMessage = () => {
    if (newMessage.trim() === "" || !activeChatId) return;
    
    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date(),
      senderName: mockCurrentUser.name,
      avatarUrl: mockCurrentUser.avatarUrl,
    };

    setAllMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), message]
    }));
    setNewMessage("");
  };

  const getChatTitle = () => {
    if (activeChatId === "general") return "General Team Chat";
    const member = mockOffice.members.find(m => m.id === activeChatId);
    return member ? `${member.name}` : "Chat"; // Simpler title for mobile
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
            "border-b",
            isMobileLayout && "flex flex-row items-center space-x-2 py-3 px-2 sm:px-4" // Adjusted padding for mobile
        )}>
            {isMobileLayout && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileView('list')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            )}
            <CardTitle className={cn("font-headline", isMobileLayout ? "text-lg" : "text-xl")}>{getChatTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
            {displayedMessages.map((msg) => (
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
                    className={`max-w-xs lg:max-w-md px-3 py-2 sm:px-4 sm:py-2 rounded-lg shadow ${ // Adjusted padding for mobile
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
            ))}
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
            <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
            disabled={!activeChatId}
            />
            <Button onClick={handleSendMessage} aria-label="Send message" disabled={!activeChatId} className={cn(isMobileLayout && "h-9 px-3")}>
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
        </div>
        </div>
    </Card>
  );


  return (
    <div className={cn("h-full", !isMobile ? "flex p-2" : "flex flex-col")}>
      <style jsx global>{`
        :root {
          --header-height: 56px; /* Ensure this is defined if used, or remove if h-full is sufficient */
        }
      `}</style>
      
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

