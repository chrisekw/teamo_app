
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MicOff, VideoOff } from "lucide-react";
import type { OfficeMember } from "@/types";

interface ParticipantVideoProps {
  participant: OfficeMember;
  isSelf?: boolean;
}

export function ParticipantVideo({ participant, isSelf = false }: ParticipantVideoProps) {
  return (
    <div className="aspect-video bg-muted rounded-md relative flex items-center justify-center shadow-inner overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10" />
      <Avatar className="h-16 w-16 z-20">
        <AvatarImage src={participant.avatarUrl} alt={participant.name} data-ai-hint="person avatar" />
        <AvatarFallback className="text-2xl">{participant.name?.substring(0, 2).toUpperCase() || 'P'}</AvatarFallback>
      </Avatar>
      <div className="absolute bottom-2 left-2 z-20 flex items-center space-x-2">
         <p className="text-white text-sm font-medium truncate">{participant.name}{isSelf ? " (You)" : ""}</p>
      </div>
      <div className="absolute top-2 right-2 z-20 flex items-center space-x-1.5">
          <div className="bg-black/40 rounded-full p-1.5 backdrop-blur-sm">
            <MicOff className="h-4 w-4 text-white" />
          </div>
           <div className="bg-black/40 rounded-full p-1.5 backdrop-blur-sm">
            <VideoOff className="h-4 w-4 text-white" />
          </div>
      </div>
    </div>
  );
}
