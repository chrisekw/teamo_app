
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Video, VideoOff, MicOff, ScreenShare, PhoneOff, Users } from "lucide-react"; // Added Users
import type { Meeting, OfficeMember } from "@/types"; // Added OfficeMember
import { useEffect, useState } from 'react';
import { getMembersForOffice } from '@/lib/firebase/firestore/offices';
import { Skeleton } from '../ui/skeleton';

interface VideoCallViewProps {
    selectedMeeting: Meeting | null;
    user: FirebaseUser | null;
    onLeaveMeeting: () => void;
    videoRef: React.RefObject<HTMLVideoElement>;
    isJoining: boolean;
    hasCameraPermission?: boolean;
}

export function VideoCallView({ 
    selectedMeeting, 
    user, 
    onLeaveMeeting, 
    videoRef,
    isJoining,
    hasCameraPermission
}: VideoCallViewProps) {
    const [meetingParticipantsDetails, setMeetingParticipantsDetails] = useState<OfficeMember[]>([]);
    const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);

    useEffect(() => {
        const fetchParticipants = async () => {
            if (selectedMeeting && selectedMeeting.officeId && selectedMeeting.participantIds) {
                setIsLoadingParticipants(true);
                try {
                    const officeMembers = await getMembersForOffice(selectedMeeting.officeId);
                    const participants = officeMembers.filter(member => 
                        selectedMeeting.participantIds!.includes(member.userId) || member.userId === selectedMeeting.creatorUserId
                    );
                    setMeetingParticipantsDetails(participants);
                } catch (error) {
                    console.error("Error fetching participant details for meeting view:", error);
                    setMeetingParticipantsDetails([]); // Clear on error
                } finally {
                    setIsLoadingParticipants(false);
                }
            } else {
                setMeetingParticipantsDetails([]);
            }
        };

        fetchParticipants();
    }, [selectedMeeting]);


    if (!selectedMeeting) return null;

    // Ensure the current user is always in the participant list for display, even if not in fetched participantIds
    const displayedParticipants = [...meetingParticipantsDetails];
    if (user && !displayedParticipants.some(p => p.userId === user.uid)) {
        // Add current user if not already present (e.g., if they are the creator but not explicitly in participantIds)
        const currentUserAsParticipant: OfficeMember = {
            userId: user.uid,
            name: user.displayName || "You",
            role: "Member", // Placeholder role, might need actual role from office if available
            avatarUrl: user.photoURL || undefined,
        };
        displayedParticipants.unshift(currentUserAsParticipant);
    }


    return (
        <Card className="shadow-xl">
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="font-headline flex items-center">
                <Video className="mr-2 h-5 w-5 text-primary" />
                {selectedMeeting.title}
                </CardTitle>
                <Button variant="destructive" onClick={onLeaveMeeting}>
                <PhoneOff className="mr-2 h-4 w-4" /> Leave Meeting
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-muted rounded-md aspect-video relative flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover rounded-md" autoPlay muted playsInline />
                    {isJoining && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                        <Loader2 className="h-12 w-12 text-white animate-spin" />
                    </div>
                    )}
                    {hasCameraPermission === false && !isJoining && (
                    <div className="absolute inset-0 p-4 flex items-center justify-center">
                        <Alert variant="destructive" className="w-full max-w-md">
                            <VideoOff className="h-4 w-4" />
                            <AlertTitle>Camera Access Denied</AlertTitle>
                            <AlertDescription>
                            Please enable camera and microphone permissions in your browser to join the meeting. You might need to refresh the page after granting permissions.
                            </AlertDescription>
                        </Alert>
                    </div>
                    )}
                     {hasCameraPermission === true && !isJoining && user && (
                        <div className="absolute bottom-2 left-2 p-2 bg-black/50 text-white text-xs rounded">
                            {user.displayName || "Your Name"} (You)
                        </div>
                     )}
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center"><Users className="mr-2 h-5 w-5"/> Participants ({isLoadingParticipants ? '...' : displayedParticipants.length})</h3>
                    <div className="h-64 overflow-y-auto space-y-2 pr-2 rounded-md border p-2 bg-background">
                        {isLoadingParticipants ? (
                             [...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center space-x-2 p-2">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                </div>
                            ))
                        ) : displayedParticipants.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No participants listed.</p>
                        ): (
                            displayedParticipants.map((participant) => (
                            <div key={participant.userId} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
                                <Avatar className="h-8 w-8">
                                <AvatarImage src={participant.avatarUrl || `https://placehold.co/40x40.png?text=${participant.name.substring(0,1)}`} alt={participant.name} data-ai-hint="person avatar" />
                                <AvatarFallback>{participant.name.substring(0,1).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{participant.name} {participant.userId === user?.uid ? "(You)" : ""}</span>
                            </div>
                            ))
                        )}
                    </div>
                </div>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
                <Button variant="outline" size="lg" disabled={!hasCameraPermission}><MicOff className="mr-2 h-5 w-5" /> Mute</Button>
                <Button variant="outline" size="lg" disabled={!hasCameraPermission}><VideoOff className="mr-2 h-5 w-5" /> Stop Video</Button>
                <Button variant="outline" size="lg" disabled={!hasCameraPermission}><ScreenShare className="mr-2 h-5 w-5" /> Share Screen</Button>
            </CardFooter>
        </Card>
    );
}

    
