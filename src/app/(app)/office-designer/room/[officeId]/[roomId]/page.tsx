
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Video, VideoOff, Mic, MicOff, ScreenShare, ScreenShareOff, Phone, MessageSquare, Users, Settings, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";
import type { Office, Room, OfficeMember } from "@/types";
import { getOfficeDetails, getRoomDetails, getMembersForOffice } from "@/lib/firebase/firestore/offices";
import { ParticipantVideo } from '@/components/meetings/participant-video';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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
      // For this room, we'll assume all office members are potential participants
      setOfficeMembers(membersData || []);

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
  
  if (authLoading || isLoadingData || hasPermission === undefined) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-muted">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Joining room...</p>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
       <div className="flex h-screen w-screen flex-col items-center justify-center bg-muted p-4">
           <Alert variant="destructive" className="max-w-md">
               <VideoOff className="h-4 w-4" />
               <AlertTitle>Media Access Denied</AlertTitle>
               <AlertDescription>
               Teamo needs permission to use your camera and microphone. Please enable access in your browser's site settings and then refresh the page.
               </AlertDescription>
           </Alert>
           <Button onClick={cleanupAndLeave} variant="secondary" className="mt-4">Back to Office</Button>
       </div>
    )
  }

  const selfParticipant: OfficeMember | undefined = user ? {
    userId: user.uid,
    name: user.displayName || "You",
    role: officeMembers.find(m => m.userId === user.uid)?.role || "Member",
    avatarUrl: user.photoURL || undefined,
  } : undefined;

  // Simulate other participants being in the call for UI purposes
  const otherParticipants = officeMembers.filter(p => p.userId !== user?.uid).slice(0, 5); // Limit for demo
  const allParticipantsInGrid = selfParticipant ? [selfParticipant, ...otherParticipants] : otherParticipants;
  const totalTiles = allParticipantsInGrid.length + (isScreenSharing ? 1 : 0);

  const getGridClasses = (count: number) => {
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-2 md:grid-cols-3";
    if (count <= 9) return "grid-cols-3";
    return "grid-cols-4";
  };
  const gridLayoutClass = getGridClasses(totalTiles);

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center space-x-2">
            <Link href={`/office-designer?officeId=${officeId}`} className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Back to {officeDetails?.name}</span>
            </Link>
        </div>
        <div className="text-center">
            <h1 className="text-lg font-semibold">{roomDetails?.name}</h1>
        </div>
        <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground hidden sm:flex items-center"><Users className="mr-1 h-4 w-4" />{allParticipantsInGrid.length}</span>
            <span className="text-sm text-muted-foreground font-mono bg-muted px-2 py-1 rounded-md hidden md:block">14:25</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden bg-black/80">
         <div className={cn("grid w-full h-full p-4 gap-4", gridLayoutClass)}>
            {isScreenSharing && (
                <div className="bg-black rounded-lg relative flex items-center justify-center overflow-hidden border-2 border-primary shadow-lg">
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
      </main>

      {/* Footer Controls */}
      <footer className="flex h-20 flex-shrink-0 items-center justify-center border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center space-x-2 sm:space-x-4">
             <Button variant={!isMicOn ? "destructive" : "secondary"} size="lg" className="rounded-full h-14 w-14 p-0" onClick={handleToggleMic} disabled={!hasPermission}>
                {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </Button>
             <Button variant={!isCameraOn ? "destructive" : "secondary"} size="lg" className="rounded-full h-14 w-14 p-0" onClick={handleToggleCamera} disabled={!hasPermission}>
                {isCameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>
            <Button variant={isScreenSharing ? "default" : "secondary"} size="lg" className="rounded-full h-14 w-14 p-0" onClick={handleToggleScreenShare} disabled={!hasPermission}>
                {isScreenSharing ? <ScreenShareOff className="h-6 w-6" /> : <ScreenShare className="h-6 w-6" />}
            </Button>

            <Separator orientation="vertical" className="h-8 mx-2 hidden sm:block" />

            {/* Side Panel Toggles */}
             <Sheet>
                <SheetTrigger asChild>
                    <Button variant="secondary" size="lg" className="rounded-full h-14 w-14 p-0 hidden sm:flex">
                        <Users className="h-6 w-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Participants ({allParticipantsInGrid.length})</SheetTitle>
                    </SheetHeader>
                    <div className="py-4 space-y-4">
                        {allParticipantsInGrid.map(p => (
                            <div key={p.userId} className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Avatar>
                                        <AvatarImage src={p.avatarUrl} alt={p.name} data-ai-hint="person avatar" />
                                        <AvatarFallback>{p.name.substring(0,1)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                       <span className="font-medium">{p.name} {p.userId === user?.uid && '(You)'}</span>
                                       <Badge variant="outline" className="w-fit">{p.role}</Badge>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                   <Mic className="h-5 w-5 text-muted-foreground" />
                                   <Video className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </div>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>
            <Sheet>
                <SheetTrigger asChild>
                     <Button variant="secondary" size="lg" className="rounded-full h-14 w-14 p-0 hidden sm:flex">
                        <MessageSquare className="h-6 w-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Meeting Chat</SheetTitle>
                    </SheetHeader>
                    <div className="h-full flex flex-col pt-4">
                        <div className="flex-1 text-center text-muted-foreground text-sm flex items-center justify-center">
                            Chat is not yet implemented.
                        </div>
                        <div className="mt-auto flex space-x-2">
                            <Input placeholder="Type a message..." />
                            <Button>Send</Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <Button variant="destructive" size="lg" onClick={cleanupAndLeave} className="h-14 px-6 rounded-full">
               <Phone className="mr-2 h-6 w-6" /> End Call
            </Button>
        </div>
      </footer>
    </div>
  );
}
