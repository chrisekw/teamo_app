
"use client";

import { useState, useEffect, type ReactNode, useCallback, ChangeEvent } from "react";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Users, Briefcase, Coffee, Zap, Building, KeyRound, UserPlus, Copy, Settings2, ShieldCheck, UserCircle as UserIconLucide, Loader2, Edit, Info, Image as ImageIconLucide, MoreHorizontal, ExternalLink, UserCheck, UserX, CheckSquare, XSquare, Video, Tag, Layers, ImageUp, Award, LogOut, Mail, Phone } from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/firebase/auth";
import type { Office, Room, OfficeMember, RoomType, MemberRole, OfficeJoinRequest, ChatUser, UserProfile } from "@/types";
import {
  createOffice,
  onUserOfficesUpdate, 
  addRoomToOffice,
  onRoomsUpdate, 
  deleteRoomFromOffice,
  onMembersUpdate, 
  updateMemberDetailsInOffice, 
  removeMemberFromOffice,
  requestToJoinOfficeByCode,
  onPendingJoinRequestsUpdate, 
  approveJoinRequest,
  rejectJoinRequest,
  deleteOffice,
  addMemberByEmail,
  leaveOffice,
} from "@/lib/firebase/firestore/offices";
import { getUserProfile } from "@/lib/firebase/firestore/userProfile";
import { Textarea } from "@/components/ui/textarea";
import type { Unsubscribe } from 'firebase/firestore'; 

const roomTypeDetails: Record<RoomType, { icon: React.ElementType; defaultName: string, imageHint: string, iconName: string }> = {
  "Team Hub": { icon: Users, defaultName: "Team Hub", imageHint: "team collaboration", iconName: "Users" },
  "Meeting Room": { icon: Video, defaultName: "Meeting Room", imageHint: "conference room", iconName: "Video" },
  "Focus Booth": { icon: Zap, defaultName: "Focus Booth", imageHint: "quiet workspace", iconName: "Zap" },
  "Social Lounge": { icon: Coffee, defaultName: "Social Lounge", imageHint: "office lounge", iconName: "Coffee" },
};

const lucideIcons: Record<string, React.ElementType> = { Users, Briefcase, Zap, Coffee, Building, Video };

const roleIcons: Record<MemberRole, React.ElementType> = {
  "Owner": ShieldCheck,
  "Admin": Settings2,
  "Member": UserIconLucide,
};

