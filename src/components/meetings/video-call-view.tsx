
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

    // Mock active speaker logic (can be replaced with real logic later)
    const remoteParticipants = meetingParticipantsDetails;
    const activeSpeaker = remoteParticipants.length > 0 ? remoteParticipants[0] : selfParticipant;
    const mainViewStream = isScreenSharing ? screenStream : null; // In real app, this would be remote stream
    const mainViewParticipant = isScreenSharing ? selfParticipant : activeSpeaker;

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
                        <Button variant="outline" size="sm" className="w-full sm:w-auto"><Users className="mr-2 h-4 w-4"/> Participants ({remoteParticipants.length + 1})</Button>
                        <Button variant="destructive" size="sm" onClick={cleanupAndLeave} className="w-full sm:w-auto">
                            <PhoneOff className="mr-2 h-4 w-4" /> Leave
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 sm:p-2 md:p-4 grid grid-cols-12 gap-4 min-h-0">
                
                {/* Main Video Area */}
                <div className="col-span-12 lg:col-span-9 bg-black rounded-md relative flex items-center justify-center overflow-hidden h-[40vh] sm:h-[60vh] lg:h-auto">
                    { isScreenSharing ?
                        <video key="screen" ref={node => {if(node) node.srcObject = screenStream}} className="w-full h-full object-contain" autoPlay/>
                        :
                        <ParticipantVideo key={activeSpeaker.userId} participant={mainViewParticipant} stream={mainViewStream} isMuted={true} isVideoOff={true}/>
                    }
                    <p className="absolute bottom-4 left-4 z-20 text-white font-medium bg-black/40 px-3 py-1 rounded-lg">
                        {isScreenSharing ? "You are presenting your screen" : `${mainViewParticipant.name}'s View`}
                    </p>
                </div>

                {/* Participants Sidebar/Filmstrip */}
                <div className="col-span-12 lg:col-span-3 flex flex-col min-h-0">
                    <div className="relative w-full aspect-video mb-4 shadow-md rounded-md overflow-hidden">
                        <ParticipantVideo 
                            participant={selfParticipant}
                            stream={cameraStream}
                            isMuted={!isMicOn}
                            isVideoOff={!isCameraOn}
                            isSelf={true}
                        />
                    </div>

                    <h3 className="text-sm font-semibold mb-2 px-1 text-muted-foreground">Other Participants</h3>
                    <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                        {isLoading ? (
                           [...Array(2)].map((_, i) => <Skeleton key={i} className="w-full aspect-video rounded-md" />)
                        ) : remoteParticipants.length > 0 ? (
                           remoteParticipants.map(p => <ParticipantVideo key={p.userId} participant={p} />)
                        ) : (
                           <p className="text-sm text-muted-foreground text-center pt-8">You're the first one here!</p>
                        )}
                    </div>
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
                <Button variant={isScreenSharing ? "default" : "outline"} size="lg" onClick={handleToggleScreenShare} disabled={!hasPermission}>
                    {isScreenSharing ? <ScreenShareOff className="mr-2 h-5 w-5" /> : <ScreenShare className="mr-2 h-5 w-5" />}
                    {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                </Button>
            </CardFooter>
        </Card>
    );
}
