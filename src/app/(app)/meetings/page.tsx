
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Video, Users as UsersIcon, Clock, Loader2, Trash2, CalendarDays, Briefcase, Repeat, Edit } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from 'next/dynamic';
import { useToast } from "@/hooks/use-toast";
import type { Meeting, OfficeMember, Office } from "@/types";
import { useAuth } from "@/lib/firebase/auth";
import { addMeetingToOffice, getMeetingsForOfficeVisibleToUser, deleteMeetingFromOffice, getMeetingByIdFromOffice } from "@/lib/firebase/firestore/meetings";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getOfficesForUser, getMembersForOffice } from "@/lib/firebase/firestore/offices";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { addUserNotification } from "@/lib/firebase/firestore/notifications";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


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
  const [activeOffice, setActiveOffice] = useState<Office | null>(null);
  const [currentOfficeMembers, setCurrentOfficeMembers] = useState<OfficeMember[]>([]);
  const [isLoadingOfficeData, setIsLoadingOfficeData] = useState(true);


  // Form state for new meeting
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newMeetingDescription, setNewMeetingDescription] = useState("");
  const [newMeetingStartDate, setNewMeetingStartDate] = useState<Date | undefined>(new Date());
  const [newMeetingStartTime, setNewMeetingStartTime] = useState(format(new Date(), "HH:mm"));
  const [newMeetingEndDate, setNewMeetingEndDate] = useState<Date | undefined>(new Date());
  const [newMeetingEndTime, setNewMeetingEndTime] = useState(format(new Date(Date.now() + 60 * 60 * 1000), "HH:mm"));
  const [newMeetingIsRecurring, setNewMeetingIsRecurring] = useState(false);
  const [newMeetingParticipantIds, setNewMeetingParticipantIds] = useState<string[]>([]);


  const [selectedMeetingForPreview, setSelectedMeetingForPreview] = useState<Meeting | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | undefined>(undefined);
  const [isJoiningMeeting, setIsJoiningMeeting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const fetchOfficeData = useCallback(async () => {
    if (user) {
      setIsLoadingOfficeData(true);
      try {
        const offices = await getOfficesForUser(user.uid);
        setUserOffices(offices);
        if (offices.length > 0) {
          setActiveOffice(offices[0]); 
          const members = await getMembersForOffice(offices[0].id);
          setCurrentOfficeMembers(members);
        } else {
          setActiveOffice(null);
          setCurrentOfficeMembers([]);
        }
      } catch (error) {
        console.error("Failed to fetch office data:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load office data."});
      } finally {
        setIsLoadingOfficeData(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchOfficeData();
    }
  }, [authLoading, user, fetchOfficeData]);


  const fetchMeetingsForActiveOffice = useCallback(async () => {
    if (user && activeOffice) {
      setIsLoadingMeetings(true);
      try {
        const userMeetings = await getMeetingsForOfficeVisibleToUser(activeOffice.id, user.uid);
        setMeetings(userMeetings.sort((a,b) => a.dateTime.getTime() - b.dateTime.getTime()));
      } catch (error) {
        console.error("Failed to fetch meetings:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch meetings." });
        setMeetings([]);
      } finally {
        setIsLoadingMeetings(false);
      }
    } else if (!activeOffice) {
        setMeetings([]);
        setIsLoadingMeetings(false);
    }
  }, [user, activeOffice, toast]);

  useEffect(() => {
    if (!authLoading && user && activeOffice) {
      fetchMeetingsForActiveOffice();
    } else if (!activeOffice && !isLoadingOfficeData) {
      setMeetings([]);
      setIsLoadingMeetings(false);
    }
  }, [authLoading, user, activeOffice, fetchMeetingsForActiveOffice, isLoadingOfficeData]);

  const handleJoinMeetingClick = useCallback(async (meeting: Meeting) => {
    if (!activeOffice) {
        toast({ variant: "destructive", title: "Error", description: "No active office selected." });
        return;
    }
    setSelectedMeetingForPreview(meeting);
    router.replace(`${pathname}?meetingId=${meeting.id}&officeId=${activeOffice.id}`, { scroll: false });
  }, [activeOffice, router, pathname, toast]);

  useEffect(() => {
    const meetingIdFromUrl = searchParams.get('meetingId');
    const officeIdFromUrl = searchParams.get('officeId');

    const loadMeetingFromUrl = async () => {
      if (meetingIdFromUrl && officeIdFromUrl && user) {
        setIsJoiningMeeting(true); // Indicate loading the specific meeting
        try {
          const meetingToSelect = await getMeetingByIdFromOffice(officeIdFromUrl, meetingIdFromUrl);
          if (meetingToSelect) {
            // Check if this user should be able to view this meeting
            const isParticipantOrCreator = meetingToSelect.creatorUserId === user.uid || (meetingToSelect.participantIds && meetingToSelect.participantIds.includes(user.uid));
            if (isParticipantOrCreator) {
              if (activeOffice?.id !== officeIdFromUrl) {
                const targetOffice = userOffices.find(o => o.id === officeIdFromUrl);
                if (targetOffice) setActiveOffice(targetOffice); // Switch active office if necessary
              }
              setSelectedMeetingForPreview(meetingToSelect);
            } else {
              toast({ variant: "destructive", title: "Access Denied", description: "You are not a participant in this meeting." });
              router.replace(pathname, { scroll: false });
            }
          } else {
            toast({ variant: "destructive", title: "Meeting Not Found", description: "The meeting link is invalid or the meeting was deleted." });
            router.replace(pathname, { scroll: false });
          }
        } catch (error) {
          console.error("Error loading meeting from URL:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load meeting details from link." });
          router.replace(pathname, { scroll: false });
        } finally {
          setIsJoiningMeeting(false);
        }
      }
    };
    
    if (meetingIdFromUrl && officeIdFromUrl && user && !selectedMeetingForPreview) {
        loadMeetingFromUrl();
    } else if (!meetingIdFromUrl && selectedMeetingForPreview) {
        // If URL is cleared but meeting is selected, clear selection (user navigated away from join view)
        setSelectedMeetingForPreview(null);
    }

  }, [searchParams, user, meetings, selectedMeetingForPreview, activeOffice, userOffices, router, pathname, toast]);


  useEffect(() => {
    if (!user || meetings.length === 0 || isLoadingMeetings || isLoadingOfficeData) return;

    const now = new Date();
    const reminderSentKeyPrefix = `meetingReminderSent_`;

    const checkAndSendReminders = async () => {
      for (const meeting of meetings) {
        const meetingTime = meeting.dateTime;
        const timeDiffMinutes = (meetingTime.getTime() - now.getTime()) / (1000 * 60);
        const reminderKey = `${reminderSentKeyPrefix}${meeting.id}`;

        if (timeDiffMinutes <= 5 && timeDiffMinutes >= -1) {
          const isParticipantOrCreator = meeting.creatorUserId === user.uid || (meeting.participantIds && meeting.participantIds.includes(user.uid));

          if (isParticipantOrCreator && !sessionStorage.getItem(reminderKey) && meeting.officeId === activeOffice?.id) {
            try {
              await addUserNotification(user.uid, {
                type: "meeting-new",
                title: `Meeting Starting: ${meeting.title}`,
                message: `Your meeting "${meeting.title}" in ${activeOffice?.name || 'your office'} is starting now or in the next few minutes. Click to join.`,
                link: `/meetings?meetingId=${meeting.id}&officeId=${meeting.officeId}`,
                actorName: "System Reminder",
                entityId: meeting.id,
                entityType: "meeting",
                officeId: meeting.officeId,
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

  }, [meetings, user, toast, isLoadingMeetings, isLoadingOfficeData, activeOffice]);


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
          duration: 7000,
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
    setNewMeetingParticipantIds([]);
  };

  const combineDateTime = (date: Date, time: string): Date => {
    const [hours, minutes] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  };

  const handleScheduleMeeting = async () => {
    if (!user || !newMeetingStartDate || !newMeetingEndDate || !activeOffice) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in, select dates, and have an active office." });
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

    const selectedParticipantDetails = newMeetingParticipantIds
      .map(id => currentOfficeMembers.find(m => m.userId === id))
      .filter(Boolean) as OfficeMember[]; // Ensure only actual members
    
    const participantsDisplay = selectedParticipantDetails.map(m => m.name).join(', ') || "No specific participants";

    const meetingData: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt' | 'officeId' | 'creatorUserId'> = {
      title: newMeetingTitle,
      dateTime: startDateTime,
      endDateTime: endDateTime,
      isRecurring: newMeetingIsRecurring,
      participantIds: newMeetingParticipantIds, // Store IDs
      participantsDisplay: participantsDisplay, // Store display names
      description: newMeetingDescription || undefined,
    };
    const actorName = user.displayName || user.email || "User";

    try {
        await addMeetingToOffice(activeOffice.id, user.uid, meetingData, actorName, activeOffice.name);
        toast({ title: "Meeting Scheduled", description: `"${meetingData.title}" has been scheduled.` });
        fetchMeetingsForActiveOffice();
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
    if (!user || !meetingToDelete || !activeOffice) return;
    setIsSubmitting(true);
    const actorName = user.displayName || user.email || "User";
    try {
        await deleteMeetingFromOffice(activeOffice.id, meetingToDelete.id, user.uid, actorName);
        toast({ title: "Meeting Deleted", description: `"${meetingToDelete.title}" has been removed.`});
        fetchMeetingsForActiveOffice();
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

  const getSelectedParticipantNamesForDialog = () => {
    if (newMeetingParticipantIds.length === 0) return "Select Participants";
    const names = newMeetingParticipantIds
        .map(id => currentOfficeMembers.find(member => member.userId === id)?.name)
        .filter(Boolean) as string[];
    if (names.length > 2) return `${names.slice(0,2).join(', ')} +${names.length - 2} more`;
    return names.join(', ') || "Select Participants";
  };

  if (authLoading || isLoadingOfficeData) {
     return <div className="container mx-auto p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl font-headline font-bold mb-4 sm:mb-0">
            Video Meetings {activeOffice ? `for ${activeOffice.name}` : ''}
        </h1>
        {!selectedMeetingForPreview && (
          <Dialog open={isScheduleDialogOpen} onOpenChange={(isOpen) => { if (!isSubmitting) setIsScheduleDialogOpen(isOpen); if(!isOpen) resetScheduleForm();}}>
            <DialogTrigger asChild>
              <Button disabled={isSubmitting || !activeOffice}>
                <PlusCircle className="mr-2 h-4 w-4" /> Schedule New Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-headline text-xl">Schedule New Meeting {activeOffice ? `for ${activeOffice.name}`: ''}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[75vh] overflow-y-auto pr-2">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="flex items-center text-sm font-medium text-muted-foreground"><Edit className="mr-2 h-4 w-4 text-muted-foreground"/>Meeting Title</Label>
                  <Input id="title" value={newMeetingTitle} onChange={(e) => setNewMeetingTitle(e.target.value)} placeholder="Enter meeting title" disabled={isSubmitting}/>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="flex items-center text-sm font-medium text-muted-foreground"><Clock className="mr-2 h-4 w-4 text-muted-foreground"/>Description (Optional)</Label>
                  <Textarea id="description" value={newMeetingDescription} onChange={(e) => setNewMeetingDescription(e.target.value)} placeholder="Enter meeting description" rows={3} disabled={isSubmitting}/>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate" className="flex items-center text-sm font-medium text-muted-foreground"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/>Start Date & Time</Label>
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
                    <Label htmlFor="endDate" className="flex items-center text-sm font-medium text-muted-foreground"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/>End Date & Time</Label>
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
                  <Label htmlFor="isRecurring" className="flex items-center text-sm font-medium text-muted-foreground"><Repeat className="mr-2 h-4 w-4 text-muted-foreground"/> Recurring Meeting </Label>
                  <Switch id="isRecurring" checked={newMeetingIsRecurring} onCheckedChange={setNewMeetingIsRecurring} disabled={isSubmitting}/>
                </div>

                 <div className="space-y-1.5">
                    <Label htmlFor="participants" className="flex items-center text-sm font-medium text-muted-foreground"><UsersIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Participants</Label>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="outline" id="participants" className="w-full justify-start text-left font-normal h-auto min-h-10 py-2" disabled={isSubmitting || isLoadingOfficeData || currentOfficeMembers.length === 0}>
                            {isLoadingOfficeData && currentOfficeMembers.length === 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {getSelectedParticipantNamesForDialog()}
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[calc(var(--radix-dialog-content-width)-2rem)] sm:w-[calc(var(--radix-dialog-content-width)-3rem)] max-w-md">
                        <DropdownMenuLabel>Select Team Members</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {currentOfficeMembers.length > 0 && (
                            <DropdownMenuCheckboxItem
                            checked={newMeetingParticipantIds.length === currentOfficeMembers.length && currentOfficeMembers.length > 0}
                            onCheckedChange={(checked) => {
                                if (checked) {
                                setNewMeetingParticipantIds(currentOfficeMembers.map(m => m.userId));
                                } else {
                                setNewMeetingParticipantIds([]);
                                }
                            }}
                            disabled={isLoadingOfficeData}
                            >
                            Select All ({currentOfficeMembers.length})
                            </DropdownMenuCheckboxItem>
                        )}
                        <DropdownMenuSeparator />
                        {isLoadingOfficeData && currentOfficeMembers.length === 0 ? (
                            <div className="flex justify-center p-2"><Loader2 className="h-5 w-5 animate-spin" /></div>
                        ) : currentOfficeMembers.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">No members in this office to assign.</div>
                        ) : (
                            <div className="max-h-48 overflow-y-auto">
                            {currentOfficeMembers.map((member) => (
                            <DropdownMenuCheckboxItem
                                key={member.userId}
                                checked={newMeetingParticipantIds.includes(member.userId)}
                                onCheckedChange={(checked) => {
                                setNewMeetingParticipantIds((prev) =>
                                    checked
                                    ? [...prev, member.userId]
                                    : prev.filter((id) => id !== member.userId)
                                );
                                }}
                            >
                                <div className="flex items-center">
                                <Avatar className="h-6 w-6 mr-2">
                                    <AvatarImage src={member.avatarUrl || `https://placehold.co/40x40.png?text=${member.name.substring(0,1)}`} alt={member.name} data-ai-hint="person avatar"/>
                                    <AvatarFallback>{member.name.substring(0,1)}</AvatarFallback>
                                </Avatar>
                                {member.name}
                                </div>
                            </DropdownMenuCheckboxItem>
                            ))}
                            </div>
                        )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </div>

                <div className="space-y-1.5">
                    <Label className="flex items-center text-sm font-medium text-muted-foreground"><Video className="mr-2 h-4 w-4 text-muted-foreground"/>Meeting Type</Label>
                    <Button variant="outline" className="w-full justify-start bg-primary/10 border-primary text-primary" disabled>
                        <Video className="mr-2 h-4 w-4"/> Video Conference
                    </Button>
                </div>
              </div>
              <DialogFooter className="sm:justify-between">
                <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={handleScheduleMeeting} disabled={isSubmitting || !activeOffice}>
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
          {isLoadingMeetings && <div className="text-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}
          
          {!isLoadingMeetings && !activeOffice && (
                <Card className="shadow-lg">
                    <CardContent className="text-center py-10 text-muted-foreground">
                        <Briefcase className="mx-auto h-12 w-12 mb-3 text-gray-400" />
                        Please create or select an office to manage meetings.
                        <Button asChild variant="link" className="block mx-auto mt-2">
                            <Link href="/office-designer">Go to Office Designer</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

          {!isLoadingMeetings && activeOffice && meetings.length === 0 ? (
            <div className="text-center py-10 bg-muted/50 rounded-md flex flex-col items-center justify-center">
               <Video className="mx-auto h-12 w-12 text-muted-foreground mb-3"/>
              <p className="text-muted-foreground">No meetings scheduled yet for {activeOffice.name}.</p>
              <p className="text-sm text-muted-foreground">Schedule a new meeting to get started.</p>
            </div>
          ) : null}

          {!isLoadingMeetings && activeOffice && meetings.length > 0 && (
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
                      {meeting.participantsDisplay && <span className="flex items-center"><UsersIcon className="mr-1 h-4 w-4" /> {meeting.participantsDisplay}</span>}
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

    

