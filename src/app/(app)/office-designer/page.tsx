"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Users, Briefcase, Coffee, Zap } from "lucide-react";
import Image from "next/image";

interface Room {
  id: string;
  name: string;
  type: RoomType;
  icon: React.ElementType;
  capacity?: number;
}

type RoomType = "Team Hub" | "Meeting Room" | "Focus Booth" | "Social Lounge";

const roomTypeDetails: Record<RoomType, { icon: React.ElementType; defaultName: string, imageHint: string }> = {
  "Team Hub": { icon: Users, defaultName: "Team Hub", imageHint: "team collaboration" },
  "Meeting Room": { icon: Briefcase, defaultName: "Meeting Room", imageHint: "conference room" },
  "Focus Booth": { icon: Zap, defaultName: "Focus Booth", imageHint: "quiet workspace" },
  "Social Lounge": { icon: Coffee, defaultName: "Social Lounge", imageHint: "office lounge" },
};

export default function OfficeDesignerPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | undefined>();
  const [newRoomName, setNewRoomName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddRoom = () => {
    if (!selectedRoomType) return;
    const details = roomTypeDetails[selectedRoomType];
    const roomName = newRoomName.trim() === "" ? `${details.defaultName} ${rooms.filter(r => r.type === selectedRoomType).length + 1}` : newRoomName;
    
    const newRoom: Room = {
      id: Date.now().toString(),
      name: roomName,
      type: selectedRoomType,
      icon: details.icon,
    };
    setRooms([...rooms, newRoom]);
    setNewRoomName("");
    setSelectedRoomType(undefined);
    setIsDialogOpen(false);
  };

  const handleDeleteRoom = (id: string) => {
    setRooms(rooms.filter((room) => room.id !== id));
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl font-headline font-bold mb-4 sm:mb-0">Virtual Office Designer</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Room
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Room</DialogTitle>
              <DialogDescription>Select a room type and give it a name.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="roomType" className="text-right">
                  Type
                </Label>
                <Select onValueChange={(value) => setSelectedRoomType(value as RoomType)} value={selectedRoomType}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select room type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(roomTypeDetails).map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="roomName" className="text-right">
                  Name
                </Label>
                <Input
                  id="roomName"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="col-span-3"
                  placeholder={selectedRoomType ? roomTypeDetails[selectedRoomType].defaultName : "Room Name"}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddRoom} disabled={!selectedRoomType}>Add Room</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-12">
          <Image src="https://placehold.co/300x200.png" alt="Empty office" width={300} height={200} className="mx-auto mb-4 rounded-md" data-ai-hint="empty office" />
          <p className="text-lg text-muted-foreground">Your virtual office is empty. Start by adding some rooms!</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map((room) => (
            <Card key={room.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="font-headline flex items-center">
                      <room.icon className="mr-2 h-5 w-5 text-primary" />
                      {room.name}
                    </CardTitle>
                    <CardDescription>{room.type}</CardDescription>
                  </div>
                   <Button variant="ghost" size="icon" onClick={() => handleDeleteRoom(room.id)} aria-label="Delete room">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="aspect-video bg-muted rounded-md overflow-hidden relative">
                  <Image 
                    src={`https://placehold.co/400x225.png`} 
                    alt={room.name} 
                    layout="fill" 
                    objectFit="cover"
                    data-ai-hint={roomTypeDetails[room.type].imageHint}
                  />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent p-2 flex items-end">
                    <span className="text-xs text-primary-foreground">{/* Optional: capacity or status */}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">Enter Room</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
