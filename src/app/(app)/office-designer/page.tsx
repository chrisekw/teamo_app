
"use client";

import { useState, useEffect, type ReactNode, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Users, Briefcase, Coffee, Zap, Building, KeyRound, UserPlus, Copy, Settings2, ShieldCheck, UserCircle as UserIconLucide, Loader2, Edit } from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/firebase/auth";
import type { Office, Room, OfficeMember, RoomType, MemberRole } from "@/types";
import { 
  createOffice, 
  joinOfficeByCode, 
  getOfficesForUser, 
  getOfficeDetails,
  addRoomToOffice, 
  getRoomsForOffice, 
  deleteRoomFromOffice,
  getMembersForOffice,
  updateMemberRoleInOffice,
  removeMemberFromOffice
} from "@/lib/firebase/firestore/offices";

const roomTypeDetails: Record<RoomType, { icon: React.ElementType; defaultName: string, imageHint: string, iconName: string }> = {
  "Team Hub": { icon: Users, defaultName: "Team Hub", imageHint: "team collaboration", iconName: "Users" },
  "Meeting Room": { icon: Briefcase, defaultName: "Meeting Room", imageHint: "conference room", iconName: "Briefcase" },
  "Focus Booth": { icon: Zap, defaultName: "Focus Booth", imageHint: "quiet workspace", iconName: "Zap" },
  "Social Lounge": { icon: Coffee, defaultName: "Social Lounge", imageHint: "office lounge", iconName: "Coffee" },
};

const lucideIcons: Record<string, React.ElementType> = { Users, Briefcase, Zap, Coffee, Building }; 

const roleIcons: Record<MemberRole, React.ElementType> = {
  "Owner": ShieldCheck,
  "Admin": Settings2,
  "Member": UserIconLucide,
};

