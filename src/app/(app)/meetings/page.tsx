
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Video, Users, Clock, MicOff, VideoOff, ScreenShare, PhoneOff, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Calendar as ShadCNCalendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Meeting {
  id: string;
  title: string;
  dateTime: Date;
  durationMinutes: number;
  participants: string[];
  description?: string;
}

const mockMeetings: Meeting[] = [
  {
    id: "1",
    title: "Project Alpha Kick-off",
    dateTime: new Date(new Date().setDate(new Date().getDate() + 1)), // Tomorrow
    durationMinutes: 60,
    participants: ["Alice", "Bob", "Charlie"],
    description: "Initial meeting to discuss Project Alpha scope and timelines.",
  },
  {
    id: "2",
    title: "Weekly Sync",
    dateTime: new Date(new Date(new Date().setDate(new Date().getDate() + 2)).setHours(14,0,0,0)), // Day after tomorrow at 2 PM
    durationMinutes: 30,
    participants: ["Alice", "Bob", "David", "Eve"],
    description: "Regular team sync to discuss progress and blockers.",
  },
  {
    id: "3",
    title: "Client Demo Prep",
    dateTime: new Date(new Date(new Date().setDate(new Date().getDate() + 3)).setHours(10,30,0,0)), // 3 days from now at 10:30 AM
    durationMinutes: 45,
    participants: ["Charlie", "David"],
    description: "Preparation session for the upcoming client demonstration.",
  },
];

