"use client";

import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: Date;
  avatarUrl?: string;
  senderName: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Mock initial messages
  useEffect(() => {
    setMessages([
      { id: '1', text: 'Hey team, how is the project going?', sender: 'other', timestamp: new Date(Date.now() - 1000 * 60 * 5), avatarUrl: 'https://placehold.co/40x40.png?text=JD', senderName: 'Jane Doe' },
      { id: '2', text: 'Making good progress on my end! Should have the UI mockups ready by EOD.', sender: 'other', timestamp: new Date(Date.now() - 1000 * 60 * 3), avatarUrl: 'https://placehold.co/40x40.png?text=SM', senderName: 'Steve Miller' },
      { id: '3', text: 'Great to hear, Steve! I am working on the backend API integration.', sender: 'user', timestamp: new Date(Date.now() - 1000 * 60 * 1), avatarUrl: 'https://placehold.co/40x40.png?text=YU', senderName: 'You' },
    ]);
  }, []);
  
  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);


  const handleSendMessage = () => {
    if (newMessage.trim() === "") return;
    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date(),
      senderName: 'You',
      avatarUrl: 'https://placehold.co/40x40.png?text=YU'
    };
    setMessages([...messages, message]);
    setNewMessage("");
  };

  return (
    <div className="container mx-auto p-0 sm:p-2 lg:p-4 h-[calc(100vh-var(--header-height,56px)-2rem)] flex flex-col">
      <style jsx global>{`
        :root {
          --header-height: 56px; /* Adjust if your header height is different */
        }
      `}</style>
      <Card className="flex-1 flex flex-col shadow-lg h-full">
        <CardHeader className="border-b">
          <CardTitle className="font-headline text-xl">General Team Chat</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((msg) => (
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
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow ${
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
            </div>
          </ScrollArea>
        </CardContent>
        <div className="border-t p-4 bg-background">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" aria-label="Attach file">
              <Paperclip className="h-5 w-5" />
            </Button>
            <Input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} aria-label="Send message">
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