export default function OfficeDesignerPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [userOffices, setUserOffices] = useState<Office[]>([]);
  const [activeOffice, setActiveOffice] = useState<Office | null>(null);
  const [activeOfficeRooms, setActiveOfficeRooms] = useState<Room[]>([]);
  const [activeOfficeMembers, setActiveOfficeMembers] = useState<OfficeMember[]>([]);
  
  const [isLoading, setIsLoading] = useState(true); // For initial user offices load
  const [isLoadingDetails, setIsLoadingDetails] = useState(false); // For active office rooms/members load
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submissions

  const [isCreateOfficeDialogOpen, setIsCreateOfficeDialogOpen] = useState(false);
  const [isJoinOfficeDialogOpen, setIsJoinOfficeDialogOpen] = useState(false);
  const [isAddRoomDialogOpen, setIsAddRoomDialogOpen] = useState(false);
  const [isManageMemberDialogOpen, setIsManageMemberDialogOpen] = useState(false);
  const [isConfirmDeleteMemberDialogOpen, setIsConfirmDeleteMemberDialogOpen] = useState(false);
  const [isConfirmDeleteRoomDialogOpen, setIsConfirmDeleteRoomDialogOpen] = useState(false);
  
  const [newOfficeName, setNewOfficeName] = useState("");
  const [joinOfficeCode, setJoinOfficeCode] = useState("");
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | undefined>();
  const [newRoomName, setNewRoomName] = useState("");
  const [managingMember, setManagingMember] = useState<OfficeMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<MemberRole>("Member");
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  const fetchUserOffices = useCallback(async () => {
    if (user) {
      setIsLoading(true);
      try {
        const offices = await getOfficesForUser(user.uid);
        setUserOffices(offices);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not fetch your offices." });
      } finally {
        setIsLoading(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserOffices();
    }
  }, [authLoading, user, fetchUserOffices]);
  
  useEffect(() => {
    if (!activeOffice && userOffices.length === 1) {
        setActiveOffice(userOffices[0]);
    }
  }, [userOffices, activeOffice]);

  const fetchActiveOfficeDetails = useCallback(async (officeId: string) => {
    setIsLoadingDetails(true);
    try {
      const [rooms, members] = await Promise.all([
        getRoomsForOffice(officeId),
        getMembersForOffice(officeId)
      ]);
      setActiveOfficeRooms(rooms);
      setActiveOfficeMembers(members);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not fetch office details." });
      setActiveOfficeRooms([]); // Ensure clean state on error
      setActiveOfficeMembers([]);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeOffice) {
      // Clear old details first to ensure no stale data is displayed
      // and to correctly show loading state for the new office.
      setActiveOfficeRooms([]);
      setActiveOfficeMembers([]);
      // fetchActiveOfficeDetails will set isLoadingDetails = true internally
      fetchActiveOfficeDetails(activeOffice.id);
    } else {
      // If no office is active, ensure details are cleared
      setActiveOfficeRooms([]);
      setActiveOfficeMembers([]);
      setIsLoadingDetails(false); // No details to load
    }
  }, [activeOffice, fetchActiveOfficeDetails]);

  const handleSetActiveOffice = async (office: Office | null) => {
    setActiveOffice(office);
  };

  const handleCreateOffice = async () => {
    if (!user) return;
    if (!newOfficeName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Office name cannot be empty." });
      return;
    }
    setIsSubmitting(true);
    try {
      const newOffice = await createOffice(user.uid, user.displayName || user.email || "User", user.photoURL || undefined, newOfficeName);
      setUserOffices(prev => [...prev, newOffice]);
      setActiveOffice(newOffice); 
      setNewOfficeName("");
      setIsCreateOfficeDialogOpen(false);
      toast({ title: "Office Created!", description: `Your new office "${newOffice.name}" is ready.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Creating Office", description: String(error.message || error || "An unexpected error occurred.") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinOffice = async () => {
     if (!user) return;
    if (!joinOfficeCode.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Invitation code cannot be empty." });
      return;
    }
    setIsSubmitting(true);
    try {
      const joinedOffice = await joinOfficeByCode(user.uid, user.displayName || user.email || "User", user.photoURL || undefined, joinOfficeCode);
      if (joinedOffice) {
        setUserOffices(prev => { 
            if (prev.find(o => o.id === joinedOffice.id)) return prev; // Avoid duplicates if already fetched
            return [...prev, joinedOffice];
        });
        setActiveOffice(joinedOffice);
        setJoinOfficeCode("");
        setIsJoinOfficeDialogOpen(false);
        toast({ title: "Joined Office!", description: `You've joined "${joinedOffice.name}".` });
      } else {
        toast({ variant: "destructive", title: "Invalid Code", description: "No office found with that invitation code or you might already be a member."});
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Joining Office", description: String(error.message || error || "An unexpected error occurred.") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRoom = async () => {
    if (!activeOffice || !selectedRoomType || !user) return;
    const details = roomTypeDetails[selectedRoomType];
    const roomName = newRoomName.trim() === "" ? `${details.defaultName} ${activeOfficeRooms.filter(r => r.type === selectedRoomType).length + 1}` : newRoomName;
    
    setIsSubmitting(true);
    try {
      const newRoomData: Omit<Room, 'id' | 'officeId' | 'createdAt' | 'updatedAt'> = {
        name: roomName,
        type: selectedRoomType,
        iconName: details.iconName,
      };
      const addedRoom = await addRoomToOffice(activeOffice.id, newRoomData, user.uid, user.displayName || "User");
      setActiveOfficeRooms(prev => [...prev, addedRoom]);
      setNewRoomName("");
      setSelectedRoomType(undefined);
      setIsAddRoomDialogOpen(false);
      toast({ title: "Room Added!", description: `"${addedRoom.name}" has been added to ${activeOffice.name}.`});
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Adding Room", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteRoomDialog = (id: string) => {
    setDeletingRoomId(id);
    setIsConfirmDeleteRoomDialogOpen(true);
  };
  
  const handleDeleteRoom = async () => {
    if (!activeOffice || !deletingRoomId || !user) return;
    setIsSubmitting(true);
    try {
      await deleteRoomFromOffice(activeOffice.id, deletingRoomId);
      setActiveOfficeRooms(prev => prev.filter((room) => room.id !== deletingRoomId));
      toast({ title: "Room Deleted", description: "The room has been removed." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Deleting Room", description: error.message });
    } finally {
      setIsSubmitting(false);
      setDeletingRoomId(null);
      setIsConfirmDeleteRoomDialogOpen(false);
    }
  };

  const handleOpenManageMemberDialog = (member: OfficeMember) => {
    if (member.userId === user?.uid && member.role === "Owner") {
        toast({title: "Information", description: "Owners cannot change their own role."});
        return;
    }
    setManagingMember(member);
    setSelectedRole(member.role);
    setIsManageMemberDialogOpen(true);
  };

  const handleSaveMemberRole = async () => {
    if (!activeOffice || !managingMember || !user) return;
    if (managingMember.userId === activeOffice.ownerId && selectedRole !== "Owner") {
        toast({ variant: "destructive", title: "Action Denied", description: "The office owner's role cannot be changed from Owner."});
        return;
    }
    setIsSubmitting(true);
    try {
      await updateMemberRoleInOffice(activeOffice.id, managingMember.userId, selectedRole);
      setActiveOfficeMembers(prev => 
        prev.map(m => m.userId === managingMember.userId ? { ...m, role: selectedRole } : m)
      );
      toast({ title: "Role Updated", description: `${managingMember.name}'s role changed to ${selectedRole}.`});
    } catch (error: any) {
       toast({ variant: "destructive", title: "Error Updating Role", description: error.message });
    } finally {
      setIsSubmitting(false);
      setIsManageMemberDialogOpen(false);
      setManagingMember(null);
    }
  };

  const openDeleteMemberDialog = (id: string) => {
    setDeletingMemberId(id);
    setIsConfirmDeleteMemberDialogOpen(true);
  };

  const handleDeleteMember = async () => {
    if (!activeOffice || !deletingMemberId || !user) return;
    if (deletingMemberId === activeOffice.ownerId) {
      toast({ variant: "destructive", title: "Action Denied", description: "Cannot remove the office owner."});
      setIsSubmitting(false);
      setIsConfirmDeleteMemberDialogOpen(false);
      setDeletingMemberId(null);
      return;
    }
    
    setIsSubmitting(true);
    try {
      await removeMemberFromOffice(activeOffice.id, deletingMemberId);
      setActiveOfficeMembers(prev => prev.filter(m => m.userId !== deletingMemberId));
      toast({ title: "Member Removed", description: "The member has been removed." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Removing Member", description: error.message });
    } finally {
      setIsSubmitting(false);
      setDeletingMemberId(null);
      setIsConfirmDeleteMemberDialogOpen(false);
    }
  };

  const copyInviteCode = () => {
    if (activeOffice?.invitationCode) {
      navigator.clipboard.writeText(activeOffice.invitationCode)
        .then(() => toast({ title: "Copied!", description: "Invitation code copied to clipboard." }))
        .catch(() => toast({ variant: "destructive", title: "Error", description: "Failed to copy invite code." }));
    }
  };

   if (authLoading || isLoading) {
    return <div className="container mx-auto p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;
  }

  if (!activeOffice) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center">
        <Building className="h-16 w-16 text-primary mb-6" />
        <h1 className="text-3xl font-headline font-bold mb-4 text-center">Virtual Office Hub</h1>
        
        {userOffices.length > 0 && (
          <Card className="w-full max-w-lg mb-8 shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline">Your Offices</CardTitle>
              <CardDescription>Select an office to manage or create a new one.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {userOffices.map(office => (
                <Button key={office.id} variant="outline" className="w-full justify-start" onClick={() => handleSetActiveOffice(office)}>
                  <Building className="mr-2 h-4 w-4"/> {office.name}
                </Button>
              ))}
            </CardContent>
          </Card>
        )}
        
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          {userOffices.length > 0 ? "Or, you can create a new office or join another one." : "Create your own virtual office space or join an existing one."}
        </p>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <Button size="lg" onClick={() => setIsCreateOfficeDialogOpen(true)} disabled={isSubmitting}>
            <Building className="mr-2 h-5 w-5" /> Create New Office
          </Button>
          <Button size="lg" variant="outline" onClick={() => setIsJoinOfficeDialogOpen(true)} disabled={isSubmitting}>
            <KeyRound className="mr-2 h-5 w-5" /> Join with Code
          </Button>
        </div>

        <Dialog open={isCreateOfficeDialogOpen} onOpenChange={(isOpen) => { if (!isSubmitting) setIsCreateOfficeDialogOpen(isOpen); }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline">Create New Virtual Office</DialogTitle>
              <DialogDescription>Give your new office a name to get started.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="newOfficeName">Office Name</Label>
              <Input id="newOfficeName" value={newOfficeName} onChange={(e) => setNewOfficeName(e.target.value)} placeholder="e.g., Team Alpha HQ" disabled={isSubmitting}/>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOfficeDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleCreateOffice} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Create Office
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isJoinOfficeDialogOpen} onOpenChange={(isOpen) => { if (!isSubmitting) setIsJoinOfficeDialogOpen(isOpen); }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline">Join Existing Office</DialogTitle>
              <DialogDescription>Enter the invitation code provided to you.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="joinOfficeCode">Invitation Code</Label>
              <Input id="joinOfficeCode" value={joinOfficeCode} onChange={(e) => setJoinOfficeCode(e.target.value)} placeholder="e.g., XYZ-789" disabled={isSubmitting}/>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsJoinOfficeDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleJoinOffice} disabled={isSubmitting}>
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Join Office
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

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
         <Button onClick={() => handleSetActiveOffice(null)} variant="outline" disabled={isLoadingDetails || isSubmitting}>Back to Office List</Button>
      </div>

      {isLoadingDetails && <div className="text-center my-8"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>}

      {!isLoadingDetails && (
        <>
          <section className="mb-12">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-headline font-semibold">Team Members ({activeOfficeMembers.length})</h2>
            </div>
            {activeOfficeMembers.length === 0 ? (
              <p className="text-muted-foreground">No members yet. Share the invite code!</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeOfficeMembers.map((member) => {
                  const RoleIcon = roleIcons[member.role] || UserIconLucide;
                  const canManage = activeOffice.ownerId === user?.uid && member.userId !== user?.uid;
                  return (
                  <Card key={member.userId} className="shadow-sm">
                    <CardContent className="p-4 flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatarUrl || `https://placehold.co/40x40.png?text=${member.name.substring(0,1)}`} alt={member.name} data-ai-hint="person avatar" />
                        <AvatarFallback>{member.name.substring(0,2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
                        <Badge variant={member.role === "Owner" || member.role === "Admin" ? "default" : "secondary"} className="mt-1">
                          <RoleIcon className="mr-1 h-3 w-3" />
                          {member.role}
                        </Badge>
                      </div>
                      {canManage && (
                         <Dialog>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSubmitting}>
                                  <Settings2 className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenManageMemberDialog(member)} disabled={isSubmitting}>
                                  Manage Role
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openDeleteMemberDialog(member.userId)} className="text-destructive" disabled={isSubmitting}>
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

          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-headline font-semibold">Office Rooms ({activeOfficeRooms.length})</h2>
              {activeOffice.ownerId === user?.uid && (
                <Button onClick={() => setIsAddRoomDialogOpen(true)} disabled={isSubmitting}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Room
                </Button>
              )}
            </div>
            {activeOfficeRooms.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg">
                <Image src="https://placehold.co/300x200.png" alt="Empty office rooms" width={300} height={200} className="mx-auto mb-4 rounded-md" data-ai-hint="office blueprint" />
                <p className="text-lg text-muted-foreground">This office has no rooms yet.</p>
                {activeOffice.ownerId === user?.uid && <p className="text-sm text-muted-foreground">Click "Add Room" to design your virtual space.</p>}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {activeOfficeRooms.map((room) => {
                   const RoomIconComponent = lucideIcons[room.iconName] || Building;
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
                           {activeOffice.ownerId === user?.uid && (
                            <Button variant="ghost" size="icon" onClick={() => openDeleteRoomDialog(room.id)} aria-label="Delete room" disabled={isSubmitting}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                           )}
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <div className="aspect-video bg-muted rounded-md overflow-hidden relative">
                          <Image 
                            src={`https://placehold.co/400x225.png`} 
                            alt={room.name} 
                            layout="fill" 
                            objectFit="cover"
                            data-ai-hint={roomTypeDetails[room.type]?.imageHint || "office room"}
                          />
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" className="w-full" disabled>Enter Room (Future)</Button>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
      
      <Dialog open={isAddRoomDialogOpen} onOpenChange={(isOpen) => { if (!isSubmitting) setIsAddRoomDialogOpen(isOpen); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Add New Room</DialogTitle>
            <DialogDescription>Select a room type and give it a name.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="roomType" className="text-right">Type</Label>
              <Select onValueChange={(value) => setSelectedRoomType(value as RoomType)} value={selectedRoomType} disabled={isSubmitting}>
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
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRoomDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleAddRoom} disabled={!selectedRoomType || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Add Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {managingMember && (
        <Dialog open={isManageMemberDialogOpen} onOpenChange={(open) => { if(!isSubmitting){ setIsManageMemberDialogOpen(open); if (!open) setManagingMember(null);}}}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline">Manage {managingMember.name}</DialogTitle>
              <DialogDescription>Change their role in the office.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="memberRole">Role</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as MemberRole)} disabled={isSubmitting || managingMember.role === "Owner"}>
                <SelectTrigger id="memberRole">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Member">Member</SelectItem>
                   {managingMember.role === "Owner" && <SelectItem value="Owner" disabled>Owner (Cannot change)</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {setIsManageMemberDialogOpen(false); setManagingMember(null);}} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleSaveMemberRole} disabled={isSubmitting || managingMember.role === "Owner" || managingMember.role === selectedRole}>
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={isConfirmDeleteMemberDialogOpen} onOpenChange={(isOpen) => {if(!isSubmitting) setIsConfirmDeleteMemberDialogOpen(isOpen)}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline">Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {activeOfficeMembers.find(m => m.userId === deletingMemberId)?.name || 'this member'} from the office? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={() => {setIsConfirmDeleteMemberDialogOpen(false); setDeletingMemberId(null)}} disabled={isSubmitting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteMember} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       <Dialog open={isConfirmDeleteRoomDialogOpen} onOpenChange={(isOpen) => {if(!isSubmitting) setIsConfirmDeleteRoomDialogOpen(isOpen)}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline">Delete Room</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the room "{activeOfficeRooms.find(r => r.id === deletingRoomId)?.name || 'this room'}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={() => {setIsConfirmDeleteRoomDialogOpen(false); setDeletingRoomId(null)}} disabled={isSubmitting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRoom} disabled={isSubmitting}>
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Delete Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


    