
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Video, VideoOff, Mic, MicOff, ScreenShare, ScreenShareOff, PhoneOff, ArrowLeft, Users, ShieldCheck, Settings2, UserCircle as UserIconLucide } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";
import type { Office, Room, OfficeMember } from "@/types";
import { getOfficeDetails, getRoomDetails, getMembersForOffice } from "@/lib/firebase/firestore/offices";
import { Skeleton } from '@/components/ui/skeleton';
import { ParticipantVideo } from '@/components/meetings/participant-video';
import { cn } from '@/lib/utils';

export default function OfficeRoomPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams();
  const officeId = params.officeId as string;
  const roomId = params.roomId as string;

  const [officeDetails, setOfficeDetails] = useState<Office | null>(null);
  const [roomDetails, setRoomDetails] = useState<Room | null>(null);
  const [officeMembers, setOfficeMembers] = useState<OfficeMember[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | undefined>(undefined);
  const [isScreenShareSupported, setIsScreenShareSupported] = useState(false);
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const cameraStreamRef = useRef(cameraStream);
  const screenStreamRef = useRef(screenStream);
  useEffect(() => { cameraStreamRef.current = cameraStream }, [cameraStream]);
  useEffect(() => { screenStreamRef.current = screenStream }, [screenStream]);


  const stopStream = (stream: MediaStream | null) => {
    stream?.getTracks().forEach(track => track.stop());
  };

  const cleanupAndLeave = useCallback(() => {
      stopStream(cameraStreamRef.current);
      stopStream(screenStreamRef.current);
      setCameraStream(null);
      setScreenStream(null);
      router.push(`/office-designer?officeId=${officeId}`);
  }, [officeId, router]);


  useEffect(() => {
      if (typeof window !== 'undefined' && navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
          setIsScreenShareSupported(true);
      }
  }, []);

  const fetchRoomAndOfficeData = useCallback(async () => {
    if (!officeId || !roomId) return;
    setIsLoadingData(true);
    try {
      const [officeData, roomData, membersData] = await Promise.all([
        getOfficeDetails(officeId),
        getRoomDetails(officeId, roomId),
        getMembersForOffice(officeId)
      ]);

      if (!officeData || !roomData) {
        toast({ variant: "destructive", title: "Error", description: "Office or Room not found." });
        router.push("/office-designer");
        return;
      }
      if (roomData.type !== "Meeting Room") {
        toast({ variant: "destructive", title: "Invalid Room", description: "This room is not a designated meeting room."});
        router.push(`/office-designer?officeId=${officeId}`);
        return;
      }
      setOfficeDetails(officeData);
      setRoomDetails(roomData);
      const roomParticipants = membersData.filter(member => roomData.participantIds?.includes(member.userId) || roomData.creatorUserId === member.userId);
      setOfficeMembers(roomParticipants.length > 0 ? roomParticipants : membersData || []);


    } catch (error) {
      console.error("Failed to fetch room/office details:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load room details." });
      router.push("/office-designer");
    } finally {
      setIsLoadingData(false);
    }
  }, [officeId, roomId, toast, router]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchRoomAndOfficeData();
    }
  }, [authLoading, user, fetchRoomAndOfficeData]);

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

    return () => {
      stopStream(cameraStreamRef.current);
      stopStream(screenStreamRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const handleToggleMic = () => {
      if (!cameraStream) return;
      cameraStream.getAudioTracks().forEach(track => { track.enabled = !isMicOn; });
      setIsMicOn(prev => !prev);
  };

  const handleToggleCamera = () => {
      if (!cameraStream) return;
      cameraStream.getVideoTracks().forEach(track => { track.enabled = !isCameraOn; });
      setIsCameraOn(prev => !prev);
  };
  
  const handleToggleScreenShare = async () => {
      if (!isScreenShareSupported) {
          toast({ variant: "destructive", title: "Not Supported", description: "Screen sharing is not supported by your browser." });
          return;
      }
      if (isScreenSharing) {
          stopStream(screenStream);
          setScreenStream(null);
          setIsScreenSharing(false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
              stream.getVideoTracks()[0].onended = () => {
                  setScreenStream(null); setIsScreenSharing(false);
              };
              setScreenStream(stream);
              setIsScreenSharing(true);
          } catch (error) {
              console.error("Error starting screen share:", error);
              toast({ variant: "destructive", title: "Screen Share Failed", description: "Could not start screen sharing." });
          }
      }
  };

  if (authLoading || isLoadingData) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card className="shadow-xl">
          <CardHeader className="flex flex-row justify-between items-center">
            <Skeleton className="h-7 w-3/5" />
            <Skeleton className="h-10 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
             <Skeleton className="w-full aspect-video rounded-md" />
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-12 w-28" />
            <Skeleton className="h-12 w-32" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!officeDetails || !roomDetails) {
    return <div className="container mx-auto p-8 text-center">Error loading details. Redirecting...</div>;
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
           <Button onClick={cleanupAndLeave} variant="secondary" className="mt-4">Back to Office</Button>
       </Card>
    )
  }

  const selfParticipant: OfficeMember | undefined = user ? {
    userId: user.uid,
    name: user.displayName || "You",
    role: officeMembers.find(m => m.userId === user.uid)?.role || "Member",
    avatarUrl: user.photoURL || undefined,
  } : undefined;

  const otherParticipants = officeMembers.filter(p => p.userId !== user?.uid);
  const allParticipantsInGrid = selfParticipant ? [selfParticipant, ...otherParticipants] : otherParticipants;
  const totalTiles = allParticipantsInGrid.length + (isScreenSharing ? 1 : 0);

  const getGridClasses = (count: number) => {
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 9) return "grid-cols-3";
    return "grid-cols-4";
  };
  const gridLayoutClass = getGridClasses(totalTiles);


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" asChild>
            <Link href={`/office-designer?officeId=${officeId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Office: {officeDetails.name}
            </Link>
        </Button>
         <Button variant="destructive" onClick={cleanupAndLeave}>
           <PhoneOff className="mr-2 h-4 w-4" /> Leave Room
        </Button>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="font-headline flex items-center">
            <Video className="mr-2 h-5 w-5 text-primary" />
            {roomDetails.name}
          </CardTitle>
          <span className="text-sm text-muted-foreground flex items-center"><Users className="mr-1 h-4 w-4" /> {allParticipantsInGrid.length} in call</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={cn("grid w-full h-full gap-2 sm:gap-4", gridLayoutClass)}>
            {isScreenSharing && (
                <div className="bg-black rounded-md relative flex items-center justify-center overflow-hidden border-2 border-primary shadow-lg">
                    <video key="screen" ref={node => {if(node) node.srcObject = screenStream}} className="w-full h-full object-contain" autoPlay/>
                    <p className="absolute bottom-2 left-2 z-20 text-white font-medium bg-black/40 px-2 py-1 rounded-md text-sm">
                        Your Screen Share
                    </p>
                </div>
            )}
            {allParticipantsInGrid.map(p => (
                <ParticipantVideo 
                    key={p.userId}
                    participant={p}
                    stream={p.userId === user?.uid ? cameraStream : null}
                    isMuted={p.userId === user?.uid ? !isMicOn : true}
                    isVideoOff={p.userId === user?.uid ? !isCameraOn : true}
                    isSelf={p.userId === user?.uid}
                />
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
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
    </div>
  );
}
