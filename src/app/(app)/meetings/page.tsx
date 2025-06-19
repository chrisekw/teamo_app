
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Video, Users, Clock, Loader2, Trash2, CalendarDays, Briefcase, Repeat, Edit } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import dynamic from 'next/dynamic';
import { useToast } from "@/hooks/use-toast";
import type { Meeting } from "@/types";
import { useAuth } from "@/lib/firebase/auth";
import { addMeetingForUser, getMeetingsForUser, deleteMeetingForUser } from "@/lib/firebase/firestore/meetings";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getOfficesForUser, type Office } from "@/lib/firebase/firestore/offices";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { addUserNotification } from "@/lib/firebase/firestore/notifications";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";

const ShadCNCalendar = dynamic(() => import('@/components/ui/calendar').then(mod => mod.Calendar), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[280px]" />
});

const VideoCallView = dynamic(() => import('@/components/meetings/video-call-view').then(mod => mod.VideoCallView), {
  ssr: false,
  loading: () => (
    <Card className="shadow-xl">
      <CardHeader className="flex flex-row justify-between items-center">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-10 w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="md:col-span-2 aspect-video rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-1/3 mb-2" />
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
  )
});

export default function MeetingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  const [userOffices, setUserOffices] = useState<Office[]>([]);

  // Form state for new meeting
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newMeetingDescription, setNewMeetingDescription] = useState("");
  const [newMeetingStartDate, setNewMeetingStartDate] = useState<Date | undefined>(new Date());
  const [newMeetingStartTime, setNewMeetingStartTime] = useState(format(new Date(), "HH:mm"));
  const [newMeetingEndDate, setNewMeetingEndDate] = useState<Date | undefined>(new Date());
  const [newMeetingEndTime, setNewMeetingEndTime] = useState(format(new Date(Date.now() + 60 * 60 * 1000), "HH:mm")); // Default 1 hour later
  const [newMeetingIsRecurring, setNewMeetingIsRecurring] = useState(false);
  const [newMeetingDepartment, setNewMeetingDepartment] = useState("");
  const [newMeetingParticipants, setNewMeetingParticipants] = useState("");

  const [selectedMeetingForPreview, setSelectedMeetingForPreview] = useState<Meeting | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | undefined>(undefined);
  const [isJoiningMeeting, setIsJoiningMeeting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const fetchUserOffices = useCallback(async () => {
    if (user) {
      const offices = await getOfficesForUser(user.uid);
      setUserOffices(offices);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserOffices();
    }
  }, [authLoading, user, fetchUserOffices]);

  const fetchMeetings = useCallback(async () => {
    if (user) {
      setIsLoadingMeetings(true);
      try {
        const userMeetings = await getMeetingsForUser(user.uid);
        setMeetings(userMeetings.sort((a,b) => a.dateTime.getTime() - b.dateTime.getTime()));
      } catch (error) {
        console.error("Failed to fetch meetings:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch meetings." });
      } finally {
        setIsLoadingMeetings(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchMeetings();
    }
  }, [authLoading, user, fetchMeetings]);

  const handleJoinMeetingClick = useCallback((meeting: Meeting) => {
    if (selectedMeetingForPreview?.id === meeting.id) { 
      if(!selectedMeetingForPreview) setSelectedMeetingForPreview(meeting);
    } else {
      setSelectedMeetingForPreview(meeting);
    }
    router.replace(`${pathname}?meetingId=${meeting.id}`, { scroll: false });
  }, [selectedMeetingForPreview, router, pathname]);

  useEffect(() => {
    const meetingIdFromUrl = searchParams.get('meetingId');
    if (meetingIdFromUrl && meetings.length > 0 && !selectedMeetingForPreview) {
      const meetingToSelect = meetings.find(m => m.id === meetingIdFromUrl);
      if (meetingToSelect) {
         if (selectedMeetingForPreview?.id !== meetingToSelect.id) {
            handleJoinMeetingClick(meetingToSelect);
         }
      }
    }
  }, [searchParams, meetings, selectedMeetingForPreview, handleJoinMeetingClick]);


  useEffect(() => {
    if (!user || meetings.length === 0 || isLoadingMeetings) return;

    const now = new Date();
    const reminderSentKeyPrefix = `meetingReminderSent_`;

    const checkAndSendReminders = async () => {
      for (const meeting of meetings) {
        const meetingTime = meeting.dateTime;
        const timeDiffMinutes = (meetingTime.getTime() - now.getTime()) / (1000 * 60);
        const reminderKey = `${reminderSentKeyPrefix}${meeting.id}`;

        if (timeDiffMinutes <= 5 && timeDiffMinutes >= -1) {
          if (!sessionStorage.getItem(reminderKey)) {
            console.log(`Meeting "${meeting.title}" is due. Sending reminder.`);
            try {
              await addUserNotification(user.uid, {
                type: "meeting-new",
                title: `Meeting Starting: ${meeting.title}`,
                message: `Your meeting "${meeting.title}" is starting now or in the next few minutes. Click to join.`,
                link: `/meetings?meetingId=${meeting.id}`,
                actorName: "System Reminder",
                entityId: meeting.id,
                entityType: "meeting",
              });
              sessionStorage.setItem(reminderKey, 'true');
              toast({ title: "Meeting Reminder", description: `Reminder for "${meeting.title}" triggered.` });
            } catch (error) {
              console.error("Failed to send meeting reminder notification:", error);
            }
          }
        }
      }
    };
    
    checkAndSendReminders();
    const intervalId = setInterval(checkAndSendReminders, 30 * 1000);
    return () => clearInterval(intervalId);

  }, [meetings, user, toast, isLoadingMeetings]);


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

    return () => { 
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [selectedMeetingForPreview, toast]);

  const resetScheduleForm = () => {
    setNewMeetingTitle("");
    setNewMeetingDescription("");
    setNewMeetingStartDate(new Date());
    setNewMeetingStartTime(format(new Date(), "HH:mm"));
    setNewMeetingEndDate(new Date());
    setNewMeetingEndTime(format(new Date(Date.now() + 60 * 60 * 1000), "HH:mm"));
    setNewMeetingIsRecurring(false);
    setNewMeetingDepartment("");
    setNewMeetingParticipants("");
  };

  const combineDateTime = (date: Date, time: string): Date => {
    const [hours, minutes] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  };

  const handleScheduleMeeting = async () => {
    if (!user || !newMeetingStartDate || !newMeetingEndDate) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in and select start/end dates." });
      return;
    }
    if (!newMeetingTitle.trim() || !newMeetingStartTime || !newMeetingEndTime) {
        toast({ variant: "destructive", title: "Validation Error", description: "Title, start time, and end time are required." });
        return;
    }
    
    setIsSubmitting(true);
    const startDateTime = combineDateTime(newMeetingStartDate, newMeetingStartTime);
    const endDateTime = combineDateTime(newMeetingEndDate, newMeetingEndTime);

    if (endDateTime <= startDateTime) {
        toast({ variant: "destructive", title: "Validation Error", description: "End date/time must be after start date/time."});
        setIsSubmitting(false);
        return;
    }

    const meetingData: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
      title: newMeetingTitle,
      dateTime: startDateTime,
      endDateTime: endDateTime,
      isRecurring: newMeetingIsRecurring,
      department: newMeetingDepartment || undefined,
      participants: newMeetingParticipants.split(',').map(p => p.trim()).filter(p => p),
      description: newMeetingDescription || undefined,
    };
    const actorName = user.displayName || user.email || "User";
    const officeForMeeting = userOffices.length > 0 ? userOffices[0] : undefined;

    try {
        await addMeetingForUser(user.uid, meetingData, actorName, officeForMeeting?.id, officeForMeeting?.name);
        toast({ title: "Meeting Scheduled", description: `"${meetingData.title}" has been scheduled.` });
        fetchMeetings();
        setIsScheduleDialogOpen(false);
        resetScheduleForm();
    } catch (error) {
        console.error("Failed to schedule meeting:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not schedule meeting." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteMeeting = async () => {
    if (!user || !meetingToDelete) return;
    setIsSubmitting(true);
    try {
        await deleteMeetingForUser(user.uid, meetingToDelete.id);
        toast({ title: "Meeting Deleted", description: `"${meetingToDelete.title}" has been removed.`});
        fetchMeetings();
        if (selectedMeetingForPreview?.id === meetingToDelete.id) {
            setSelectedMeetingForPreview(null);
            router.replace(pathname, { scroll: false }); 
        }
    } catch (error) {
        console.error("Failed to delete meeting:", error);
        toast({variant: "destructive", title: "Error", description: "Could not delete meeting."});
    } finally {
        setIsSubmitting(false);
        setMeetingToDelete(null);
    }
  };


  const handleLeaveMeeting = () => {
    setSelectedMeetingForPreview(null);
    router.replace(pathname, { scroll: false }); 
  };
  
  const calculateDuration = (start: Date, end: Date): string => {
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  if (authLoading || isLoadingMeetings && meetings.length === 0) {
     return <div className="container mx-auto p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl font-headline font-bold mb-4 sm:mb-0">Video Meetings</h1>
        {!selectedMeetingForPreview && (
          <Dialog open={isScheduleDialogOpen} onOpenChange={(isOpen) => { if (!isSubmitting) setIsScheduleDialogOpen(isOpen); if(!isOpen) resetScheduleForm();}}>
            <DialogTrigger asChild>
              <Button disabled={isSubmitting}>
                <PlusCircle className="mr-2 h-4 w-4" /> Schedule New Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-headline text-xl">Schedule New Meeting</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[75vh] overflow-y-auto pr-2">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="flex items-center"><Edit className="mr-2 h-4 w-4 text-muted-foreground"/>Meeting Title</Label>
                  <Input id="title" value={newMeetingTitle} onChange={(e) => setNewMeetingTitle(e.target.value)} placeholder="Enter meeting title" disabled={isSubmitting}/>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="flex items-center"><Clock className="mr-2 h-4 w-4 text-muted-foreground"/>Description (Optional)</Label>
                  <Textarea id="description" value={newMeetingDescription} onChange={(e) => setNewMeetingDescription(e.target.value)} placeholder="Enter meeting description" rows={3} disabled={isSubmitting}/>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate" className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/>Start Date & Time</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button id="startDate" variant="outline" className={cn("w-full justify-start text-left font-normal", !newMeetingStartDate && "text-muted-foreground")} disabled={isSubmitting}>
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {newMeetingStartDate ? format(newMeetingStartDate, "MMM d, yyyy") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><ShadCNCalendar mode="single" selected={newMeetingStartDate} onSelect={setNewMeetingStartDate} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || isSubmitting}/></PopoverContent>
                      </Popover>
                      <Input id="startTime" type="time" value={newMeetingStartTime} onChange={(e) => setNewMeetingStartTime(e.target.value)} className="w-auto" disabled={isSubmitting}/>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="endDate" className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/>End Date & Time</Label>
                     <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button id="endDate" variant="outline" className={cn("w-full justify-start text-left font-normal", !newMeetingEndDate && "text-muted-foreground")} disabled={isSubmitting}>
                                <CalendarDays className="mr-2 h-4 w-4" />
                                {newMeetingEndDate ? format(newMeetingEndDate, "MMM d, yyyy") : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><ShadCNCalendar mode="single" selected={newMeetingEndDate} onSelect={setNewMeetingEndDate} disabled={(date) => (newMeetingStartDate && date < newMeetingStartDate) || isSubmitting}/></PopoverContent>
                        </Popover>
                        <Input id="endTime" type="time" value={newMeetingEndTime} onChange={(e) => setNewMeetingEndTime(e.target.value)} className="w-auto" disabled={isSubmitting}/>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="isRecurring" className="flex items-center"><Repeat className="mr-2 h-4 w-4 text-muted-foreground"/> Recurring Meeting </Label>
                  <Switch id="isRecurring" checked={newMeetingIsRecurring} onCheckedChange={setNewMeetingIsRecurring} disabled={isSubmitting}/>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="department" className="flex items-center"><Briefcase className="mr-2 h-4 w-4 text-muted-foreground"/>Department (Optional)</Label>
                    <Input id="department" value={newMeetingDepartment} onChange={(e) => setNewMeetingDepartment(e.target.value)} placeholder="Select Department" disabled={isSubmitting}/>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="participants" className="flex items-center"><Users className="mr-2 h-4 w-4 text-muted-foreground"/>Participants</Label>
                    <Input id="participants" value={newMeetingParticipants} onChange={(e) => setNewMeetingParticipants(e.target.value)} placeholder="e.g. Alice, Bob (comma-separated)" disabled={isSubmitting}/>
                </div>
                <div className="space-y-1.5">
                    <Label className="flex items-center"><Video className="mr-2 h-4 w-4 text-muted-foreground"/>Meeting Type</Label>
                    <Button variant="outline" className="w-full justify-start bg-primary/10 border-primary text-primary" disabled>
                        <Video className="mr-2 h-4 w-4"/> Video Conference
                    </Button>
                </div>
              </div>
              <DialogFooter className="sm:justify-between">
                <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={handleScheduleMeeting} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Schedule Meeting
                </Button>
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
          {isLoadingMeetings && meetings.length === 0 && (
             <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="shadow-lg">
                    <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-1" /></CardHeader>
                    <CardContent><Skeleton className="h-4 w-full" /></CardContent>
                    <CardFooter><Skeleton className="h-10 w-28" /></CardFooter>
                  </Card>
                ))}
            </div>
          )}
          {!isLoadingMeetings && meetings.length === 0 ? (
            <div className="text-center py-10 bg-muted/50 rounded-md flex flex-col items-center justify-center">
              <Image src="https://placehold.co/200x150.png" alt="No meetings" width={200} height={150} className="mx-auto mb-4 rounded" data-ai-hint="calendar illustration empty" />
              <p className="text-muted-foreground">No meetings scheduled yet.</p>
              <p className="text-sm text-muted-foreground">Schedule a new meeting to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <Card key={meeting.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="font-headline flex items-center">
                        <Video className="mr-2 h-5 w-5 text-primary" />
                        {meeting.title}
                        </CardTitle>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setMeetingToDelete(meeting)} disabled={isSubmitting}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </AlertDialogTrigger>
                            {meetingToDelete && meetingToDelete.id === meeting.id && (
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the meeting "{meetingToDelete.title}".
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setMeetingToDelete(null)} disabled={isSubmitting}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteMeeting} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Delete
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            )}
                        </AlertDialog>
                    </div>
                    <CardDescription className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm pt-1">
                      <span className="flex items-center mb-1 sm:mb-0"><Clock className="mr-1 h-4 w-4" /> {meeting.dateTime.toLocaleDateString()} at {meeting.dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({calculateDuration(meeting.dateTime, meeting.endDateTime)})</span>
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
        <VideoCallView
            selectedMeeting={selectedMeetingForPreview}
            user={user}
            onLeaveMeeting={handleLeaveMeeting}
            videoRef={videoRef}
            isJoining={isJoiningMeeting}
            hasCameraPermission={hasCameraPermission}
        />
      )}
    </div>
  );
}

    