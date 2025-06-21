
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Video, VideoOff, Mic, MicOff, ScreenShare, ScreenShareOff, PhoneOff, Users } from "lucide-react";
import type { Meeting, OfficeMember } from "@/types";
import { useEffect, useState, useRef, useCallback } from 'react';
import { getMembersForOffice } from '@/lib/firebase/firestore/offices';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ParticipantVideo } from './participant-video';
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
    const { toast } = useToast();

    // Refs for streams and video elements
    const selfVideoRef = useRef<HTMLVideoElement>(null);
    const screenVideoRef = useRef<HTMLVideoElement>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);

    // State for call controls and status
    const [isJoining, setIsJoining] = useState(true);
    const [hasPermission, setHasPermission] = useState<boolean | undefined>(undefined);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    
    // State for participant data
    const [meetingParticipantsDetails, setMeetingParticipantsDetails] = useState<OfficeMember[]>([]);
    const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
    
    const selfParticipant: OfficeMember = {
        userId: user.uid,
        name: user.displayName || "You",
        role: "Member", // Role could be enhanced in future
        avatarUrl: user.photoURL || undefined,
    }

    const stopAllTracks = (stream: MediaStream | null) => {
        stream?.getTracks().forEach(track => track.stop());
    }

    const getInitialStream = useCallback(async () => {
        setIsJoining(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            cameraStreamRef.current = stream;
            setHasPermission(true);
            if (selfVideoRef.current) {
                selfVideoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('Error accessing media devices:', error);
            setHasPermission(false);
            toast({
                variant: 'destructive',
                title: 'Media Access Denied',
                description: 'Please enable camera and mic permissions in your browser settings.',
                duration: 7000,
            });
        } finally {
            setIsJoining(false);
        }
    }, [toast]);
    
    useEffect(() => {
        getInitialStream();
        // Cleanup on component unmount
        return () => {
            stopAllTracks(cameraStreamRef.current);
            stopAllTracks(screenStreamRef.current);
        }
    }, [getInitialStream]);


    useEffect(() => {
        const fetchParticipants = async () => {
            if (selectedMeeting?.officeId) {
                setIsLoadingParticipants(true);
                try {
                    const officeMembers = await getMembersForOffice(selectedMeeting.officeId);
                    const participantIds = new Set([selectedMeeting.creatorUserId, ...(selectedMeeting.participantIds || [])]);
                    const participants = officeMembers.filter(member => participantIds.has(member.userId) && member.userId !== user.uid);
                    setMeetingParticipantsDetails(participants);
                } catch (error) {
                    console.error("Error fetching participant details:", error);
                } finally {
                    setIsLoadingParticipants(false);
                }
            }
        };

        fetchParticipants();
    }, [selectedMeeting, user.uid]);

    const handleToggleMute = () => {
        if (!cameraStreamRef.current) return;
        cameraStreamRef.current.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsMuted(prev => !prev);
    };

    const handleToggleVideo = () => {
        if (!cameraStreamRef.current) return;
        cameraStreamRef.current.getVideoTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsVideoOff(prev => !prev);
    };
    
    const handleToggleScreenShare = async () => {
        if (isScreenSharing) {
            // Stop screen sharing
            stopAllTracks(screenStreamRef.current);
            screenStreamRef.current = null;
            setIsScreenSharing(false);
            if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
        } else {
            // Start screen sharing
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                screenStreamRef.current = screenStream;

                if (screenVideoRef.current) {
                    screenVideoRef.current.srcObject = screenStream;
                }

                // Listen for the browser's "Stop sharing" button
                screenStream.getVideoTracks()[0].onended = () => {
                    setIsScreenSharing(false);
                    screenStreamRef.current = null;
                    if(screenVideoRef.current) screenVideoRef.current.srcObject = null;
                };
                setIsScreenSharing(true);
            } catch (error) {
                console.error("Error starting screen share:", error);
                toast({ variant: "destructive", title: "Screen Share Failed", description: "Could not start screen sharing." });
            }
        }
    };

    const remoteParticipants = isLoadingParticipants ? [] : meetingParticipantsDetails;
    const activeSpeaker = remoteParticipants.length > 0 ? remoteParticipants[0] : selfParticipant;


    return (
        <Card className="shadow-xl flex flex-col h-full bg-background overflow-hidden">
            <CardHeader className="flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <CardTitle className="font-headline flex items-center">
                        <Video className="mr-2 h-5 w-5 text-primary" />
                        {selectedMeeting.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button variant="outline" size="sm" className="w-full sm:w-auto"><Users className="mr-2 h-4 w-4"/> Participants ({remoteParticipants.length + 1})</Button>
                        <Button variant="destructive" size="sm" onClick={onLeaveMeeting} className="w-full sm:w-auto">
                            <PhoneOff className="mr-2 h-4 w-4" /> Leave
                        </Button>
                    </div>
                </div>
                <CardDescription>In: {selectedMeeting.participantsDisplay}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 sm:p-2 md:p-4 grid grid-cols-12 gap-4 min-h-0">
                
                {/* Main Video Area */}
                <div className="col-span-12 lg:col-span-9 bg-muted rounded-md relative flex items-center justify-center overflow-hidden h-[40vh] sm:h-[60vh] lg:h-auto">
                    {isScreenSharing ? (
                         <video ref={screenVideoRef} className="w-full h-full object-contain" autoPlay />
                    ) : (
                        <ParticipantVideo participant={activeSpeaker} />
                    )}
                    {isJoining && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white rounded-md">
                            <Loader2 className="h-12 w-12 animate-spin" />
                            <p className="mt-2">Joining meeting...</p>
                        </div>
                    )}
                    {hasPermission === false && !isJoining && (
                        <div className="absolute inset-0 p-4 flex items-center justify-center">
                             <Alert variant="destructive" className="w-full max-w-md">
                                <VideoOff className="h-4 w-4" />
                                <AlertTitle>Camera Access Denied</AlertTitle>
                                <AlertDescription>
                                Enable camera and mic permissions and refresh the page.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}
                </div>

                {/* Participants Sidebar/Filmstrip */}
                <div className="col-span-12 lg:col-span-3 flex flex-col min-h-0">
                    <div className="relative w-full aspect-video mb-4 shadow-md rounded-md overflow-hidden">
                        <video ref={selfVideoRef} className={cn("w-full h-full object-cover transform -scale-x-100", isVideoOff && "hidden")} autoPlay muted playsInline />
                         {isVideoOff && (
                             <div className="w-full h-full bg-muted flex items-center justify-center">
                                 <Avatar className="h-16 w-16">
                                     <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "user"} data-ai-hint="person avatar"/>
                                     <AvatarFallback>{user.displayName?.substring(0,1) || "U"}</AvatarFallback>
                                 </Avatar>
                             </div>
                         )}
                         <div className="absolute bottom-2 left-2 p-1.5 bg-black/50 text-white text-xs rounded">You</div>
                    </div>

                    <h3 className="text-sm font-semibold mb-2 px-1 text-muted-foreground">Other Participants</h3>
                    <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                        {isLoadingParticipants ? (
                           [...Array(2)].map((_, i) => <Skeleton key={i} className="w-full aspect-video rounded-md" />)
                        ) : remoteParticipants.length > 0 ? (
                           remoteParticipants.map(p => <ParticipantVideo key={p.userId} participant={p} />)
                        ) : (
                           <p className="text-sm text-muted-foreground text-center pt-8">You're the first one here!</p>
                        )}
                    </div>
                </div>

            </CardContent>
            <CardFooter className="flex-shrink-0 flex justify-center items-center space-x-2 sm:space-x-3 pt-4 border-t bg-background/80 backdrop-blur-sm">
                <Button variant={isMuted ? "destructive" : "outline"} size="lg" onClick={handleToggleMute} disabled={!hasPermission}>
                    {isMuted ? <MicOff className="mr-2 h-5 w-5" /> : <Mic className="mr-2 h-5 w-5" />}
                    {isMuted ? 'Unmute' : 'Mute'}
                </Button>
                 <Button variant={isVideoOff ? "destructive" : "outline"} size="lg" onClick={handleToggleVideo} disabled={!hasPermission}>
                    {isVideoOff ? <VideoOff className="mr-2 h-5 w-5" /> : <Video className="mr-2 h-5 w-5" />}
                    {isVideoOff ? 'Start Video' : 'Stop Video'}
                </Button>
                <Button variant={isScreenSharing ? "default" : "outline"} size="lg" onClick={handleToggleScreenShare} disabled={!hasPermission}>
                    {isScreenSharing ? <ScreenShareOff className="mr-2 h-5 w-5" /> : <ScreenShare className="mr-2 h-5 w-5" />}
                    {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                </Button>
            </CardFooter>
        </Card>
    );
}
