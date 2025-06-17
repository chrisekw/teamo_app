
"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Users, Briefcase, Coffee, Zap, Building, KeyRound, UserPlus, Copy, Settings2, ShieldCheck, UserCircle as UserIcon } from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// --- Enums and Types ---
type RoomType = "Team Hub" | "Meeting Room" | "Focus Booth" | "Social Lounge";
type MemberRole = "Owner" | "Admin" | "Member";

interface Room {
  id: string;
  name: string;
  type: RoomType;
  icon: React.ElementType;
}

interface Member {
  id: string;
  name: string;
  role: MemberRole;
  avatarUrl?: string;
}

interface Office {
  id: string;
  name: string;
  invitationCode: string;
  rooms: Room[];
  members: Member[];
}

// --- Constants ---
const roomTypeDetails: Record<RoomType, { icon: React.ElementType; defaultName: string, imageHint: string }> = {
  "Team Hub": { icon: Users, defaultName: "Team Hub", imageHint: "team collaboration" },
  "Meeting Room": { icon: Briefcase, defaultName: "Meeting Room", imageHint: "conference room" },
  "Focus Booth": { icon: Zap, defaultName: "Focus Booth", imageHint: "quiet workspace" },
  "Social Lounge": { icon: Coffee, defaultName: "Social Lounge", imageHint: "office lounge" },
};

const roleIcons: Record<MemberRole, React.ElementType> = {
  "Owner": ShieldCheck,
  "Admin": Settings2,
  "Member": UserIcon,
};


