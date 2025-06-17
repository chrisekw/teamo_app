
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Video, VideoOff, MicOff, ScreenShare, PhoneOff } from "lucide-react";
import type { Meeting } from "@/types";

interface VideoCallViewProps {
    selectedMeeting: Meeting | null;
    user: FirebaseUser | null;
    onLeaveMeeting: () => void;
    videoRef: React.RefObject<HTMLVideoElement>;
    isJoining: boolean;
    hasCameraPermission?: boolean;
}

export function VideoCallView({ 
    selectedMeeting, 
    user, 
    onLeaveMeeting, 
    videoRef,
    isJoining,
    hasCameraPermission
}: VideoCallViewProps) {
    if (!selectedMeeting) return null;

    return (
        <Card className="shadow-xl">
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="font-headline flex items-center">
                <Video className="mr-2 h-5 w-5 text-primary" />
                {selectedMeeting.title}
                </CardTitle>
                <Button variant="destructive" onClick={onLeaveMeeting}>
                <PhoneOff className="mr-2 h-4 w-4" /> Leave Meeting
                </Button>
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
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Participants ({selectedMeeting.participants.length +1})</h3>
                    <div className="h-64 overflow-y-auto space-y-2 pr-2 rounded-md border p-2 bg-background">
                        <div className="flex items-center space-x-2 p-2 rounded bg-muted/50">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user?.photoURL || "https://placehold.co/40x40.png?text=YOU"} alt={user?.displayName || "You"} data-ai-hint="person avatar" />
                                <AvatarFallback>{user?.displayName?.substring(0,1) || "Y"}</AvatarFallback>
                            </Avatar>
                            <span>You (Local)</span>
                        </div>
                        {selectedMeeting.participants.map((name, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
                            <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://placehold.co/40x40.png?text=${name.substring(0,1)}`} alt={name} data-ai-hint="person avatar" />
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
    );
}

    