export default function MeetingsPage() {
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>(mockMeetings.sort((a,b) => a.dateTime.getTime() - b.dateTime.getTime()));
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);

  // Form state for new meeting
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newMeetingDate, setNewMeetingDate] = useState<Date | undefined>(new Date());
  const [newMeetingTime, setNewMeetingTime] = useState("10:00");
  const [newMeetingDuration, setNewMeetingDuration] = useState("30");
  const [newMeetingParticipants, setNewMeetingParticipants] = useState("");
  const [newMeetingDescription, setNewMeetingDescription] = useState("");

  // Video call state
  const [selectedMeetingForPreview, setSelectedMeetingForPreview] = useState<Meeting | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | undefined>(undefined);
  const [isJoiningMeeting, setIsJoiningMeeting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);


  useEffect(() => {
    const getCameraPermission = async () => {
      if (!selectedMeetingForPreview) {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        setHasCameraPermission(undefined);
        return;
      }

      setIsJoiningMeeting(true);
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
          description: 'Please enable camera and microphone permissions in your browser settings to join the meeting.',
        });
      } finally {
        setIsJoiningMeeting(false);
      }
    };

    getCameraPermission();

    return () => { // Cleanup on component unmount or when selectedMeetingForPreview changes
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [selectedMeetingForPreview, toast]);

  const handleScheduleMeeting = () => {
    if (!newMeetingTitle || !newMeetingDate || !newMeetingTime) return;
    
    const [hours, minutes] = newMeetingTime.split(':').map(Number);
    const combinedDateTime = new Date(newMeetingDate);
    combinedDateTime.setHours(hours, minutes, 0, 0); 

    const newMeeting: Meeting = {
      id: Date.now().toString(),
      title: newMeetingTitle,
      dateTime: combinedDateTime,
      durationMinutes: parseInt(newMeetingDuration, 10) || 30,
      participants: newMeetingParticipants.split(',').map(p => p.trim()).filter(p => p),
      description: newMeetingDescription,
    };
    setMeetings(prevMeetings => [...prevMeetings, newMeeting].sort((a,b) => a.dateTime.getTime() - b.dateTime.getTime()));
    
    setNewMeetingTitle("");
    setNewMeetingDate(new Date());
    setNewMeetingTime("10:00");
    setNewMeetingDuration("30");
    setNewMeetingParticipants("");
    setNewMeetingDescription("");
    setIsScheduleDialogOpen(false);
  };

  const handleJoinMeetingClick = (meeting: Meeting) => {
    if (selectedMeetingForPreview?.id === meeting.id) { // Already selected, effectively "leave"
      setSelectedMeetingForPreview(null);
    } else {
      setSelectedMeetingForPreview(meeting);
    }
  };

  const handleLeaveMeeting = () => {
    setSelectedMeetingForPreview(null);
  };
  
  const sortedMeetings = [...meetings].sort((a,b) => a.dateTime.getTime() - b.dateTime.getTime());

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl font-headline font-bold mb-4 sm:mb-0">Video Meetings</h1>
        {!selectedMeetingForPreview && (
          <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Schedule New Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="font-headline">Schedule New Meeting</DialogTitle>
                <DialogDescription>Fill in the details for your new meeting.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={newMeetingTitle} onChange={(e) => setNewMeetingTitle(e.target.value)} placeholder="Meeting Title" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <ShadCNCalendar mode="single" selected={newMeetingDate} onSelect={setNewMeetingDate} className="rounded-md border p-0 w-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="time">Time</Label>
                    <Input id="time" type="time" value={newMeetingTime} onChange={(e) => setNewMeetingTime(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input id="duration" type="number" value={newMeetingDuration} onChange={(e) => setNewMeetingDuration(e.target.value)} placeholder="e.g., 30" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="participants">Participants (comma-separated)</Label>
                  <Input id="participants" value={newMeetingParticipants} onChange={(e) => setNewMeetingParticipants(e.target.value)} placeholder="Alice, Bob, ..." />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea id="description" value={newMeetingDescription} onChange={(e) => setNewMeetingDescription(e.target.value)} placeholder="Meeting agenda or notes" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleScheduleMeeting}>Schedule Meeting</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!selectedMeetingForPreview ? (
        <div className="w-full">
          <h2 className="text-2xl font-headline font-semibold mb-4">
            All Scheduled Meetings
          </h2>
          {sortedMeetings.length === 0 ? (
            <div className="text-center py-10 bg-muted/50 rounded-md flex flex-col items-center justify-center">
              <Image src="https://placehold.co/200x150.png" alt="No meetings" width={150} height={112} className="mx-auto mb-4 rounded" data-ai-hint="calendar illustration" />
              <p className="text-muted-foreground">No meetings scheduled yet.</p>
              <p className="text-sm text-muted-foreground">Schedule a new meeting to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedMeetings.map((meeting) => (
                <Card key={meeting.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="font-headline flex items-center">
                      <Video className="mr-2 h-5 w-5 text-primary" />
                      {meeting.title}
                    </CardTitle>
                    <CardDescription className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm pt-1">
                      <span className="flex items-center mb-1 sm:mb-0"><Clock className="mr-1 h-4 w-4" /> {meeting.dateTime.toLocaleDateString()} at {meeting.dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({meeting.durationMinutes} min)</span>
                      <span className="flex items-center"><Users className="mr-1 h-4 w-4" /> {meeting.participants.length > 0 ? meeting.participants.join(', ') : "No participants listed"}</span>
                    </CardDescription>
                  </CardHeader>
                  {meeting.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{meeting.description}</p>
                    </CardContent>
                  )}
                  <CardFooter>
                    <Button 
                      className="w-full sm:w-auto" 
                      onClick={() => handleJoinMeetingClick(meeting)}
                      disabled={isJoiningMeeting && selectedMeetingForPreview?.id === meeting.id}
                    >
                      {isJoiningMeeting && selectedMeetingForPreview?.id === meeting.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Video className="mr-2 h-4 w-4" />
                      )}
                      {isJoiningMeeting && selectedMeetingForPreview?.id === meeting.id ? 'Joining...' : 'Join Meeting'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Video Call UI
        <Card className="shadow-xl">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="font-headline flex items-center">
              <Video className="mr-2 h-5 w-5 text-primary" />
              {selectedMeetingForPreview.title}
            </CardTitle>
            <Button variant="destructive" onClick={handleLeaveMeeting}>
              <PhoneOff className="mr-2 h-4 w-4" /> Leave Meeting
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Main Video (Local User) */}
              <div className="md:col-span-2 bg-muted rounded-md aspect-video relative flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover rounded-md" autoPlay muted playsInline />
                {isJoiningMeeting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                    <Loader2 className="h-12 w-12 text-white animate-spin" />
                  </div>
                )}
                {hasCameraPermission === false && !isJoiningMeeting && (
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
              </div>
              {/* Participants Area (Placeholder) */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Participants ({selectedMeetingForPreview.participants.length +1})</h3>
                 <div className="h-64 overflow-y-auto space-y-2 pr-2 rounded-md border p-2 bg-background">
                    <div className="flex items-center space-x-2 p-2 rounded bg-muted/50">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src="https://placehold.co/40x40.png?text=YOU" data-ai-hint="person avatar" />
                            <AvatarFallback>YOU</AvatarFallback>
                        </Avatar>
                        <span>You (Local)</span>
                    </div>
                    {selectedMeetingForPreview.participants.map((name, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
                        <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://placehold.co/40x40.png?text=${name.substring(0,1)}`} data-ai-hint="person avatar" />
                        <AvatarFallback>{name.substring(0,1)}</AvatarFallback>
                        </Avatar>
                        <span>{name}</span>
                    </div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
            <Button variant="outline" size="lg"><MicOff className="mr-2 h-5 w-5" /> Mute</Button>
            <Button variant="outline" size="lg"><VideoOff className="mr-2 h-5 w-5" /> Stop Video</Button>
            <Button variant="outline" size="lg"><ScreenShare className="mr-2 h-5 w-5" /> Share Screen</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