// --- Page Component ---
export default function OfficeDesignerPage() {
  const { toast } = useToast();
  const [activeOffice, setActiveOffice] = useState<Office | null>(null);

  // Dialog states
  const [isCreateOfficeDialogOpen, setIsCreateOfficeDialogOpen] = useState(false);
  const [isJoinOfficeDialogOpen, setIsJoinOfficeDialogOpen] = useState(false);
  const [isAddRoomDialogOpen, setIsAddRoomDialogOpen] = useState(false);
  const [isInviteMemberDialogOpen, setIsInviteMemberDialogOpen] = useState(false);
  const [isManageMemberDialogOpen, setIsManageMemberDialogOpen] = useState(false);
  const [isConfirmDeleteMemberDialogOpen, setIsConfirmDeleteMemberDialogOpen] = useState(false);
  const [isConfirmDeleteRoomDialogOpen, setIsConfirmDeleteRoomDialogOpen] = useState(false);
  

  // Form states for dialogs
  const [newOfficeName, setNewOfficeName] = useState("");
  const [joinOfficeCode, setJoinOfficeCode] = useState("");
  
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | undefined>();
  const [newRoomName, setNewRoomName] = useState("");

  const [managingMember, setManagingMember] = useState<Member | null>(null);
  const [selectedRole, setSelectedRole] = useState<MemberRole>("Member");
  
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);


  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // --- Office Management Handlers ---
  const handleCreateOffice = () => {
    if (!newOfficeName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Office name cannot be empty." });
      return;
    }
    const newOffice: Office = {
      id: Date.now().toString(),
      name: newOfficeName,
      invitationCode: generateInviteCode(),
      rooms: [],
      members: [{ id: "user-creator", name: "You (Creator)", role: "Owner", avatarUrl: `https://placehold.co/40x40.png?text=ME` }],
    };
    setActiveOffice(newOffice);
    setNewOfficeName("");
    setIsCreateOfficeDialogOpen(false);
    toast({ title: "Office Created!", description: `Your new office "${newOffice.name}" is ready.` });
  };

  const handleJoinOffice = () => {
    if (!joinOfficeCode.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Invitation code cannot be empty." });
      return;
    }
    // Mock joining - in a real app, this would verify the code with a backend
    const mockJoinedOffice: Office = {
      id: "joined-office-" + Date.now().toString(),
      name: "Joined Demo Office",
      invitationCode: joinOfficeCode,
      rooms: [
        { id: "room-j1", name: "General Hub", type: "Team Hub", icon: roomTypeDetails["Team Hub"].icon },
        { id: "room-j2", name: "Project Discussions", type: "Meeting Room", icon: roomTypeDetails["Meeting Room"].icon },
      ],
      members: [
        { id: "user-owner-joined", name: "Alex (Owner)", role: "Owner", avatarUrl: `https://placehold.co/40x40.png?text=AL` },
        { id: "user-you-joined", name: "You", role: "Member", avatarUrl: `https://placehold.co/40x40.png?text=ME` },
      ],
    };
    setActiveOffice(mockJoinedOffice);
    setJoinOfficeCode("");
    setIsJoinOfficeDialogOpen(false);
    toast({ title: "Joined Office!", description: `You've joined "${mockJoinedOffice.name}".` });
  };

  // --- Room Management Handlers ---
  const handleAddRoom = () => {
    if (!activeOffice || !selectedRoomType) return;
    const details = roomTypeDetails[selectedRoomType];
    const roomName = newRoomName.trim() === "" ? `${details.defaultName} ${activeOffice.rooms.filter(r => r.type === selectedRoomType).length + 1}` : newRoomName;
    
    const newRoom: Room = {
      id: Date.now().toString(),
      name: roomName,
      type: selectedRoomType,
      icon: details.icon,
    };
    setActiveOffice({ ...activeOffice, rooms: [...activeOffice.rooms, newRoom] });
    setNewRoomName("");
    setSelectedRoomType(undefined);
    setIsAddRoomDialogOpen(false);
  };

  const openDeleteRoomDialog = (id: string) => {
    setDeletingRoomId(id);
    setIsConfirmDeleteRoomDialogOpen(true);
  };
  
  const handleDeleteRoom = () => {
    if (!activeOffice || !deletingRoomId) return;
    setActiveOffice({ ...activeOffice, rooms: activeOffice.rooms.filter((room) => room.id !== deletingRoomId) });
    setDeletingRoomId(null);
    setIsConfirmDeleteRoomDialogOpen(false);
    toast({ title: "Room Deleted", description: "The room has been removed from your office." });
  };

  // --- Member Management Handlers ---
  const handleInviteMember = () => {
    if (!activeOffice) return;
    // In a real app, you'd send an invite. Here we just add a mock member.
    const newMember: Member = {
      id: `user-${Date.now()}`,
      name: `New Member ${activeOffice.members.length}`,
      role: "Member",
      avatarUrl: `https://placehold.co/40x40.png?text=N${activeOffice.members.length}`
    };
    setActiveOffice({...activeOffice, members: [...activeOffice.members, newMember]});
    setIsInviteMemberDialogOpen(false);
    toast({ title: "Member Invited (Mock)", description: "A new member has been notionally added. Share the invite code!" });
  };

  const handleOpenManageMemberDialog = (member: Member) => {
    setManagingMember(member);
    setSelectedRole(member.role);
    setIsManageMemberDialogOpen(true);
  };

  const handleSaveMemberRole = () => {
    if (!activeOffice || !managingMember) return;
    setActiveOffice({
      ...activeOffice,
      members: activeOffice.members.map(m => 
        m.id === managingMember.id ? { ...m, role: selectedRole } : m
      ),
    });
    setIsManageMemberDialogOpen(false);
    setManagingMember(null);
    toast({ title: "Role Updated", description: `${managingMember.name}'s role has been changed to ${selectedRole}.`});
  };

  const openDeleteMemberDialog = (id: string) => {
    setDeletingMemberId(id);
    setIsConfirmDeleteMemberDialogOpen(true);
  };

  const handleDeleteMember = () => {
    if (!activeOffice || !deletingMemberId) return;
    const memberToDelete = activeOffice.members.find(m => m.id === deletingMemberId);
    if (memberToDelete?.role === "Owner") {
      toast({ variant: "destructive", title: "Action Denied", description: "The office Owner cannot be removed."});
      setDeletingMemberId(null);
      setIsConfirmDeleteMemberDialogOpen(false);
      return;
    }
    setActiveOffice({
      ...activeOffice,
      members: activeOffice.members.filter(m => m.id !== deletingMemberId),
    });
    setDeletingMemberId(null);
    setIsConfirmDeleteMemberDialogOpen(false);
    toast({ title: "Member Removed", description: "The member has been removed from your office." });
  };

  const copyInviteCode = () => {
    if (activeOffice?.invitationCode) {
      navigator.clipboard.writeText(activeOffice.invitationCode)
        .then(() => toast({ title: "Copied!", description: "Invitation code copied to clipboard." }))
        .catch(() => toast({ variant: "destructive", title: "Error", description: "Failed to copy invite code." }));
    }
  };

  // --- Render Logic ---
  if (!activeOffice) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-150px)]">
        <Image src="https://placehold.co/300x200.png" alt="Empty office illustration" width={300} height={200} className="mb-8 rounded-md" data-ai-hint="office blueprint" />
        <h1 className="text-3xl font-headline font-bold mb-4 text-center">Welcome to the Office Designer!</h1>
        <p className="text-muted-foreground mb-8 text-center max-w-md">Create your own virtual office space or join an existing one to start collaborating with your team.</p>
        <div className="flex space-x-4">
          <Button size="lg" onClick={() => setIsCreateOfficeDialogOpen(true)}>
            <Building className="mr-2 h-5 w-5" /> Create New Office
          </Button>
          <Button size="lg" variant="outline" onClick={() => setIsJoinOfficeDialogOpen(true)}>
            <KeyRound className="mr-2 h-5 w-5" /> Join with Code
          </Button>
        </div>

        {/* Create Office Dialog */}
        <Dialog open={isCreateOfficeDialogOpen} onOpenChange={setIsCreateOfficeDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline">Create New Virtual Office</DialogTitle>
              <DialogDescription>Give your new office a name to get started.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="newOfficeName">Office Name</Label>
              <Input id="newOfficeName" value={newOfficeName} onChange={(e) => setNewOfficeName(e.target.value)} placeholder="e.g., Team Alpha HQ" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOfficeDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateOffice}>Create Office</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Join Office Dialog */}
        <Dialog open={isJoinOfficeDialogOpen} onOpenChange={setIsJoinOfficeDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline">Join Existing Office</DialogTitle>
              <DialogDescription>Enter the invitation code provided to you.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="joinOfficeCode">Invitation Code</Label>
              <Input id="joinOfficeCode" value={joinOfficeCode} onChange={(e) => setJoinOfficeCode(e.target.value)} placeholder="e.g., XYZ-789" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsJoinOfficeDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleJoinOffice}>Join Office</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- Main Office View ---
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b">
        <div>
          <h1 className="text-3xl font-headline font-bold">{activeOffice.name}</h1>
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <span>Invitation Code: {activeOffice.invitationCode}</span>
            <Button variant="ghost" size="sm" onClick={copyInviteCode} className="ml-2 px-1 py-0 h-auto">
              <Copy className="h-3 w-3 mr-1" /> Copy
            </Button>
          </div>
        </div>
         <Button onClick={() => setActiveOffice(null)} variant="outline">Exit Office View</Button>
      </div>

      {/* Team Members Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-headline font-semibold">Team Members</h2>
          <Button onClick={() => setIsInviteMemberDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Invite Member
          </Button>
        </div>
        {activeOffice.members.length === 0 ? (
          <p className="text-muted-foreground">No members yet. Invite someone!</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeOffice.members.map((member) => {
              const RoleIcon = roleIcons[member.role] || UserIcon;
              return (
              <Card key={member.id} className="shadow-sm">
                <CardContent className="p-4 flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="person avatar" />
                    <AvatarFallback>{member.name.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{member.name}</p>
                    <Badge variant={member.role === "Owner" || member.role === "Admin" ? "default" : "secondary"} className="mt-1">
                      <RoleIcon className="mr-1 h-3 w-3" />
                      {member.role}
                    </Badge>
                  </div>
                  {member.role !== "Owner" && (
                     <Dialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Settings2 className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenManageMemberDialog(member)}>
                              Manage Role
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDeleteMemberDialog(member.id)} className="text-destructive">
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </Dialog>
                  )}
                </CardContent>
              </Card>
            )})}
          </div>
        )}
      </section>
      
      <Separator className="my-8"/>

      {/* Office Rooms Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-headline font-semibold">Office Rooms</h2>
          <Button onClick={() => setIsAddRoomDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Room
          </Button>
        </div>
        {activeOffice.rooms.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <Image src="https://placehold.co/300x200.png" alt="Empty office rooms" width={300} height={200} className="mx-auto mb-4 rounded-md" data-ai-hint="office blueprint" />
            <p className="text-lg text-muted-foreground">This office has no rooms yet.</p>
            <p className="text-sm text-muted-foreground">Click "Add Room" to design your virtual space.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeOffice.rooms.map((room) => {
               const RoomIconComponent = room.icon;
               return (
                <Card key={room.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="font-headline flex items-center">
                          <RoomIconComponent className="mr-2 h-5 w-5 text-primary" />
                          {room.name}
                        </CardTitle>
                        <CardDescription>{room.type}</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteRoomDialog(room.id)} aria-label="Delete room">
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
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">Enter Room</Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </section>
      
      {/* --- Dialogs for Active Office --- */}

      {/* Add Room Dialog */}
      <Dialog open={isAddRoomDialogOpen} onOpenChange={setIsAddRoomDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Add New Room</DialogTitle>
            <DialogDescription>Select a room type and give it a name.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="roomType" className="text-right">Type</Label>
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
              <Label htmlFor="roomName" className="text-right">Name</Label>
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
            <Button variant="outline" onClick={() => setIsAddRoomDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRoom} disabled={!selectedRoomType}>Add Room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={isInviteMemberDialogOpen} onOpenChange={setIsInviteMemberDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Invite New Member</DialogTitle>
            <DialogDescription>Share the invitation code with people you want to invite.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Invitation Code</Label>
            <div className="flex items-center space-x-2">
              <Input value={activeOffice.invitationCode} readOnly className="font-mono"/>
              <Button variant="outline" size="sm" onClick={copyInviteCode}><Copy className="h-3 w-3 mr-1"/>Copy</Button>
            </div>
            <p className="text-xs text-muted-foreground">This example adds a mock member directly. In a real app, users would join using this code.</p>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsInviteMemberDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInviteMember}>Add Mock Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Member Dialog */}
      {managingMember && (
        <Dialog open={isManageMemberDialogOpen} onOpenChange={(open) => { setIsManageMemberDialogOpen(open); if (!open) setManagingMember(null); }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline">Manage {managingMember.name}</DialogTitle>
              <DialogDescription>Change their role in the office.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="memberRole">Role</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as MemberRole)}>
                <SelectTrigger id="memberRole">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {setIsManageMemberDialogOpen(false); setManagingMember(null);}}>Cancel</Button>
              <Button onClick={handleSaveMemberRole}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm Delete Member Dialog */}
      <Dialog open={isConfirmDeleteMemberDialogOpen} onOpenChange={setIsConfirmDeleteMemberDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline">Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {activeOffice.members.find(m => m.id === deletingMemberId)?.name || 'this member'} from the office? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={() => {setIsConfirmDeleteMemberDialogOpen(false); setDeletingMemberId(null)}}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteMember}>Remove Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       {/* Confirm Delete Room Dialog */}
       <Dialog open={isConfirmDeleteRoomDialogOpen} onOpenChange={setIsConfirmDeleteRoomDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline">Delete Room</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the room "{activeOffice.rooms.find(r => r.id === deletingRoomId)?.name || 'this room'}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={() => {setIsConfirmDeleteRoomDialogOpen(false); setDeletingRoomId(null)}}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRoom}>Delete Room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
