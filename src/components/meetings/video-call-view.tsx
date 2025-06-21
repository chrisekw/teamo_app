
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Video, VideoOff, Mic, MicOff, ScreenShare, ScreenShareOff, PhoneOff, Users } from "lucide-react";
import type { Meeting, OfficeMember } from "@/types";
import { useEffect, useState, useRef, useCallback } from 'react';
import { getMembersForOffice } from '@/lib/firebase/firestore/offices';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ParticipantVideo } from './participant-video';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

    // State for streams and permissions
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const [hasPermission, setHasPermission] = useState<boolean | undefined>(undefined);
    const [isScreenShareSupported, setIsScreenShareSupported] = useState(false);
    
    // State for call controls
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    // State for participant data
    const [meetingParticipantsDetails, setMeetingParticipantsDetails] = useState<OfficeMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const selfParticipant: OfficeMember = {
        userId: user.uid,
        name: user.displayName || "You",
        role: "Member",
        avatarUrl: user.photoURL || undefined,
    };

    const stopStream = (stream: MediaStream | null) => {
        stream?.getTracks().forEach(track => track.stop());
    };

    // Main cleanup function
    const cleanupAndLeave = useCallback(() => {
        stopStream(cameraStream);
        stopStream(screenStream);
        setCameraStream(null);
        setScreenStream(null);
        onLeaveMeeting();
    }, [cameraStream, screenStream, onLeaveMeeting]);


    // Check for screen share support
    useEffect(() => {
        if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
            setIsScreenShareSupported(true);
        }
    }, []);

    // Get initial media permissions and stream
    useEffect(() => {
        const getInitialStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setCameraStream(stream);
                setHasPermission(true);
            } catch (error) {
                console.error('Error accessing media devices:', error);
                setHasPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Media Access Denied',
                    description: 'Please enable camera and mic permissions in your browser settings and refresh the page.',
                    duration: 7000,
                });
            }
        };

        getInitialStream();
        
        // This return function acts as a cleanup for when the component unmounts
        return () => {
            stopStream(cameraStreamRef.current);
            stopStream(screenStreamRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toast]); // Run once on mount

    // We need to use refs to hold the latest stream state for the cleanup function
    // as it's defined only once.
    const cameraStreamRef = useRef(cameraStream);
    const screenStreamRef = useRef(screenStream);
    useEffect(() => { cameraStreamRef.current = cameraStream }, [cameraStream]);
    useEffect(() => { screenStreamRef.current = screenStream }, [screenStream]);


    // Fetch participant details
    useEffect(() => {
        const fetchParticipants = async () => {
            if (selectedMeeting?.officeId) {
                setIsLoading(true);
                try {
                    const officeMembers = await getMembersForOffice(selectedMeeting.officeId);
                    const participantIds = new Set([selectedMeeting.creatorUserId, ...(selectedMeeting.participantIds || [])]);
                    const participants = officeMembers.filter(member => participantIds.has(member.userId) && member.userId !== user.uid);
                    setMeetingParticipantsDetails(participants);
                } catch (error) {
                    console.error("Error fetching participant details:", error);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchParticipants();
    }, [selectedMeeting, user.uid]);

    // --- Control Handlers ---

    const handleToggleMic = () => {
        if (!cameraStream) return;
        cameraStream.getAudioTracks().forEach(track => {
            track.enabled = !isMicOn;
        });
        setIsMicOn(prev => !prev);
    };

    const handleToggleCamera = () => {
        if (!cameraStream) return;
        cameraStream.getVideoTracks().forEach(track => {
            track.enabled = !isCameraOn;
        });
        setIsCameraOn(prev => !prev);
    };
    
    const handleToggleScreenShare = async () => {
        if (!isScreenShareSupported) {
            toast({
                variant: "destructive",
                title: "Not Supported",
                description: "Screen sharing is not supported by your browser or in this environment.",
            });
            return;
        }

        if (isScreenSharing) {
            // Stop screen sharing
            stopStream(screenStream);
            setScreenStream(null);
            setIsScreenSharing(false);
        } else {
            // Start screen sharing
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                
                // When user clicks the browser's "Stop sharing" button
                stream.getVideoTracks()[0].onended = () => {
                    setScreenStream(null);
                    setIsScreenSharing(false);
                };
                
                setScreenStream(stream);
                setIsScreenSharing(true);
            } catch (error) {
                console.error("Error starting screen share:", error);
                toast({ variant: "destructive", title: "Screen Share Failed", description: "Could not start screen sharing." });
            }
        }
    };

    const allParticipants = [selfParticipant, ...meetingParticipantsDetails];
    const totalTiles = allParticipants.length + (isScreenSharing ? 1 : 0);

    const getGridClasses = (count: number) => {
        if (count <= 1) return "grid-cols-1";
        if (count === 2) return "grid-cols-2";
        if (count <= 4) return "grid-cols-2"; 
        if (count <= 6) return "grid-cols-3";
        if (count <= 9) return "grid-cols-3"; 
        if (count <= 12) return "grid-cols-4"; 
        if (count <= 16) return "grid-cols-4";
        return "grid-cols-5"; 
    };

    const gridLayoutClass = getGridClasses(totalTiles);


    if (hasPermission === undefined || isLoading) {
        return (
            <Card className="shadow-xl flex flex-col h-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary"/>
                <p className="mt-4 text-muted-foreground">Connecting to meeting...</p>
            </Card>
        )
    }

    if (hasPermission === false) {
         return (
            <Card className="shadow-xl flex flex-col h-full items-center justify-center p-4">
                <Alert variant="destructive" className="max-w-md">
                    <VideoOff className="h-4 w-4" />
                    <AlertTitle>Media Access Denied</AlertTitle>
                    <AlertDescription>
                    Teamo needs permission to use your camera and microphone. Please enable access in your browser's site settings and then refresh the page.
                    </AlertDescription>
                </Alert>
                <Button onClick={cleanupAndLeave} variant="secondary" className="mt-4">Back to Meetings</Button>
            </Card>
         )
    }

    return (
        <Card className="shadow-xl flex flex-col h-full bg-background overflow-hidden">
            <CardHeader className="flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <CardTitle className="font-headline flex items-center">
                        <Video className="mr-2 h-5 w-5 text-primary" />
                        {selectedMeeting.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button variant="outline" size="sm" className="w-full sm:w-auto"><Users className="mr-2 h-4 w-4"/> Participants ({allParticipants.length})</Button>
                        <Button variant="destructive" size="sm" onClick={cleanupAndLeave} className="w-full sm:w-auto">
                            <PhoneOff className="mr-2 h-4 w-4" /> Leave
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-2 sm:p-4 min-h-0">
                <div className={cn("grid gap-4 w-full h-full", gridLayoutClass)}>
                    {isScreenSharing && (
                        <div className="bg-black rounded-md relative flex items-center justify-center overflow-hidden col-span-1 row-span-1 border-2 border-primary shadow-lg">
                            <video key="screen" ref={node => {if(node) node.srcObject = screenStream}} className="w-full h-full object-contain" autoPlay/>
                            <p className="absolute bottom-2 left-2 z-20 text-white font-medium bg-black/40 px-2 py-1 rounded-md text-sm">
                                Your Screen Share
                            </p>
                        </div>
                    )}
                    {allParticipants.map(p => (
                        <ParticipantVideo 
                            key={p.userId}
                            participant={p}
                            stream={p.userId === user.uid ? cameraStream : null}
                            isMuted={p.userId === user.uid ? !isMicOn : true}
                            isVideoOff={p.userId === user.uid ? !isCameraOn : true}
                            isSelf={p.userId === user.uid}
                        />
                    ))}
                </div>
            </CardContent>
            <CardFooter className="flex-shrink-0 flex justify-center items-center space-x-2 sm:space-x-3 py-3 border-t bg-background/80 backdrop-blur-sm">
                <Button variant={!isMicOn ? "destructive" : "outline"} size="lg" onClick={handleToggleMic} disabled={!hasPermission}>
                    {isMicOn ? <Mic className="mr-2 h-5 w-5" /> : <MicOff className="mr-2 h-5 w-5" />}
                    {isMicOn ? 'Mute' : 'Unmute'}
                </Button>
                 <Button variant={!isCameraOn ? "destructive" : "outline"} size="lg" onClick={handleToggleCamera} disabled={!hasPermission}>
                    {isCameraOn ? <Video className="mr-2 h-5 w-5" /> : <VideoOff className="mr-2 h-5 w-5" />}
                    {isCameraOn ? 'Stop Video' : 'Start Video'}
                </Button>
                <Button variant={isScreenSharing ? "default" : "outline"} size="lg" onClick={handleToggleScreenShare} disabled={!hasPermission || !isScreenShareSupported}>
                    {isScreenSharing ? <ScreenShareOff className="mr-2 h-5 w-5" /> : <ScreenShare className="mr-2 h-5 w-5" />}
                    {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                </Button>
            </CardFooter>
        </Card>
    );
}
