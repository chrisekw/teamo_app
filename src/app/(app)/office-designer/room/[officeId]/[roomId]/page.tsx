
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Video, VideoOff, MicOff, ScreenShare, PhoneOff, ArrowLeft, Users, ShieldCheck, Settings2, UserCircle as UserIconLucide } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";
import type { Office, Room, OfficeMember, MemberRole } from "@/types";
import { getOfficeDetails, getRoomDetails, getMembersForOffice } from "@/lib/firebase/firestore/offices";
import { Skeleton } from '@/components/ui/skeleton';

const roleIcons: Record<MemberRole, React.ElementType> = {
  "Owner": ShieldCheck,
  "Admin": Settings2,
  "Member": UserIconLucide,
};

export default function OfficeRoomPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const officeId = params.officeId as string;
  const roomId = params.roomId as string;

  const [officeDetails, setOfficeDetails] = useState<Office | null>(null);
  const [roomDetails, setRoomDetails] = useState<Room | null>(null);
  const [officeMembers, setOfficeMembers] = useState<OfficeMember[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isJoining, setIsJoining] = useState(false); // For camera permission check
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | undefined>(undefined);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

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
    const getCameraPermission = async () => {
      if (!roomDetails) return; // Don't try if room isn't loaded yet

      setIsJoining(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Media Access Denied',
          description: 'Please enable camera and microphone permissions in your browser settings to join the meeting. You might need to refresh after granting permissions.',
          duration: 7000,
        });
      } finally {
        setIsJoining(false);
      }
    };

    getCameraPermission();

    return () => { 
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [roomDetails, toast]);


  const handleLeaveMeeting = () => {
    router.push(`/office-designer?officeId=${officeId}`);
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="md:col-span-2 aspect-video rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-64 rounded-md border p-2" />
              </div>
            </div>
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
    return <div className="container mx-auto p-8 text-center">Error loading details.</div>;
  }
  
  const currentParticipants = officeMembers.filter(m => m.userId === user?.uid || Math.random() > 0.5); // Mock: current user + random other members

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" asChild>
            <Link href={`/office-designer?officeId=${officeId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Office: {officeDetails.name}
            </Link>
        </Button>
         <Button variant="destructive" onClick={handleLeaveMeeting}>
           <PhoneOff className="mr-2 h-4 w-4" /> Leave Room
        </Button>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="font-headline flex items-center">
            <Video className="mr-2 h-5 w-5 text-primary" />
            {roomDetails.name}
          </CardTitle>
          <span className="text-sm text-muted-foreground">In: {officeDetails.name}</span>
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
               {hasCameraPermission === true && !isJoining && (
                   <div className="absolute bottom-2 left-2 p-2 bg-black/50 text-white text-xs rounded">
                       {user?.displayName || "Your Name"}
                   </div>
               )}
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center"><Users className="mr-2 h-5 w-5"/> Participants ({currentParticipants.length})</h3>
              <div className="h-64 overflow-y-auto space-y-2 pr-2 rounded-md border p-2 bg-background">
                {currentParticipants.map((member) => {
                  const RoleIcon = roleIcons[member.role];
                  return (
                    <div key={member.userId} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatarUrl || `https://placehold.co/40x40.png?text=${member.name.substring(0,1)}`} alt={member.name} data-ai-hint="person avatar" />
                        <AvatarFallback>{member.name.substring(0,1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <span className="text-sm font-medium">{member.name} {member.userId === user?.uid && "(You)"}</span>
                        <div className="text-xs text-muted-foreground flex items-center">
                           <RoleIcon className="h-3 w-3 mr-1"/> {member.role}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {currentParticipants.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No participants yet.</p>}
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
    </div>
  );
}
