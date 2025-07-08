
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PlusCircle, Video, Users as UsersIcon, Clock, Loader2, Trash2, CalendarDays, Briefcase, CheckCircle } from "lucide-react";
import { useState, useEffect, useCallback, Suspense } from "react";
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import type { Meeting, OfficeMember, Office } from "@/types";
import { useAuth } from "@/lib/firebase/auth";
import { addMeetingToOffice, getMeetingsForOfficeVisibleToUser, deleteMeetingFromOffice, getMeetingByIdFromOffice } from "@/lib/firebase/firestore/meetings";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getOfficesForUser, onUserOfficesUpdate, getMembersForOffice } from "@/lib/firebase/firestore/offices";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { addUserNotification } from "@/lib/firebase/firestore/notifications";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const VideoCallView = dynamic(() => import('@/components/meetings/video-call-view').then(mod => mod.VideoCallView), {
  ssr: false,
  loading: () => <div className="p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
});

const ScheduleMeetingForm = dynamic(() => import('@/components/meetings/schedule-meeting-form'), {
  ssr: false,
  loading: () => <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
});

const scheduleMeetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDate: z.date(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  durationMinutes: z.coerce.number().min(1, "Duration must be positive"),
  isRecurring: z.boolean().default(false),
  participantIds: z.array(z.string()).optional(),
});
export type ScheduleMeetingValues = z.infer<typeof scheduleMeetingSchema>;