export default function OfficeDesignerPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [userOffices, setUserOffices] = useState<Office[]>([]);
  const [activeOffice, setActiveOffice] = useState<Office | null>(null);
  const [activeOfficeRooms, setActiveOfficeRooms] = useState<Room[]>([]);
  const [activeOfficeMembers, setActiveOfficeMembers] = useState<OfficeMember[]>([]);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<OfficeJoinRequest[]>([]);
  const [canManageOffice, setCanManageOffice] = useState(false);
  
  const [officeToDelete, setOfficeToDelete] = useState<Office | null>(null);
  const [officeToLeave, setOfficeToLeave] = useState<Office | null>(null);

  const [isLoadingUserOffices, setIsLoadingUserOffices] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isCreateOfficeDialogOpen, setIsCreateOfficeDialogOpen] = useState(false);
  const [isJoinOfficeDialogOpen, setIsJoinOfficeDialogOpen] = useState(false);
  const [isAddRoomDialogOpen, setIsAddRoomDialogOpen] = useState(false);
  const [isManageMemberDialogOpen, setIsManageMemberDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isViewProfileDialogOpen, setIsViewProfileDialogOpen] = useState(false);
  
  const [deletingMember, setDeletingMember] = useState<OfficeMember | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);

  const [newOfficeName, setNewOfficeName] = useState("");
  const [newOfficeSector, setNewOfficeSector] = useState("");
  const [newOfficeCompanyName, setNewOfficeCompanyName] = useState("");
  const [newOfficeLogoFile, setNewOfficeLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [newOfficeBannerFile, setNewOfficeBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [joinOfficeCode, setJoinOfficeCode] = useState("");
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | undefined>();
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomCoverImageFile, setNewRoomCoverImageFile] = useState<File | null>(null);
  const [newRoomCoverImagePreview, setNewRoomCoverImagePreview] = useState<string | null>(null);

  const [managingMember, setManagingMember] = useState<OfficeMember | null>(null);
  const [viewingMemberProfile, setViewingMemberProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [selectedSystemRole, setSelectedSystemRole] = useState<MemberRole>("Member");
  const [selectedWorkRole, setSelectedWorkRole] = useState<string>("");
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Fetch all offices the user is a member of (real-time)
  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingUserOffices(true);
      const unsubscribe = onUserOfficesUpdate(user.uid, (offices) => {
        setUserOffices(offices);
        if (offices.length === 0) {
            setActiveOffice(null);
        } else if (!activeOffice || !offices.find(o => o.id === activeOffice.id)) {
            // If current active office is no longer in the list, default to first one
            const officeIdFromUrl = searchParams.get('officeId');
            setActiveOffice(offices.find(o => o.id === officeIdFromUrl) || offices[0]);
        }
        setIsLoadingUserOffices(false);
      });
      return () => unsubscribe();
    } else if (!user && !authLoading) {
      setUserOffices([]);
      setActiveOffice(null);
      setIsLoadingUserOffices(false);
    }
  }, [user, authLoading, searchParams, activeOffice]);


  // Set the active office based on URL, or default to the first office in the list
  useEffect(() => {
    const officeIdFromUrl = searchParams.get('officeId');
    if (isLoadingUserOffices || userOffices.length === 0) {
        return;
    };
    
    const officeFromUrl = userOffices.find(o => o.id === officeIdFromUrl);
    const targetOffice = officeFromUrl || userOffices[0];

    if (targetOffice && targetOffice.id !== activeOffice?.id) {
        setActiveOffice(targetOffice);
    }
    
    // Ensure URL matches active office
    if (activeOffice && officeIdFromUrl !== activeOffice.id) {
        router.replace(`${pathname}?officeId=${activeOffice.id}`, { scroll: false });
    }

  }, [userOffices, searchParams, isLoadingUserOffices, router, pathname, activeOffice]);


  // Listen for Rooms, Members, and determine user role
  useEffect(() => {
    if (!activeOffice || !user) {
      setCanManageOffice(false);
      setActiveOfficeRooms([]);
      setActiveOfficeMembers([]);
      setPendingJoinRequests([]);
      return;
    }

    setIsLoadingDetails(true);

    const unsubRooms = onRoomsUpdate(activeOffice.id, setActiveOfficeRooms);
    const unsubMembers = onMembersUpdate(activeOffice.id, (members) => {
      setActiveOfficeMembers(members);
      const currentUserInOffice = members.find(m => m.userId === user.uid);
      const canManage = currentUserInOffice?.role === 'Owner' || currentUserInOffice?.role === 'Admin';
      setCanManageOffice(canManage);

      // This is now dependent on canManage, so we trigger its listener here
      if (canManage) {
        const unsubRequests = onPendingJoinRequestsUpdate(activeOffice.id, setPendingJoinRequests);
        // We need a way to unsubscribe from this when canManage becomes false
        // For now, this component's full unmount will handle it.
      } else {
        setPendingJoinRequests([]);
      }
      setIsLoadingDetails(false);
    });

    return () => {
      unsubRooms();
      unsubMembers();
      // Unsubscribing requests might need a stored reference if canManage changes a lot.
    };
  }, [activeOffice, user]);


  const handleSetActiveOffice = (officeId: string) => {
    if (officeId !== activeOffice?.id) {
        router.push(`${pathname}?officeId=${officeId}`, { scroll: false });
    }
  };

  const resetCreateOfficeForm = () => {
    setNewOfficeName(""); setNewOfficeSector(""); setNewOfficeCompanyName("");
    setNewOfficeLogoFile(null); setLogoPreview(null);
    setNewOfficeBannerFile(null); setBannerPreview(null);
  };
  
  const resetAddRoomForm = () => {
    setNewRoomName(""); setSelectedRoomType(undefined);
    setNewRoomCoverImageFile(null); setNewRoomCoverImagePreview(null);
  };

  const handleFileChange = (setter: (file: File | null) => void, previewSetter: (url: string | null) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setter(file);
      const reader = new FileReader();
      reader.onloadend = () => previewSetter(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setter(null);
      previewSetter(null);
    }
  };

  const handleLogoFileChange = handleFileChange(setNewOfficeLogoFile, setLogoPreview);
  const handleBannerFileChange = handleFileChange(setNewOfficeBannerFile, setBannerPreview);
  const handleRoomCoverImageFileChange = handleFileChange(setNewRoomCoverImageFile, setNewRoomCoverImagePreview);

  const handleCreateOffice = async () => {
    if (!user) return;
    if (!newOfficeName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Office name cannot be empty." });
      return;
    }
    setIsSubmitting(true);
    let logoUrlForCreate = newOfficeLogoFile ? `https://placehold.co/100x100.png?text=${newOfficeLogoFile.name.substring(0,3)}` : undefined;
    let bannerUrlForCreate = newOfficeBannerFile ? `https://placehold.co/1200x300.png?text=${newOfficeBannerFile.name.substring(0,10)}` : undefined;

    try {
      const newOffice = await createOffice(user.uid, user.displayName || "User", user.photoURL || undefined, newOfficeName, newOfficeSector || undefined, newOfficeCompanyName || undefined, logoUrlForCreate, bannerUrlForCreate);
      handleSetActiveOffice(newOffice.id); // This will trigger listeners to update state
      resetCreateOfficeForm();
      setIsCreateOfficeDialogOpen(false);
      toast({ title: "Office Created!", description: `Your new office "${newOffice.name}" is ready.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Creating Office", description: String(error.message || error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestToJoinOffice = async () => {
    if (!user) { toast({ variant: "destructive", title: "Not Authenticated" }); return; }
    if (!joinOfficeCode.trim()) { toast({ variant: "destructive", title: "Error", description: "Invitation code cannot be empty." }); return; }
    setIsSubmitting(true);
    const requesterUser: ChatUser = { id: user.uid, name: user.displayName || "User", avatarUrl: user.photoURL || undefined, role: "User" };
    try {
      const result = await requestToJoinOfficeByCode(joinOfficeCode, requesterUser);
      toast({ title: result.success ? "Request Sent!" : "Request Failed", description: result.message, variant: result.success ? "default" : "destructive" });
      if(result.success) { setJoinOfficeCode(""); setIsJoinOfficeDialogOpen(false); }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Requesting Join", description: String(error.message || error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMemberByEmail = async () => {
    if (!user || !activeOffice) { toast({ variant: "destructive", title: "Error", description: "You must be logged in and have an active office." }); return; }
    if (!addMemberEmail.trim()) { toast({ variant: "destructive", title: "Error", description: "Email address cannot be empty." }); return; }
    setIsSubmitting(true);
    try {
        const result = await addMemberByEmail(activeOffice.id, activeOffice.name, addMemberEmail, user.uid, user.displayName || 'Office Owner');
        toast({ title: result.success ? "Member Added!" : "Failed to Add Member", description: result.message, variant: result.success ? "default" : "destructive" });
        if (result.success) {
            setAddMemberEmail("");
            setIsAddMemberDialogOpen(false);
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error Adding Member", description: String(error.message || error) });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleAddRoom = async () => {
    if (!activeOffice || !selectedRoomType || !user) return;
    const details = roomTypeDetails[selectedRoomType];
    const roomName = newRoomName.trim() === "" ? `${details.defaultName} ${activeOfficeRooms.filter(r => r.type === selectedRoomType).length + 1}` : newRoomName;

    setIsSubmitting(true);
    let coverImageUrlForCreate = newRoomCoverImageFile ? `https://placehold.co/400x225.png?text=${newRoomCoverImageFile.name.substring(0,10)}` : undefined;

    try {
      const addedRoom = await addRoomToOffice(activeOffice.id, { name: roomName, type: selectedRoomType, iconName: details.iconName, coverImageUrl: coverImageUrlForCreate }, user.uid, user.displayName || "User");
      resetAddRoomForm();
      setIsAddRoomDialogOpen(false);
      toast({ title: "Room Added!", description: `"${addedRoom.name}" has been added to ${activeOffice.name}.`});
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Adding Room", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!activeOffice || !deletingRoom || !user) return;
    setIsSubmitting(true);
    try {
      await deleteRoomFromOffice(activeOffice.id, deletingRoom.id, user.uid, user.displayName || "User");
      toast({ title: "Room Deleted", description: `The room "${deletingRoom.name}" has been removed.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Deleting Room", description: error.message });
    } finally {
      setIsSubmitting(false); setDeletingRoom(null);
    }
  };

  const handleOpenManageMemberDialog = (member: OfficeMember) => {
    if (member.userId === user?.uid && member.role === "Owner") {
        toast({title: "Information", description: "Owners cannot change their own system role."});
    }
    setManagingMember(member);
    setSelectedSystemRole(member.role);
    setSelectedWorkRole(member.workRole || "");
    setIsManageMemberDialogOpen(true);
  };

  const handleOpenViewProfileDialog = async (member: OfficeMember) => {
    setIsLoadingProfile(true);
    setIsViewProfileDialogOpen(true);
    setViewingMemberProfile(null); // Clear previous profile
    try {
        const profile = await getUserProfile(member.userId);
        if (profile) {
            setViewingMemberProfile(profile);
        } else {
            setViewingMemberProfile({
                id: member.userId,
                displayName: member.name,
                email: 'No profile email found',
                avatarUrl: member.avatarUrl,
            });
            toast({ variant: "destructive", title: "Profile Not Found", description: "This user has not completed their profile." });
        }
    } catch (error) {
        console.error("Error fetching profile:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch member's profile." });
        setIsViewProfileDialogOpen(false);
    } finally {
        setIsLoadingProfile(false);
    }
  };

  const handleSaveMemberDetails = async () => {
    if (!activeOffice || !managingMember || !user) return;
    if (managingMember.userId === activeOffice.ownerId && selectedSystemRole !== "Owner") {
        toast({ variant: "destructive", title: "Action Denied", description: "The office owner's role cannot be changed."});
        return;
    }
    setIsSubmitting(true);
    const detailsToUpdate: { role?: MemberRole; workRole?: string | null } = {};
    if (managingMember.role !== selectedSystemRole) detailsToUpdate.role = selectedSystemRole;
    if (managingMember.workRole !== selectedWorkRole) detailsToUpdate.workRole = selectedWorkRole.trim() === "" ? null : selectedWorkRole.trim();

    if (Object.keys(detailsToUpdate).length === 0) {
        toast({title: "No Changes", description: "No details were modified."});
    } else {
        try {
            await updateMemberDetailsInOffice(activeOffice.id, managingMember.userId, detailsToUpdate, user.uid, user.displayName || "User");
            toast({ title: "Member Details Updated", description: `${managingMember.name}'s details have been updated.`});
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error Updating Details", description: (error as Error).message });
        }
    }
    setIsSubmitting(false); setIsManageMemberDialogOpen(false); setManagingMember(null);
  };
  
  const handleLeaveOffice = async () => {
    if (!officeToLeave || !user) return;
    if (officeToLeave.ownerId === user.uid) {
        toast({ variant: "destructive", title: "Action Not Allowed", description: "Owners cannot leave their office. Please delete it or transfer ownership (feature coming soon)." });
        setOfficeToLeave(null);
        return;
    }
    setIsSubmitting(true);
    try {
        await leaveOffice(officeToLeave.id, user.uid, user.displayName || "User");
        toast({ title: "You Left the Office", description: `You have successfully left "${officeToLeave.name}".`});
        if (activeOffice?.id === officeToLeave.id) {
            router.replace('/office-designer', { scroll: false });
        }
    } catch(error: any) {
        toast({ variant: "destructive", title: "Error Leaving Office", description: error.message });
    } finally {
        setIsSubmitting(false);
        setOfficeToLeave(null);
    }
  };

  const handleDeleteOffice = async () => {
    if (!officeToDelete || !user) return;
    if (officeToDelete.ownerId !== user.uid) {
        toast({ variant: "destructive", title: "Action Not Allowed", description: "Only the office owner can delete the office." });
        setOfficeToDelete(null);
        return;
    }
    setIsSubmitting(true);
    try {
        await deleteOffice(officeToDelete.id, user.uid);
        toast({ title: "Office Deleted", description: `Office "${officeToDelete.name}" has been deleted.`});
        if (activeOffice?.id === officeToDelete.id) {
            router.replace('/office-designer', { scroll: false });
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error Deleting Office", description: error.message });
    } finally {
        setIsSubmitting(false);
        setOfficeToDelete(null);
    }
  };

  const handleDeleteMember = async () => {
    if (!activeOffice || !deletingMember || !user) return;
    if (deletingMember.userId === activeOffice.ownerId) {
      toast({ variant: "destructive", title: "Action Denied", description: "Cannot remove the office owner."});
      setDeletingMember(null); return;
    }
    setIsSubmitting(true);
    try {
      await removeMemberFromOffice(activeOffice.id, deletingMember.userId, user.uid, user.displayName || "User");
      toast({ title: "Member Removed", description: `"${deletingMember.name}" has been removed.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Removing Member", description: error.message });
    } finally {
      setIsSubmitting(false); setDeletingMember(null);
    }
  };

  const handleProcessJoinRequest = async (request: OfficeJoinRequest, actionToTake: 'approve' | 'reject') => {
    if (!activeOffice || !user) return;
    setProcessingRequestId(request.id);
    try {
      if (actionToTake === 'approve') {
        await approveJoinRequest(activeOffice.id, request.id, user.uid, user.displayName || "User");
        toast({ title: "Request Approved", description: `${request.requesterName} has been added.` });
      } else {
        await rejectJoinRequest(activeOffice.id, request.id, user.uid, user.displayName || "User");
        toast({ title: "Request Rejected", description: `${request.requesterName}'s request was rejected.` });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: `Error ${actionToTake === 'approve' ? 'Approving' : 'Rejecting'}`, description: error.message });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const copyInviteCode = () => {
    if (activeOffice?.invitationCode) {
      navigator.clipboard.writeText(activeOffice.invitationCode)
        .then(() => toast({ title: "Copied!", description: "Invitation code copied to clipboard." }))
        .catch(() => toast({ variant: "destructive", title: "Error", description: "Failed to copy invite code." }));
    }
  };

   if (authLoading || isLoadingUserOffices) {
    return <div className="container mx-auto p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;
  }

  const OfficeSwitcher = () => (
    <div className="flex flex-col sm:flex-row gap-4 items-center mb-8">
        <Select value={activeOffice?.id || ''} onValueChange={handleSetActiveOffice} disabled={userOffices.length <= 1}>
            <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Select an office" />
            </SelectTrigger>
            <SelectContent>
                {userOffices.map(office => (
                     <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
        <div className="flex w-full sm:w-auto gap-2">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => { resetCreateOfficeForm(); setIsCreateOfficeDialogOpen(true);}}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Office
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setIsJoinOfficeDialogOpen(true)}>
                <KeyRound className="mr-2 h-4 w-4" /> Join with Code
            </Button>
        </div>
    </div>
  );

  const NoOfficeView = () => (
    <div className="text-center py-12 bg-muted/20 rounded-lg">
        <Image src="https://placehold.co/300x200.png" alt="Empty office" width={200} height={150} className="mx-auto mb-4 rounded-md" data-ai-hint="office blueprint plan" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to the Office Designer</h2>
        <p className="text-muted-foreground mb-4">You are not a member of any office yet.</p>
    </div>
  );

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex items-center gap-4">
            <Building className="h-10 w-10 text-primary" />
            <div>
                <h1 className="text-3xl font-headline font-bold">Office Designer</h1>
                <p className="text-muted-foreground">Manage, create, or join virtual offices.</p>
            </div>
        </div>
        
        <OfficeSwitcher />
        <Separator/>

        {!activeOffice && !isLoadingDetails && <NoOfficeView />}
        {isLoadingDetails && <div className="text-center my-8"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>}

        {activeOffice && !isLoadingDetails && (
            <>
            <Card className="shadow-xl relative z-10 bg-card/90 backdrop-blur-sm">
                <div className="h-32 sm:h-40 md:h-48 rounded-t-lg bg-muted overflow-hidden relative">
                     <Image
                        src={activeOffice.bannerUrl || `https://placehold.co/1200x300.png?text=${encodeURIComponent(activeOffice.name.substring(0,15) || 'Office Banner')}`}
                        alt={`${activeOffice.name} Banner`}
                        layout="fill" objectFit="cover"
                        data-ai-hint={activeOffice.bannerUrl && !activeOffice.bannerUrl.startsWith('https://placehold.co') ? "office banner" : "default office banner"}
                        priority
                    />
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="absolute top-2 right-2 h-8 w-8">
                          <MoreHorizontal className="h-4 w-4"/>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                         <DropdownMenuItem onClick={() => {
                            if(activeOffice.ownerId === user?.uid) setOfficeToDelete(activeOffice);
                            else setOfficeToLeave(activeOffice);
                         }}>
                            {activeOffice.ownerId === user?.uid ? <Trash2 className="mr-2 h-4 w-4 text-destructive" /> : <LogOut className="mr-2 h-4 w-4 text-destructive" />}
                            <span className="text-destructive">{activeOffice.ownerId === user?.uid ? "Delete Office" : "Leave Office"}</span>
                         </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center -mt-16 sm:-mt-20">
                         <Avatar className="h-24 w-24 sm:h-28 sm:w-28 rounded-lg border-4 border-background shadow-lg shrink-0">
                            <AvatarImage src={activeOffice.logoUrl || ''} alt={`${activeOffice.name} Logo`} data-ai-hint="company logo"/>
                            <AvatarFallback className="rounded-lg text-4xl"><Building/></AvatarFallback>
                        </Avatar>
                        <div className="mt-4 sm:mt-0 sm:ml-6 flex-1">
                            <h2 className="text-2xl md:text-3xl font-headline font-bold text-foreground">{activeOffice.name}</h2>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                                {activeOffice.companyName && <span>{activeOffice.companyName}</span>}
                                {activeOffice.sector && <Badge variant="secondary">{activeOffice.sector}</Badge>}
                            </div>
                        </div>
                    </div>
                     {canManageOffice && activeOffice.invitationCode && (
                        <div className="mt-4 pt-4 border-t border-border flex items-center text-sm text-muted-foreground">
                            <span>Invite Code: <strong className="text-foreground">{activeOffice.invitationCode}</strong></span>
                            <Button variant="ghost" size="sm" onClick={copyInviteCode} className="ml-2 px-1 py-0 h-auto">
                            <Copy className="h-3 w-3 mr-1" /> Copy
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                <section className="lg:col-span-2 space-y-8">
                    {canManageOffice && pendingJoinRequests.length > 0 && (
                    <div>
                        <h3 className="text-2xl font-headline font-semibold mb-4">Join Requests ({pendingJoinRequests.length})</h3>
                        <Card className="shadow-md bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-4 space-y-3">
                                {pendingJoinRequests.map(request => (
                                    <div key={request.id} className="flex items-center justify-between p-3 bg-background rounded-md shadow-sm">
                                        <div className="flex items-center space-x-3">
                                            <Avatar className="h-10 w-10"><AvatarImage src={request.requesterAvatarUrl || ''} alt={request.requesterName} data-ai-hint="person avatar"/><AvatarFallback>{request.requesterName.substring(0,2)}</AvatarFallback></Avatar>
                                            <div>
                                                <p className="font-medium text-sm">{request.requesterName}</p>
                                                <p className="text-xs text-muted-foreground">Wants to join your office</p>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            <Button size="sm" variant="outline" onClick={() => handleProcessJoinRequest(request, 'reject')} disabled={processingRequestId === request.id} className="hover:bg-destructive/10 hover:text-destructive"><UserX className="mr-1 h-4 w-4"/> Reject</Button>
                                            <Button size="sm" onClick={() => handleProcessJoinRequest(request, 'approve')} disabled={processingRequestId === request.id} className="hover:bg-green-500/90 bg-green-600 text-white"><UserCheck className="mr-1 h-4 w-4"/> Approve</Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                    )}

                    <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-2xl font-headline font-semibold">Office Rooms ({activeOfficeRooms.length})</h3>
                        {canManageOffice && ( <Button onClick={() => {resetAddRoomForm(); setIsAddRoomDialogOpen(true);}} disabled={isSubmitting} variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Room</Button>)}
                    </div>
                    {activeOfficeRooms.length === 0 ? (
                        <Card className="shadow-sm">
                        <CardContent className="text-center py-12 bg-muted/20 rounded-lg">
                            <Image src="https://placehold.co/300x200.png" alt="Empty office rooms" width={200} height={150} className="mx-auto mb-4 rounded-md" data-ai-hint="office blueprint plan" />
                            <p className="text-lg text-muted-foreground">This office has no rooms yet.</p>
                            {canManageOffice && <p className="text-sm text-muted-foreground">Click "Add Room" to design your virtual space.</p>}
                        </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2">
                        {activeOfficeRooms.map((room) => {
                            const RoomIconComponent = lucideIcons[room.iconName] || Building;
                            return (
                            <Card key={room.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 bg-card/80 backdrop-blur-sm">
                                <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1"><CardTitle className="font-headline flex items-center text-lg"><RoomIconComponent className="mr-2 h-5 w-5 text-primary" />{room.name}</CardTitle><CardDescription>{room.type}</CardDescription></div>
                                    {canManageOffice && (<Button variant="ghost" size="icon" onClick={() => setDeletingRoom(room)} aria-label="Delete room" disabled={isSubmitting} className="h-8 w-8"><Trash2 className="h-4 w-4 text-destructive" /></Button>)}
                                </div>
                                </CardHeader>
                                <CardContent className="flex-grow"><div className="aspect-video bg-muted rounded-md overflow-hidden relative"><Image src={room.coverImageUrl || `https://placehold.co/400x225.png?text=${encodeURIComponent(room.name)}`} alt={room.name} layout="fill" objectFit="cover" data-ai-hint={room.coverImageUrl && !room.coverImageUrl.startsWith('https://placehold.co') ? roomTypeDetails[room.type]?.imageHint || "office room interior" : "default room image"}/></div></CardContent>
                                <CardFooter>
                                  {room.type === "Meeting Room" && activeOffice ? (
                                    <Button variant="outline" className="w-full" asChild>
                                      <Link href={`/office-designer/room/${activeOffice.id}/${room.id}`}><Video className="mr-2 h-4 w-4" /> Enter Meeting Room</Link>
                                    </Button>
                                  ) : ( <Button variant="outline" className="w-full" disabled><ExternalLink className="mr-2 h-4 w-4" /> Enter Room (Future)</Button> )}
                                </CardFooter>
                            </Card>
                            )
                        })}
                        </div>
                    )}
                    </div>
                </section>

                <aside className="lg:col-span-1 space-y-6">
                    <Card className="shadow-md bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="font-headline flex items-center text-xl"><Users className="mr-2 h-5 w-5"/>Team Members ({activeOfficeMembers.length})</CardTitle>
                                {canManageOffice && (<Button variant="outline" size="sm" onClick={() => setIsAddMemberDialogOpen(true)} disabled={isSubmitting}><UserPlus className="mr-1 h-4 w-4"/>Add</Button>)}
                            </div>
                            <CardDescription>Manage roles and access for office members.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {activeOfficeMembers.map((member) => {
                            const RoleIcon = roleIcons[member.role] || UserIconLucide;
                            return (
                            <div key={member.userId} className="flex items-center space-x-3 p-2.5 rounded-md hover:bg-muted/50 transition-colors">
                                <Avatar className="h-10 w-10"><AvatarImage src={member.avatarUrl || ''} alt={member.name} data-ai-hint="person avatar"/><AvatarFallback>{member.name.substring(0,2)}</AvatarFallback></Avatar>
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{member.name}</p>
                                    <div className="flex items-center space-x-2">
                                        <Badge variant={member.role === "Owner" ? "default" : member.role === "Admin" ? "secondary" : "outline"} className="text-xs"><RoleIcon className="mr-1 h-3 w-3" />{member.role}</Badge>
                                        {member.workRole && <Badge variant="outline" className="text-xs bg-accent/20 border-accent/50">{member.workRole}</Badge>}
                                    </div>
                                </div>
                                {canManageOffice && (<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSubmitting}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleOpenViewProfileDialog(member)}><UserIconLucide className="mr-2 h-4 w-4" /> View Profile</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleOpenManageMemberDialog(member)} disabled={isSubmitting}><Edit className="mr-2 h-4 w-4" /> Manage Roles</DropdownMenuItem>
                                    {member.role !== "Owner" && (<DropdownMenuItem onClick={() => setDeletingMember(member)} className="text-destructive focus:bg-destructive/10 focus:text-destructive" disabled={isSubmitting}><Trash2 className="mr-2 h-4 w-4" /> Remove Member</DropdownMenuItem>)}
                                </DropdownMenuContent></DropdownMenu>)}
                            </div>
                            )
                        })}
                        </CardContent>
                    </Card>
                </aside>
                </div>
            </>
        )}

      {/* Dialogs */}
      <Dialog open={isCreateOfficeDialogOpen} onOpenChange={(isOpen) => { if (!isSubmitting) setIsCreateOfficeDialogOpen(isOpen); if(!isOpen) resetCreateOfficeForm(); }}>
          <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="font-headline">Create New Virtual Office</DialogTitle><DialogDescription>Set up your office details below.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-1.5"><Label htmlFor="newOfficeName" className="flex items-center"><Edit className="mr-2 h-4 w-4"/>Office Name*</Label><Input id="newOfficeName" value={newOfficeName} onChange={(e) => setNewOfficeName(e.target.value)} placeholder="e.g., Team Alpha HQ" disabled={isSubmitting}/></div>
              <div className="space-y-1.5"><Label htmlFor="newOfficeCompanyName" className="flex items-center"><Building className="mr-2 h-4 w-4"/>Company Name</Label><Input id="newOfficeCompanyName" value={newOfficeCompanyName} onChange={(e) => setNewOfficeCompanyName(e.target.value)} placeholder="e.g., Alpha Corp" disabled={isSubmitting}/></div>
              <div className="space-y-1.5"><Label htmlFor="newOfficeSector" className="flex items-center"><Tag className="mr-2 h-4 w-4"/>Sector</Label><Input id="newOfficeSector" value={newOfficeSector} onChange={(e) => setNewOfficeSector(e.target.value)} placeholder="e.g., Technology" disabled={isSubmitting}/></div>
              <div className="space-y-1.5"><Label htmlFor="newOfficeLogo" className="flex items-center"><ImageIconLucide className="mr-2 h-4 w-4"/>Office Logo</Label><Input id="newOfficeLogo" type="file" accept="image/*" onChange={handleLogoFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" disabled={isSubmitting}/>
                {logoPreview && (<div className="mt-2"><Image src={logoPreview} alt="Logo preview" width={80} height={80} className="rounded-md object-cover" data-ai-hint="company logo"/></div>)}</div>
              <div className="space-y-1.5"><Label htmlFor="newOfficeBanner" className="flex items-center"><ImageUp className="mr-2 h-4 w-4"/>Office Banner</Label><Input id="newOfficeBanner" type="file" accept="image/*" onChange={handleBannerFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" disabled={isSubmitting}/>
                {bannerPreview && (<div className="mt-2 aspect-[4/1] w-full relative"><Image src={bannerPreview} alt="Banner preview" layout="fill" className="rounded-md object-cover" data-ai-hint="office banner"/></div>)}</div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsCreateOfficeDialogOpen(false)} disabled={isSubmitting}>Cancel</Button><Button onClick={handleCreateOffice} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Create Office</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isJoinOfficeDialogOpen} onOpenChange={(isOpen) => { if (!isSubmitting) setIsJoinOfficeDialogOpen(isOpen); if(!isOpen) setJoinOfficeCode(""); }}>
          <DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle className="font-headline">Join Existing Office</DialogTitle><DialogDescription>Enter the invitation code to request access.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4"><div className="space-y-1.5"><Label htmlFor="joinOfficeCode" className="flex items-center"><KeyRound className="mr-2 h-4 w-4"/>Invitation Code</Label><Input id="joinOfficeCode" value={joinOfficeCode} onChange={(e) => setJoinOfficeCode(e.target.value)} placeholder="e.g., XYZ-789" disabled={isSubmitting}/></div></div>
            <DialogFooter><Button variant="outline" onClick={() => setIsJoinOfficeDialogOpen(false)} disabled={isSubmitting}>Cancel</Button><Button onClick={handleRequestToJoinOffice} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Request to Join</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddMemberDialogOpen} onOpenChange={(isOpen) => { if (!isSubmitting) setIsAddMemberDialogOpen(isOpen); if(!isOpen) setAddMemberEmail(""); }}>
          <DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle className="font-headline">Add Member by Email</DialogTitle><DialogDescription>Enter the email of a registered user to add them directly to this office.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4"><div className="space-y-1.5"><Label htmlFor="addMemberEmail" className="flex items-center"><Mail className="mr-2 h-4 w-4"/>User's Email</Label><Input id="addMemberEmail" type="email" value={addMemberEmail} onChange={(e) => setAddMemberEmail(e.target.value)} placeholder="user@example.com" disabled={isSubmitting}/></div></div>
            <DialogFooter><Button variant="outline" onClick={() => setIsAddMemberDialogOpen(false)} disabled={isSubmitting}>Cancel</Button><Button onClick={handleAddMemberByEmail} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Add Member</Button></DialogFooter>
          </DialogContent>
        </Dialog>

      <Dialog open={isAddRoomDialogOpen} onOpenChange={(isOpen) => { if (!isSubmitting) setIsAddRoomDialogOpen(isOpen); if(!isOpen) resetAddRoomForm();}}>
        <DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle className="font-headline">Add New Room</DialogTitle><DialogDescription>Select a room type and give it a name.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-1.5"><Label htmlFor="roomType" className="flex items-center"><Layers className="mr-2 h-4 w-4"/>Type</Label><Select onValueChange={(value) => setSelectedRoomType(value as RoomType)} value={selectedRoomType} disabled={isSubmitting}><SelectTrigger id="roomType"><SelectValue placeholder="Select room type" /></SelectTrigger><SelectContent>{Object.keys(roomTypeDetails).map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="roomName" className="flex items-center"><Edit className="mr-2 h-4 w-4"/>Name</Label><Input id="roomName" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder={selectedRoomType ? roomTypeDetails[selectedRoomType].defaultName : "Room Name"} disabled={isSubmitting}/></div>
            <div className="space-y-1.5"><Label htmlFor="newRoomCoverImage" className="flex items-center"><ImageIconLucide className="mr-2 h-4 w-4"/>Cover Image (Optional)</Label><Input id="newRoomCoverImage" type="file" accept="image/*" onChange={handleRoomCoverImageFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" disabled={isSubmitting}/>
              {newRoomCoverImagePreview && (<div className="mt-2 aspect-video w-full relative"><Image src={newRoomCoverImagePreview} alt="Room cover preview" layout="fill" className="rounded-md object-cover" data-ai-hint="room image interior"/></div>)}</div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsAddRoomDialogOpen(false)} disabled={isSubmitting}>Cancel</Button><Button onClick={handleAddRoom} disabled={!selectedRoomType || isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Add Room</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingRoom} onOpenChange={(open) => !open && setDeletingRoom(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete {deletingRoom?.name || 'Room'}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the room.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setDeletingRoom(null)} disabled={isSubmitting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteRoom} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {managingMember && (
        <Dialog open={isManageMemberDialogOpen} onOpenChange={(open) => { if(!isSubmitting){ setIsManageMemberDialogOpen(open); if (!open) setManagingMember(null);}}}>
          <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="font-headline">Manage {managingMember.name}</DialogTitle><DialogDescription>Update their system role and work role.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4"><div className="space-y-1.5"><Label htmlFor="memberSystemRole" className="flex items-center"><ShieldCheck className="mr-2 h-4 w-4"/>System Role</Label><Select value={selectedSystemRole} onValueChange={(value) => setSelectedSystemRole(value as MemberRole)} disabled={isSubmitting || managingMember.role === "Owner"}><SelectTrigger id="memberSystemRole"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Admin">Admin</SelectItem><SelectItem value="Member">Member</SelectItem>{managingMember.role === "Owner" && <SelectItem value="Owner" disabled>Owner</SelectItem>}</SelectContent></Select>{managingMember.role === "Owner" && <p className="text-xs text-muted-foreground">The office owner's role cannot be changed.</p>}</div>
              <div className="space-y-1.5"><Label htmlFor="memberWorkRole" className="flex items-center"><Award className="mr-2 h-4 w-4"/>Work Role (Optional)</Label><Input id="memberWorkRole" value={selectedWorkRole} onChange={(e) => setSelectedWorkRole(e.target.value)} placeholder="e.g., Developer" disabled={isSubmitting}/></div></div>
            <DialogFooter><Button variant="outline" onClick={() => {setIsManageMemberDialogOpen(false); setManagingMember(null);}} disabled={isSubmitting}>Cancel</Button><Button onClick={handleSaveMemberDetails} disabled={isSubmitting}> {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save Changes</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!deletingMember} onOpenChange={(open) => !open && setDeletingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove {deletingMember?.name || 'Member'}?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to remove this member? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setDeletingMember(null)} disabled={isSubmitting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteMember} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Remove Member</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={!!officeToDelete} onOpenChange={(open) => !open && setOfficeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Office: {officeToDelete?.name}?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the office and all its content for everyone. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setOfficeToDelete(null)} disabled={isSubmitting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteOffice} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Delete Office</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!officeToLeave} onOpenChange={(open) => !open && setOfficeToLeave(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Leave Office: {officeToLeave?.name}?</AlertDialogTitle><AlertDialogDescription>You will lose access to this office and its content. An owner can re-invite you later.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel onClick={() => setOfficeToLeave(null)} disabled={isSubmitting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleLeaveOffice} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Leave Office</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isViewProfileDialogOpen} onOpenChange={setIsViewProfileDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle className="font-headline">Member Profile</DialogTitle>
                <DialogDescription>
                    Viewing the profile of {viewingMemberProfile?.displayName || '...'}.
                </DialogDescription>
            </DialogHeader>
            {isLoadingProfile ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : viewingMemberProfile ? (
                <div className="space-y-4 py-4">
                    <div className="flex flex-col items-center space-y-4">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={viewingMemberProfile.avatarUrl || ''} alt={viewingMemberProfile.displayName} data-ai-hint="person avatar" />
                            <AvatarFallback className="text-3xl">{viewingMemberProfile.displayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                            <h3 className="text-xl font-semibold">{viewingMemberProfile.displayName}</h3>
                            <p className="text-sm text-muted-foreground">{viewingMemberProfile.profession || 'No profession listed'}</p>
                        </div>
                    </div>
                    <Separator />
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center"><Mail className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" /> <a href={`mailto:${viewingMemberProfile.email}`} className="text-primary hover:underline truncate">{viewingMemberProfile.email}</a></div>
                        <div className="flex items-center"><Phone className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" /> {viewingMemberProfile.phoneNumber || <span className="italic text-muted-foreground">No phone number</span>}</div>
                        <div className="flex items-center"><Info className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" /> <p className="leading-snug">{viewingMemberProfile.bio || <span className="italic text-muted-foreground">No bio provided.</span>}</p></div>
                    </div>
                </div>
            ) : (
                <div className="text-center p-8 text-muted-foreground">Could not load profile.</div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewProfileDialogOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
