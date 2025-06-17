"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Video, Users, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";

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
    dateTime: new Date(new Date().setDate(new Date().getDate() + 1)),
    durationMinutes: 60,
    participants: ["Alice", "Bob", "Charlie"],
    description: "Initial meeting to discuss Project Alpha scope and timelines.",
  },
  {
    id: "2",
    title: "Weekly Sync",
    dateTime: new Date(new Date().setDate(new Date().getDate() + 2)),
    durationMinutes: 30,
    participants: ["Alice", "Bob", "David", "Eve"],
    description: "Regular team sync to discuss progress and blockers.",
  },
  {
    id: "3",
    title: "Client Demo Prep",
    dateTime: new Date(new Date().setDate(new Date().getDate() + 3)),
    durationMinutes: 45,
    participants: ["Charlie", "David"],
    description: "Preparation session for the upcoming client demonstration.",
  },
];

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>(mockMeetings);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);

  // Form state for new meeting
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newMeetingDate, setNewMeetingDate] = useState<Date | undefined>(new Date());
  const [newMeetingTime, setNewMeetingTime] = useState("10:00");
  const [newMeetingDuration, setNewMeetingDuration] = useState("30");
  const [newMeetingParticipants, setNewMeetingParticipants] = useState("");
  const [newMeetingDescription, setNewMeetingDescription] = useState("");

  const handleScheduleMeeting = () => {
    if (!newMeetingTitle || !newMeetingDate || !newMeetingTime) return;
    
    const [hours, minutes] = newMeetingTime.split(':').map(Number);
    const combinedDateTime = new Date(newMeetingDate);
    combinedDateTime.setHours(hours, minutes);

    const newMeeting: Meeting = {
      id: Date.now().toString(),
      title: newMeetingTitle,
      dateTime: combinedDateTime,
      durationMinutes: parseInt(newMeetingDuration, 10),
      participants: newMeetingParticipants.split(',').map(p => p.trim()).filter(p => p),
      description: newMeetingDescription,
    };
    setMeetings(prevMeetings => [...prevMeetings, newMeeting].sort((a,b) => a.dateTime.getTime() - b.dateTime.getTime()));
    
    // Reset form and close dialog
    setNewMeetingTitle("");
    setNewMeetingDate(new Date());
    setNewMeetingTime("10:00");
    setNewMeetingDuration("30");
    setNewMeetingParticipants("");
    setNewMeetingDescription("");
    setIsScheduleDialogOpen(false);
  };
  
  const filteredMeetings = meetings.filter(meeting => 
    selectedDate ? meeting.dateTime.toDateString() === selectedDate.toDateString() : true
  );

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl font-headline font-bold mb-4 sm:mb-0">Video Meetings</h1>
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
                <Calendar mode="single" selected={newMeetingDate} onSelect={setNewMeetingDate} className="rounded-md border p-0" />
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
              <Button onClick={handleScheduleMeeting}>Schedule Meeting</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline">Select Date</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <h2 className="text-2xl font-headline font-semibold mb-4">
            Upcoming Meetings {selectedDate ? `for ${selectedDate.toLocaleDateString()}` : ""}
          </h2>
          {filteredMeetings.length === 0 ? (
            <div className="text-center py-10 bg-muted/50 rounded-md">
              <Image src="https://placehold.co/200x150.png" alt="No meetings" width={200} height={150} className="mx-auto mb-4 rounded" data-ai-hint="empty calendar" />
              <p className="text-muted-foreground">No meetings scheduled {selectedDate ? `for this date` : "yet"}.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMeetings.map((meeting) => (
                <Card key={meeting.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="font-headline flex items-center">
                      <Video className="mr-2 h-5 w-5 text-primary" />
                      {meeting.title}
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-4 text-sm">
                      <span className="flex items-center"><Clock className="mr-1 h-4 w-4" /> {meeting.dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({meeting.durationMinutes} min)</span>
                      <span className="flex items-center"><Users className="mr-1 h-4 w-4" /> {meeting.participants.length} participants</span>
                    </CardDescription>
                  </CardHeader>
                  {meeting.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{meeting.description}</p>
                    </CardContent>
                  )}
                  <CardFooter>
                    <Button className="w-full sm:w-auto">
                      <Video className="mr-2 h-4 w-4" /> Join Meeting
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