export default function MeetingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [pastMeetings, setPastMeetings] = useState<Meeting[]>([]);

  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  
  const [userOffices, setUserOffices] = useState<Office[]>([]);
  const [activeOffice, setActiveOffice] = useState<Office | null>(null);
  const [currentOfficeMembers, setCurrentOfficeMembers] = useState<OfficeMember[]>([]);
  const [isLoadingOfficeData, setIsLoadingOfficeData] = useState(true);

  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isLoadingMeetingDetails, setIsLoadingMeetingDetails] = useState(false);

  const form = useForm<ScheduleMeetingValues>({
    resolver: zodResolver(scheduleMeetingSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: new Date(),
      startTime: "10:00",
      durationMinutes: 60,
      isRecurring: false,
      participantIds: [],
    }
  });

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingOfficeData(true);
      const unsub = onUserOfficesUpdate(user.uid, (offices) => {
        setUserOffices(offices);
        if (offices.length > 0 && !activeOffice) {
          const officeIdFromUrl = searchParams.get('officeId');
          const foundOffice = offices.find(o => o.id === officeIdFromUrl) || offices[0];
          setActiveOffice(foundOffice);
        } else if (offices.length === 0) {
          setActiveOffice(null);
        }
        setIsLoadingOfficeData(false);
      });
      return () => unsub();
    }
  }, [user, authLoading, searchParams, activeOffice]);

  useEffect(() => {
    if (activeOffice) {
      router.replace(`${pathname}?officeId=${activeOffice.id}`, { scroll: false });
      getMembersForOffice(activeOffice.id).then(setCurrentOfficeMembers);
    }
  }, [activeOffice, pathname, router]);

  const fetchMeetingsForActiveOffice = useCallback(async () => {
    if (user && activeOffice) {
      setIsLoadingMeetings(true);
      try {
        const userMeetings = await getMeetingsForOfficeVisibleToUser(activeOffice.id, user.uid);
        setAllMeetings(userMeetings.sort((a,b) => a.dateTime.getTime() - b.dateTime.getTime()));
      } catch (error) {
        console.error("Failed to fetch meetings:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch meetings." });
      } finally {
        setIsLoadingMeetings(false);
      }
    } else {
        setAllMeetings([]);
        setIsLoadingMeetings(false);
    }
  }, [user, activeOffice, toast]);

  useEffect(() => {
    fetchMeetingsForActiveOffice();
  }, [fetchMeetingsForActiveOffice]);
  
  useEffect(() => {
    const now = new Date();
    const upcoming = allMeetings.filter(m => m.endDateTime >= now);
    const past = allMeetings.filter(m => m.endDateTime < now).sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime());
    setUpcomingMeetings(upcoming);
    setPastMeetings(past);
  }, [allMeetings]);

  const handleJoinMeetingClick = useCallback((meeting: Meeting) => {
    router.push(`${pathname}?officeId=${meeting.officeId}&meetingId=${meeting.id}`, { scroll: false });
  }, [router, pathname]);

  useEffect(() => {
    const meetingIdFromUrl = searchParams.get('meetingId');
    const officeIdFromUrl = searchParams.get('officeId');
    if (meetingIdFromUrl && officeIdFromUrl && user) {
      setIsLoadingMeetingDetails(true);
      getMeetingByIdFromOffice(officeIdFromUrl, meetingIdFromUrl)
        .then(meeting => {
          if (meeting && (meeting.creatorUserId === user.uid || meeting.participantIds?.includes(user.uid))) {
            setSelectedMeeting(meeting);
          } else {
            toast({ variant: "destructive", title: "Access Denied", description: "Meeting not found or you are not a participant." });
            router.replace(`${pathname}?officeId=${officeIdFromUrl}`, { scroll: false });
          }
        })
        .finally(() => setIsLoadingMeetingDetails(false));
    } else {
      setSelectedMeeting(null);
    }
  }, [searchParams, user, router, pathname, toast]);

  const combineDateTime = (date: Date, time: string): Date => {
    const [hours, minutes] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  };

  const handleScheduleMeeting: SubmitHandler<ScheduleMeetingValues> = async (data) => {
    if (!user || !activeOffice) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in and have an active office." });
      return;
    }
    
    setIsSubmitting(true);
    const startDateTime = combineDateTime(data.startDate, data.startTime);
    const endDateTime = new Date(startDateTime.getTime() + data.durationMinutes * 60 * 1000);

    const selectedParticipantDetails = (data.participantIds || [])
      .map(id => currentOfficeMembers.find(m => m.userId === id))
      .filter(Boolean) as OfficeMember[];
    const participantsDisplay = selectedParticipantDetails.map(m => m.name).join(', ') || "No specific participants";

    const meetingData = {
      title: data.title,
      description: data.description,
      dateTime: startDateTime,
      endDateTime: endDateTime,
      isRecurring: data.isRecurring,
      participantIds: data.participantIds,
      participantsDisplay: participantsDisplay,
    };
    const actorName = user.displayName || user.email || "User";

    try {
        await addMeetingToOffice(activeOffice.id, user.uid, meetingData, actorName, activeOffice.name);
        toast({ title: "Meeting Scheduled", description: `"${data.title}" has been scheduled.` });
        fetchMeetingsForActiveOffice();
        setIsScheduleDialogOpen(false);
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
        if (selectedMeeting?.id === meetingToDelete.id) {
            setSelectedMeeting(null);
            router.replace(`${pathname}?officeId=${activeOffice.id}`, { scroll: false }); 
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
    const officeIdParam = activeOffice?.id ? `?officeId=${activeOffice.id}` : '';
    setSelectedMeeting(null);
    router.replace(`${pathname}${officeIdParam}`, { scroll: false }); 
  };
  
  const calculateDuration = (start: Date, end: Date): string => {
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const handleOfficeChange = (officeId: string) => {
    if (officeId && officeId !== activeOffice?.id) {
        const newActiveOffice = userOffices.find(o => o.id === officeId);
        if (newActiveOffice) {
            setActiveOffice(newActiveOffice);
        }
    }
  };

  const renderMeetingCard = (meeting: Meeting, isPast: boolean) => (
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
            disabled={isLoadingMeetingDetails || isPast}
          >
            {isLoadingMeetingDetails && selectedMeeting?.id === meeting.id ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Video className="mr-2 h-4 w-4" />
            )}
            {isLoadingMeetingDetails && selectedMeeting?.id === meeting.id ? 'Joining...' : (isPast ? 'Meeting Ended' : 'Join Meeting')}
          </Button>
        </CardFooter>
      </Card>
  );

  if (authLoading || isLoadingOfficeData) {
     return <div className="container mx-auto p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (isLoadingMeetingDetails) {
     return <div className="container mx-auto p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      {selectedMeeting && user ? (
        <VideoCallView
            selectedMeeting={selectedMeeting}
            user={user}
            onLeaveMeeting={handleLeaveMeeting}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <h1 className="text-3xl font-headline font-bold mb-4 sm:mb-0">
                Video Meetings
            </h1>
            <Dialog open={isScheduleDialogOpen} onOpenChange={(isOpen) => { if (!isSubmitting) setIsScheduleDialogOpen(isOpen); }}>
              <DialogTrigger asChild>
                <Button onClick={() => form.reset()} disabled={isSubmitting || !activeOffice}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Schedule New Meeting
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-headline text-xl">Schedule New Meeting {activeOffice ? `for ${activeOffice.name}`: ''}</DialogTitle>
                </DialogHeader>
                 <Suspense fallback={<div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                    <ScheduleMeetingForm
                        form={form}
                        onSubmit={handleScheduleMeeting}
                        isSubmitting={isSubmitting}
                        currentOfficeMembers={currentOfficeMembers}
                        onCancel={() => setIsScheduleDialogOpen(false)}
                    />
                 </Suspense>
              </DialogContent>
            </Dialog>
          </div>
            <div className="mb-6">
                <Label htmlFor="office-switcher" className="text-sm font-medium text-muted-foreground">Active Office</Label>
                <Select value={activeOffice?.id || ''} onValueChange={handleOfficeChange} disabled={userOffices.length <= 1}>
                    <SelectTrigger id="office-switcher" className="w-full sm:w-[280px] mt-1">
                        <SelectValue placeholder="Select an office" />
                    </SelectTrigger>
                    <SelectContent>
                        {userOffices.map(office => (
                            <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          <div className="w-full space-y-8">
            <div>
                 <h2 className="text-2xl font-headline font-semibold mb-4">
                    Upcoming Meetings ({upcomingMeetings.length})
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

                {!isLoadingMeetings && activeOffice && allMeetings.length === 0 ? (
                <div className="text-center py-10 bg-muted/50 rounded-md flex flex-col items-center justify-center">
                    <Video className="mx-auto h-12 w-12 text-muted-foreground mb-3"/>
                    <p className="text-muted-foreground">No meetings scheduled yet for {activeOffice.name}.</p>
                    <p className="text-sm text-muted-foreground">Schedule a new meeting to get started.</p>
                </div>
                ) : null}
                
                {!isLoadingMeetings && activeOffice && upcomingMeetings.length === 0 && allMeetings.length > 0 && (
                     <div className="text-center py-10 bg-muted/50 rounded-md flex flex-col items-center justify-center">
                        <Video className="mx-auto h-12 w-12 text-muted-foreground mb-3"/>
                        <p className="text-muted-foreground">No upcoming meetings.</p>
                    </div>
                )}

                {!isLoadingMeetings && activeOffice && upcomingMeetings.length > 0 && (
                <div className="space-y-4">
                    {upcomingMeetings.map(meeting => renderMeetingCard(meeting, false))}
                </div>
                )}
            </div>

            {pastMeetings.length > 0 && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="past-meetings" className="border-b-0">
                  <AccordionTrigger className="hover:no-underline border-t pt-6">
                    <h2 className="text-2xl font-headline font-semibold flex items-center">
                        <CheckCircle className="mr-2 h-6 w-6 text-green-500" />
                        Completed Meetings ({pastMeetings.length})
                    </h2>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                     <div className="space-y-4">
                        {pastMeetings.map(meeting => renderMeetingCard(meeting, true))}
                     </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        </>
      )}
    </div>
  );
}
