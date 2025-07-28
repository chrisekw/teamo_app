
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Video, PhoneOff, Users, ArrowLeft } from "lucide-react";
import type { Meeting } from "@/types";
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';


interface VideoCallViewProps {
    selectedMeeting: Meeting;
    user: FirebaseUser;
    onLeaveMeeting: () => void;
}

export function VideoCallView({ 
    selectedMeeting, 
    user, 
    onLeaveMeeting,
}: VideoCallViewProps) {
    const [isLoading, setIsLoading] = useState(true);

    const jitsiRoomName = useMemo(() => {
        // Create a unique, URL-safe room name from the office and meeting IDs
        if (!selectedMeeting) return '';
        const combinedId = `${selectedMeeting.officeId}-${selectedMeeting.id}`;
        // Basic sanitization to ensure it's a valid room name
        return combinedId.replace(/[^a-zA-Z0-9]/g, '');
    }, [selectedMeeting]);

    const jitsiUrl = `https://meet.jit.si/${jitsiRoomName}`;
    
    // Simulate loading the iframe
    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex h-screen w-screen flex-col bg-background text-foreground">
            <header className="flex h-16 flex-shrink-0 items-center justify-between border-b px-4">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={onLeaveMeeting} className="h-8 w-8">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold truncate">{selectedMeeting.title}</h1>
                        <p className="text-sm text-muted-foreground">Jitsi Video Call</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="destructive" size="sm" onClick={onLeaveMeeting}>
                       <PhoneOff className="mr-2 h-4 w-4" /> Leave
                    </Button>
                </div>
            </header>

            <main className="flex-1 relative bg-muted/20">
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary"/>
                        <p className="mt-4 text-muted-foreground">Joining video conference...</p>
                    </div>
                )}
                 <iframe
                    src={jitsiUrl}
                    allow="camera; microphone; fullscreen; display-capture"
                    className={cn(
                        "h-full w-full border-0 transition-opacity duration-500",
                        isLoading ? "opacity-0" : "opacity-100"
                    )}
                    onLoad={() => setIsLoading(false)}
                ></iframe>
            </main>
        </div>
    );
}
