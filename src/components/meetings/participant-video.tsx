
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MicOff } from "lucide-react";
import type { OfficeMember } from "@/types";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ParticipantVideoProps {
  participant: OfficeMember;
  stream?: MediaStream | null;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isSelf?: boolean;
}

export function ParticipantVideo({ 
    participant, 
    stream,
    isMuted = true,
    isVideoOff = true,
    isSelf = false 
}: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const showVideo = stream && !isVideoOff;

  return (
    <div className="bg-muted rounded-lg relative flex items-center justify-center shadow-inner overflow-hidden aspect-video">
      <video 
        ref={videoRef} 
        className={cn("w-full h-full object-cover", { "hidden": !showVideo, "transform -scale-x-100": isSelf })} 
        autoPlay 
        muted={isSelf}
        playsInline 
      />
      
      {!showVideo && (
        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 text-4xl">
          <AvatarImage src={participant.avatarUrl} alt={participant.name} data-ai-hint="person avatar" />
          <AvatarFallback>{participant.name?.substring(0, 2).toUpperCase() || 'P'}</AvatarFallback>
        </Avatar>
      )}

      <div className="absolute bottom-2 left-2 z-20 flex items-center space-x-2">
         <p className="text-white text-sm font-medium truncate bg-black/40 px-2 py-1 rounded-md">{participant.name}{isSelf ? " (You)" : ""}</p>
          {isMuted && (
            <div className="bg-black/40 rounded-full p-1.5 backdrop-blur-sm">
              <MicOff className="h-4 w-4 text-white" />
            </div>
          )}
      </div>
    </div>
  );
}
