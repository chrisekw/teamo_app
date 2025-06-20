
"use client";

import { useState, useEffect, type ReactNode, useCallback, ChangeEvent } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Users, Briefcase, Coffee, Zap, Building, KeyRound, UserPlus, Copy, Settings2, ShieldCheck, UserCircle as UserIconLucide, Loader2, Edit, Info, Image as ImageIconLucide, MoreHorizontal, ExternalLink, UserCheck, UserX, CheckSquare, XSquare, Video, Tag, Layers, ImageUp, Award } from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/firebase/auth";
import type { Office, Room, OfficeMember, RoomType, MemberRole, OfficeJoinRequest, ChatUser } from "@/types";
import {
  createOffice,
  onUserOfficesUpdate, 
  getOfficeDetails, 
  addRoomToOffice,
  onRoomsUpdate, 
  deleteRoomFromOffice,
  onMembersUpdate, 
  updateMemberDetailsInOffice, 
  removeMemberFromOffice,
  requestToJoinOfficeByCode,
  onPendingJoinRequestsUpdate, 
  approveJoinRequest,
  rejectJoinRequest
} from "@/lib/firebase/firestore/offices";
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

  const [userOffices, setUserOffices] = useState<Office[]>([]);
  const [activeOffice, setActiveOffice] = useState<Office | null>(null);
  const [activeOfficeRooms, setActiveOfficeRooms] = useState<Room[]>([]);
  const [activeOfficeMembers, setActiveOfficeMembers] = useState<OfficeMember[]>([]);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<OfficeJoinRequest[]>([]);

  const [isLoadingUserOffices, setIsLoadingUserOffices] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isCreateOfficeDialogOpen, setIsCreateOfficeDialogOpen] = useState(false);
  const [isJoinOfficeDialogOpen, setIsJoinOfficeDialogOpen] = useState(false);
  const [isAddRoomDialogOpen, setIsAddRoomDialogOpen] = useState(false);
  const [isManageMemberDialogOpen, setIsManageMemberDialogOpen] = useState(false);
  const [isConfirmDeleteMemberDialogOpen, setIsConfirmDeleteMemberDialogOpen] = useState(false);
  const [isConfirmDeleteRoomDialogOpen, setIsConfirmDeleteRoomDialogOpen] = useState(false);

  const [newOfficeName, setNewOfficeName] = useState("");
  const [newOfficeSector, setNewOfficeSector] = useState("");
  const [newOfficeCompanyName, setNewOfficeCompanyName] = useState("");
  const [newOfficeLogoFile, setNewOfficeLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [newOfficeBannerFile, setNewOfficeBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [joinOfficeCode, setJoinOfficeCode] = useState("");
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | undefined>();
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomCoverImageFile, setNewRoomCoverImageFile] = useState<File | null>(null);
  const [newRoomCoverImagePreview, setNewRoomCoverImagePreview] = useState<string | null>(null);

  const [managingMember, setManagingMember] = useState<OfficeMember | null>(null);
  const [selectedSystemRole, setSelectedSystemRole] = useState<MemberRole>("Member");
  const [selectedWorkRole, setSelectedWorkRole] = useState<string>("");
  const [deletingMember, setDeletingMember] = useState<OfficeMember | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const [currentDisplayOfficeId, setCurrentDisplayOfficeId] = useState<string | null>(null);

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingUserOffices(true);
      const unsubscribe = onUserOfficesUpdate(user.uid, (offices) => {
        setUserOffices(offices);
        setIsLoadingUserOffices(false);
      });
      return () => unsubscribe();
    } else if (!user && !authLoading) {
      setUserOffices([]);
      setIsLoadingUserOffices(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (authLoading || isLoadingUserOffices || !user) return;

    const officeIdFromParams = searchParams.get('officeId');

    if (officeIdFromParams) {
      const isValidOfficeParam = userOffices.some(o => o.id === officeIdFromParams);
      if (isValidOfficeParam) {
        if (currentDisplayOfficeId !== officeIdFromParams) {
          setCurrentDisplayOfficeId(officeIdFromParams);
        }
      } else {
        if (userOffices.length > 0) {
          const defaultOfficeId = userOffices[0].id;
          if (currentDisplayOfficeId !== defaultOfficeId || officeIdFromParams !== defaultOfficeId) {
            setCurrentDisplayOfficeId(defaultOfficeId);
            router.replace(`/office-designer?officeId=${defaultOfficeId}`, { scroll: false });
          }
        } else {
          if (currentDisplayOfficeId !== null || officeIdFromParams) {
            setCurrentDisplayOfficeId(null);
            router.replace('/office-designer', { scroll: false });
          }
        }
      }
    } else {
      if (userOffices.length > 0) {
        const defaultOfficeId = userOffices[0].id;
        if (currentDisplayOfficeId !== defaultOfficeId) {
          setCurrentDisplayOfficeId(defaultOfficeId);
          router.replace(`/office-designer?officeId=${defaultOfficeId}`, { scroll: false });
        }
      } else {
        if (currentDisplayOfficeId !== null) {
          setCurrentDisplayOfficeId(null);
        }
      }
    }
  }, [userOffices, searchParams, authLoading, isLoadingUserOffices, router, user, currentDisplayOfficeId]);


  useEffect(() => {
    if (currentDisplayOfficeId) {
      const officeToSetActive = userOffices.find(o => o.id === currentDisplayOfficeId);
      if (officeToSetActive) {
        if (!activeOffice || activeOffice.id !== officeToSetActive.id) {
          setActiveOffice(officeToSetActive);
        }
      } else if (activeOffice !== null) {
        setActiveOffice(null);
      }
    } else {
      if (activeOffice !== null) {
        setActiveOffice(null);
      }
    }
  }, [currentDisplayOfficeId, userOffices, activeOffice]);

  useEffect(() => {
    if (activeOffice && user) {
      setIsLoadingDetails(true);
      const unsubRooms = onRoomsUpdate(activeOffice.id, (rooms) => {
        setActiveOfficeRooms(rooms);
      });
      const unsubMembers = onMembersUpdate(activeOffice.id, (members) => {
        setActiveOfficeMembers(members);
      });
      let unsubRequests: Unsubscribe = () => {};
      if (activeOffice.ownerId === user.uid) {
        unsubRequests = onPendingJoinRequestsUpdate(activeOffice.id, (requests) => {
          setPendingJoinRequests(requests);
          setIsLoadingDetails(false); 
        });
      } else {
        setPendingJoinRequests([]);
        setIsLoadingDetails(false); 
      }

      return () => {
        unsubRooms();
        unsubMembers();
        unsubRequests();
      };
    } else {
      setActiveOfficeRooms([]);
      setActiveOfficeMembers([]);
      setPendingJoinRequests([]);
      setIsLoadingDetails(false);
    }
  }, [activeOffice, user]);


  const handleSetActiveOffice = (office: Office | null) => {
    if (office) {
        router.push(`/office-designer?officeId=${office.id}`, { scroll: false });
    } else {
        router.push('/office-designer', { scroll: false });
    }
  };

  const resetCreateOfficeForm = () => {
    setNewOfficeName("");
    setNewOfficeSector("");
    setNewOfficeCompanyName("");
    setNewOfficeLogoFile(null);
    setLogoPreview(null);
    setNewOfficeBannerFile(null);
    setBannerPreview(null);
  };
  
  const resetAddRoomForm = () => {
    setNewRoomName("");
    setSelectedRoomType(undefined);
    setNewRoomCoverImageFile(null);
    setNewRoomCoverImagePreview(null);
  };

  const handleLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewOfficeLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setNewOfficeLogoFile(null);
      setLogoPreview(null);
    }
  };

  const handleBannerFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewOfficeBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setNewOfficeBannerFile(null);
      setBannerPreview(null);
    }
  };
  
  const handleRoomCoverImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewRoomCoverImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewRoomCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setNewRoomCoverImageFile(null);
      setNewRoomCoverImagePreview(null);
    }
  };


  const handleCreateOffice = async () => {
    if (!user) return;
    if (!newOfficeName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Office name cannot be empty." });
      return;
    }
    setIsSubmitting(true);
    
    let logoUrlForCreate: string | undefined = undefined;
    if (newOfficeLogoFile && logoPreview) {
      logoUrlForCreate = `https://placehold.co/100x100.png?text=${newOfficeLogoFile.name.substring(0,3).toUpperCase()}&hint=${encodeURIComponent(newOfficeLogoFile.name)}`;
    }

    let bannerUrlForCreate: string | undefined = undefined;
    if (newOfficeBannerFile && bannerPreview) {
      bannerUrlForCreate = `https://placehold.co/1200x300.png?text=${newOfficeBannerFile.name.substring(0,10).toUpperCase()}&hint=${encodeURIComponent(newOfficeBannerFile.name)}`;
    }

    try {
      const newOffice = await createOffice(
        user.uid,
        user.displayName || user.email?.split('@')[0] || "User",
        user.photoURL || undefined,
        newOfficeName,
        newOfficeSector || undefined,
        newOfficeCompanyName || undefined,
        logoUrlForCreate, 
        bannerUrlForCreate 
      );
      handleSetActiveOffice(newOffice);
      resetCreateOfficeForm();
      setIsCreateOfficeDialogOpen(false);
      toast({ title: "Office Created!", description: `Your new office "${newOffice.name}" is ready.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Creating Office", description: String(error.message || error || "An unexpected error occurred.") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestToJoinOffice = async () => {
    if (!user) {
        toast({ variant: "destructive", title: "Not Authenticated", description: "You must be logged in to join an office." });
        return;
    }
    if (!joinOfficeCode.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Invitation code cannot be empty." });
      return;
    }
    setIsSubmitting(true);
    const requesterUser: ChatUser = {
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || "Anonymous User",
        avatarUrl: user.photoURL || undefined,
        role: "User" 
    };
    try {
      const result = await requestToJoinOfficeByCode(joinOfficeCode, requesterUser);
      if (result.success) {
        toast({ title: "Request Sent!", description: result.message });
        setJoinOfficeCode("");
        setIsJoinOfficeDialogOpen(false);
      } else {
        toast({ variant: "destructive", title: "Request Failed", description: result.message});
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Requesting Join", description: String(error.message || error || "An unexpected error occurred.") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRoom = async () => {
    if (!activeOffice || !selectedRoomType || !user) return;
    const details = roomTypeDetails[selectedRoomType];
    const roomName = newRoomName.trim() === "" ? `${details.defaultName} ${activeOfficeRooms.filter(r => r.type === selectedRoomType).length + 1}` : newRoomName;

    setIsSubmitting(true);
    let coverImageUrlForCreate: string | undefined = undefined;
    if (newRoomCoverImageFile && newRoomCoverImagePreview) {
       coverImageUrlForCreate = `https://placehold.co/400x225.png?text=${newRoomCoverImageFile.name.substring(0,10).toUpperCase()}&hint=${encodeURIComponent(newRoomCoverImageFile.name)}`;
    }

    try {
      const newRoomData: Omit<Room, 'id' | 'officeId' | 'createdAt' | 'updatedAt'> = {
        name: roomName,
        type: selectedRoomType,
        iconName: details.iconName,
        coverImageUrl: coverImageUrlForCreate,
      };
      const addedRoom = await addRoomToOffice(activeOffice.id, newRoomData, user.uid, user.displayName || "User");
      resetAddRoomForm();
      setIsAddRoomDialogOpen(false);
      toast({ title: "Room Added!", description: `"${addedRoom.name}" has been added to ${activeOffice.name}.`});
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Adding Room", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteRoomDialog = (room: Room) => {
    setDeletingRoom(room);
    setIsConfirmDeleteRoomDialogOpen(true);
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
      setIsSubmitting(false);
      setDeletingRoom(null);
      setIsConfirmDeleteRoomDialogOpen(false);
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

  const handleSaveMemberDetails = async () => {
    if (!activeOffice || !managingMember || !user) return;

    if (managingMember.userId === activeOffice.ownerId && selectedSystemRole !== "Owner") {
        toast({ variant: "destructive", title: "Action Denied", description: "The office owner's system role cannot be changed from Owner."});
        return;
    }

    setIsSubmitting(true);
    const detailsToUpdate: { role?: MemberRole; workRole?: string | null } = {};
    if (managingMember.role !== selectedSystemRole) {
        detailsToUpdate.role = selectedSystemRole;
    }
    if (managingMember.workRole !== selectedWorkRole) {
        detailsToUpdate.workRole = selectedWorkRole.trim() === "" ? null : selectedWorkRole.trim();
    }

    if (Object.keys(detailsToUpdate).length === 0) {
        toast({title: "No Changes", description: "No details were modified."});
        setIsSubmitting(false);
        setIsManageMemberDialogOpen(false);
        setManagingMember(null);
        return;
    }

    try {
      await updateMemberDetailsInOffice(activeOffice.id, managingMember.userId, detailsToUpdate, user.uid, user.displayName || "User");
      toast({ title: "Member Details Updated", description: `${managingMember.name}'s details have been updated.`});
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Updating Details", description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
      setIsManageMemberDialogOpen(false);
      setManagingMember(null);
    }
  };

  const openDeleteMemberDialog = (member: OfficeMember) => {
    if (member.userId === user?.uid && member.role === "Owner") {
        toast({title: "Action Denied", description: "Owners cannot remove themselves. Consider transferring ownership or deleting the office."});
        return;
    }
    setDeletingMember(member);
    setIsConfirmDeleteMemberDialogOpen(true);
  };

  const handleDeleteMember = async () => {
    if (!activeOffice || !deletingMember || !user) return;
    if (deletingMember.userId === activeOffice.ownerId) {
      toast({ variant: "destructive", title: "Action Denied", description: "Cannot remove the office owner."});
      setIsSubmitting(false);
      setIsConfirmDeleteMemberDialogOpen(false);
      setDeletingMember(null);
      return;
    }

    setIsSubmitting(true);
    try {
      await removeMemberFromOffice(activeOffice.id, deletingMember.userId, user.uid, user.displayName || "User");
      toast({ title: "Member Removed", description: `"${deletingMember.name}" has been removed from the office.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Removing Member", description: error.message });
    } finally {
      setIsSubmitting(false);
      setDeletingMember(null);
      setIsConfirmDeleteMemberDialogOpen(false);
    }
  };

  const handleProcessJoinRequest = async (request: OfficeJoinRequest, actionToTake: 'approve' | 'reject') => {
    if (!activeOffice || !user) return;
    setProcessingRequestId(request.id);
    try {
      if (actionToTake === 'approve') {
        await approveJoinRequest(activeOffice.id, request.id, user.uid, user.displayName || "User");
        toast({ title: "Request Approved", description: `${request.requesterName} has been added to the office.` });
      } else {
        await rejectJoinRequest(activeOffice.id, request.id, user.uid, user.displayName || "User");
        toast({ title: "Request Rejected", description: `${request.requesterName}'s request has been rejected.` });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: `Error ${actionToTake === 'approve' ? 'Approving' : 'Rejecting'} Request`, description: error.message });
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

  if (!activeOffice && !isCreateOfficeDialogOpen && userOffices.length === 0) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center">
        <Building className="h-16 w-16 text-primary mb-6" />
        <h1 className="text-3xl font-headline font-bold mb-4 text-center">Virtual Office Hub</h1>

        {userOffices.length > 0 && (
          <Card className="w-full max-w-lg mb-8 shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-base sm:text-lg">Your Offices</CardTitle>
              <CardDescription>Select an office to manage or create a new one.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {userOffices.map(office => (
                <Button key={office.id} variant="outline" className="w-full justify-start" onClick={() => handleSetActiveOffice(office)}>
                  <Building className="mr-2 h-4 w-4 text-muted-foreground"/> {office.name}
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        <p className="text-muted-foreground mb-6 text-center max-w-md">
          {userOffices.length > 0 ? "Or, you can create a new office or join another one." : "Create your own virtual office space or join an existing one."}
        </p>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <Button size="lg" onClick={() => { resetCreateOfficeForm(); setIsCreateOfficeDialogOpen(true);}} disabled={isSubmitting}>
            <Building className="mr-2 h-5 w-5" /> Create New Office
          </Button>
          <Button size="lg" variant="outline" onClick={() => setIsJoinOfficeDialogOpen(true)} disabled={isSubmitting}>
            <KeyRound className="mr-2 h-5 w-5" /> Join with Code
          </Button>
        </div>
      </div>
    );
  }

  if(!activeOffice && userOffices.length > 0 && !currentDisplayOfficeId && !isLoadingDetails) {
     return <div className="container mx-auto p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;
  }

  if (!activeOffice && !isCreateOfficeDialogOpen) {
     return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center">
            <Building className="h-16 w-16 text-primary mb-6" />
            <h1 className="text-3xl font-headline font-bold mb-4 text-center">Select or Create an Office</h1>
            {userOffices.length > 0 && (
                <Card className="w-full max-w-lg mb-8 shadow-lg">
                    <CardHeader>
                    <CardTitle className="font-headline text-base sm:text-lg">Your Offices</CardTitle>
                    <CardDescription>Select an office to manage or create a new one.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                    {userOffices.map(office => (
                        <Button key={office.id} variant="outline" className="w-full justify-start" onClick={() => handleSetActiveOffice(office)}>
                        <Building className="mr-2 h-4 w-4 text-muted-foreground"/> {office.name}
                        </Button>
                    ))}
                    </CardContent>
                </Card>
            )}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-4">
                <Button size="lg" onClick={() => { resetCreateOfficeForm(); setIsCreateOfficeDialogOpen(true);}} disabled={isSubmitting}>
                    <Building className="mr-2 h-5 w-5" /> Create New Office
                </Button>
                <Button size="lg" variant="outline" onClick={() => setIsJoinOfficeDialogOpen(true)} disabled={isSubmitting}>
                    <KeyRound className="mr-2 h-5 w-5" /> Join with Code
                </Button>
            </div>
        </div>
     );
  }

  const currentUserIsOwner = activeOffice?.ownerId === user?.uid;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {activeOffice && (
        <div className="mb-2 rounded-lg overflow-hidden shadow-lg aspect-[16/5] sm:aspect-[16/4] md:aspect-[16/3] relative bg-muted">
          <Image
            src={activeOffice.bannerUrl || `https://placehold.co/1200x300.png?text=${encodeURIComponent(activeOffice.name.substring(0,15) || 'Office Banner')}`}
            alt={`${activeOffice.name} Banner`}
            layout="fill"
            objectFit="cover"
            data-ai-hint={activeOffice.bannerUrl && !activeOffice.bannerUrl.startsWith('https://placehold.co') ? "office banner" : "default office banner"}
            priority
          />
        </div>
      )}

      <Dialog open={isCreateOfficeDialogOpen} onOpenChange={(isOpen) => { if (!isSubmitting) setIsCreateOfficeDialogOpen(isOpen); if(!isOpen) resetCreateOfficeForm(); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-headline">Create New Virtual Office</DialogTitle>
              <DialogDescription>Set up your office details below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-1.5">
                <Label htmlFor="newOfficeName" className="flex items-center text-sm font-medium text-muted-foreground"><Edit className="mr-2 h-4 w-4 text-muted-foreground"/>Office Name*</Label>
                <Input id="newOfficeName" value={newOfficeName} onChange={(e) => setNewOfficeName(e.target.value)} placeholder="e.g., Team Alpha HQ" disabled={isSubmitting}/>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newOfficeCompanyName" className="flex items-center text-sm font-medium text-muted-foreground"><Building className="mr-2 h-4 w-4 text-muted-foreground"/>Company/Brand Name</Label>
                <Input id="newOfficeCompanyName" value={newOfficeCompanyName} onChange={(e) => setNewOfficeCompanyName(e.target.value)} placeholder="e.g., Alpha Corp" disabled={isSubmitting}/>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newOfficeSector" className="flex items-center text-sm font-medium text-muted-foreground"><Tag className="mr-2 h-4 w-4 text-muted-foreground"/>Sector</Label>
                <Input id="newOfficeSector" value={newOfficeSector} onChange={(e) => setNewOfficeSector(e.target.value)} placeholder="e.g., Technology, Healthcare" disabled={isSubmitting}/>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newOfficeLogo" className="flex items-center text-sm font-medium text-muted-foreground"><ImageIconLucide className="mr-2 h-4 w-4 text-muted-foreground"/>Office Logo</Label>
                <Input id="newOfficeLogo" type="file" accept="image/*" onChange={handleLogoFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" disabled={isSubmitting}/>
                {logoPreview && (
                  <div className="mt-2">
                    <Image src={logoPreview} alt="Logo preview" width={80} height={80} className="rounded-md object-cover" data-ai-hint="company logo"/>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newOfficeBanner" className="flex items-center text-sm font-medium text-muted-foreground"><ImageUp className="mr-2 h-4 w-4 text-muted-foreground"/>Office Banner</Label>
                <Input id="newOfficeBanner" type="file" accept="image/*" onChange={handleBannerFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" disabled={isSubmitting}/>
                {bannerPreview && (
                  <div className="mt-2 aspect-[4/1] w-full relative">
                    <Image src={bannerPreview} alt="Banner preview" layout="fill" className="rounded-md object-cover" data-ai-hint="office banner"/>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOfficeDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleCreateOffice} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Create Office
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isJoinOfficeDialogOpen} onOpenChange={(isOpen) => { if (!isSubmitting) setIsJoinOfficeDialogOpen(isOpen); if(!isOpen) setJoinOfficeCode(""); }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline">Join Existing Office</DialogTitle>
              <DialogDescription>Enter the invitation code to request access.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="joinOfficeCode" className="flex items-center text-sm font-medium text-muted-foreground"><KeyRound className="mr-2 h-4 w-4 text-muted-foreground"/>Invitation Code</Label>
                <Input id="joinOfficeCode" value={joinOfficeCode} onChange={(e) => setJoinOfficeCode(e.target.value)} placeholder="e.g., XYZ-789" disabled={isSubmitting}/>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsJoinOfficeDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleRequestToJoinOffice} disabled={isSubmitting}>
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Request to Join
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {activeOffice && (
        <>
            <Card className="shadow-xl -mt-16 sm:-mt-20 md:-mt-24 relative z-10 mx-auto max-w-5xl bg-card/90 backdrop-blur-sm">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
                        {activeOffice.logoUrl ? (
                            <Image src={activeOffice.logoUrl} alt={`${activeOffice.name} Logo`} width={100} height={100} className="rounded-lg object-cover border-4 border-background shadow-md -mt-12 sm:-mt-16" data-ai-hint={activeOffice.logoUrl && !activeOffice.logoUrl.startsWith('https://placehold.co') ? "company logo" : "default company logo"} priority/>
                        ) : (
                            <div className="h-24 w-24 sm:h-28 sm:w-28 bg-muted rounded-lg flex items-center justify-center border-4 border-background shadow-md -mt-12 sm:-mt-16">
                                <Building className="h-12 w-12 text-muted-foreground"/>
                            </div>
                        )}
                        <div className="flex-1">
                            <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">{activeOffice.name}</h1>
                            {activeOffice.companyName && <p className="text-lg text-muted-foreground">{activeOffice.companyName}</p>}
                            {activeOffice.sector && <Badge variant="secondary" className="mt-1">{activeOffice.sector}</Badge>}
                        </div>
                        <Button onClick={() => handleSetActiveOffice(null)} variant="outline" className="w-full sm:w-auto" disabled={isLoadingDetails || isSubmitting}>Back to Office List</Button>
                    </div>
                    {currentUserIsOwner && activeOffice.invitationCode && (
                        <div className="mt-4 pt-4 border-t border-border flex items-center text-sm text-muted-foreground">
                            <span>Invitation Code: <strong className="text-foreground">{activeOffice.invitationCode}</strong></span>
                            <Button variant="ghost" size="sm" onClick={copyInviteCode} className="ml-2 px-1 py-0 h-auto">
                            <Copy className="h-3 w-3 mr-1" /> Copy
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>


            {isLoadingDetails && <div className="text-center my-8"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>}

            {!isLoadingDetails && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                <section className="lg:col-span-2 space-y-8">
                    {currentUserIsOwner && pendingJoinRequests.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-headline font-semibold mb-4">Join Requests ({pendingJoinRequests.length})</h2>
                        <Card className="shadow-md bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-4 space-y-3">
                                {pendingJoinRequests.map(request => (
                                    <div key={request.id} className="flex items-center justify-between p-3 bg-background rounded-md shadow-sm">
                                        <div className="flex items-center space-x-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={request.requesterAvatarUrl || `https://placehold.co/40x40.png?text=${request.requesterName.substring(0,1)}`} alt={request.requesterName} data-ai-hint="person avatar"/>
                                                <AvatarFallback>{request.requesterName.substring(0,2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-sm">{request.requesterName}</p>
                                                <p className="text-xs text-muted-foreground">Wants to join your office</p>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleProcessJoinRequest(request, 'reject')}
                                                disabled={processingRequestId === request.id || isSubmitting}
                                                className="hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                {processingRequestId === request.id && <Loader2 className="mr-1 h-4 w-4 animate-spin"/>}
                                                <UserX className="mr-1 h-4 w-4"/> Reject
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleProcessJoinRequest(request, 'approve')}
                                                disabled={processingRequestId === request.id || isSubmitting}
                                                className="hover:bg-green-500/90 bg-green-600 text-white"
                                            >
                                               {processingRequestId === request.id && <Loader2 className="mr-1 h-4 w-4 animate-spin"/>}
                                                <UserCheck className="mr-1 h-4 w-4"/> Approve
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                    )}

                    <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-headline font-semibold">Office Rooms ({activeOfficeRooms.length})</h2>
                        {currentUserIsOwner && (
                        <Button onClick={() => {resetAddRoomForm(); setIsAddRoomDialogOpen(true);}} disabled={isSubmitting} variant="outline" size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Room
                        </Button>
                        )}
                    </div>
                    {activeOfficeRooms.length === 0 ? (
                        <Card className="shadow-sm">
                        <CardContent className="text-center py-12 bg-muted/20 rounded-lg">
                            <Image src="https://placehold.co/300x200.png" alt="Empty office rooms" width={200} height={150} className="mx-auto mb-4 rounded-md" data-ai-hint="office blueprint plan" />
                            <p className="text-lg text-muted-foreground">This office has no rooms yet.</p>
                            {currentUserIsOwner && <p className="text-sm text-muted-foreground">Click "Add Room" to design your virtual space.</p>}
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
                                    <div className="flex-1">
                                    <CardTitle className="font-headline flex items-center text-lg">
                                        <RoomIconComponent className="mr-2 h-5 w-5 text-primary" />
                                        {room.name}
                                    </CardTitle>
                                    <CardDescription>{room.type}</CardDescription>
                                    </div>
                                    {currentUserIsOwner && (
                                    <Button variant="ghost" size="icon" onClick={() => openDeleteRoomDialog(room)} aria-label="Delete room" disabled={isSubmitting} className="h-8 w-8">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                    )}
                                </div>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                <div className="aspect-video bg-muted rounded-md overflow-hidden relative">
                                    <Image
                                    src={room.coverImageUrl || `https://placehold.co/400x225.png?text=${encodeURIComponent(room.name.substring(0,10))}`}
                                    alt={room.name}
                                    layout="fill"
                                    objectFit="cover"
                                    data-ai-hint={room.coverImageUrl && !room.coverImageUrl.startsWith('https://placehold.co') ? roomTypeDetails[room.type]?.imageHint || "office room interior" : "default room image"}
                                    />
                                </div>
                                </CardContent>
                                <CardFooter>
                                  {room.type === "Meeting Room" && activeOffice ? (
                                    <Button variant="outline" className="w-full" asChild>
                                      <Link href={`/office-designer/room/${activeOffice.id}/${room.id}`}>
                                        <Video className="mr-2 h-4 w-4" /> Enter Meeting Room
                                      </Link>
                                    </Button>
                                  ) : (
                                    <Button variant="outline" className="w-full" disabled>
                                      <ExternalLink className="mr-2 h-4 w-4" /> Enter Room (Future)
                                    </Button>
                                  )}
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
                        <CardTitle className="font-headline flex items-center text-xl"><Users className="mr-2 h-5 w-5"/>Team Members ({activeOfficeMembers.length})</CardTitle>
                        <CardDescription>Manage roles and access for office members.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {activeOfficeMembers.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No members yet. Share the invite code!</p>
                        ) : (
                            activeOfficeMembers.map((member) => {
                            const RoleIcon = roleIcons[member.role] || UserIconLucide;
                            const canManageMember = currentUserIsOwner; 
                            return (
                            <div key={member.userId} className="flex items-center space-x-3 p-2.5 rounded-md hover:bg-muted/50 transition-colors">
                                <Avatar className="h-10 w-10">
                                <AvatarImage src={member.avatarUrl || `https://placehold.co/40x40.png?text=${member.name.substring(0,1)}`} alt={member.name} data-ai-hint="person avatar"/>
                                <AvatarFallback>{member.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{member.name}</p>
                                    <div className="flex items-center space-x-2">
                                        <Badge variant={member.role === "Owner" ? "default" : member.role === "Admin" ? "secondary" : "outline"} className="text-xs">
                                            <RoleIcon className="mr-1 h-3 w-3" />
                                            {member.role}
                                        </Badge>
                                        {member.workRole && <Badge variant="outline" className="text-xs bg-accent/20 border-accent/50 text-accent-foreground/80">{member.workRole}</Badge>}
                                    </div>
                                </div>
                                {canManageMember && (
                                    <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSubmitting}>
                                        <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleOpenManageMemberDialog(member)} disabled={isSubmitting}>
                                        <Edit className="mr-2 h-4 w-4" /> Manage Member
                                        </DropdownMenuItem>
                                        {member.role !== "Owner" && ( 
                                        <DropdownMenuItem onClick={() => openDeleteMemberDialog(member)} className="text-destructive focus:bg-destructive/10 focus:text-destructive" disabled={isSubmitting}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Remove Member
                                        </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                            )})
                        )}
                        </CardContent>
                    </Card>
                </aside>
                </div>
            )}
        </>
      )}

      <Dialog open={isAddRoomDialogOpen} onOpenChange={(isOpen) => { if (!isSubmitting) setIsAddRoomDialogOpen(isOpen); if(!isOpen) resetAddRoomForm();}}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Add New Room</DialogTitle>
            <DialogDescription>Select a room type and give it a name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-1.5">
              <Label htmlFor="roomType" className="flex items-center text-sm font-medium text-muted-foreground"><Layers className="mr-2 h-4 w-4 text-muted-foreground"/>Type</Label>
              <Select onValueChange={(value) => setSelectedRoomType(value as RoomType)} value={selectedRoomType} disabled={isSubmitting}>
                <SelectTrigger id="roomType">
                  <SelectValue placeholder="Select room type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(roomTypeDetails).map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="roomName" className="flex items-center text-sm font-medium text-muted-foreground"><Edit className="mr-2 h-4 w-4 text-muted-foreground"/>Name</Label>
              <Input
                id="roomName"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder={selectedRoomType ? roomTypeDetails[selectedRoomType].defaultName : "Room Name"}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newRoomCoverImage" className="flex items-center text-sm font-medium text-muted-foreground"><ImageIconLucide className="mr-2 h-4 w-4 text-muted-foreground"/>Room Cover Image (Optional)</Label>
              <Input id="newRoomCoverImage" type="file" accept="image/*" onChange={handleRoomCoverImageFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" disabled={isSubmitting}/>
              {newRoomCoverImagePreview && (
                <div className="mt-2 aspect-video w-full relative">
                  <Image src={newRoomCoverImagePreview} alt="Room cover preview" layout="fill" className="rounded-md object-cover" data-ai-hint="room image interior"/>
                </div>
              )}
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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-headline">Manage {managingMember.name}</DialogTitle>
              <DialogDescription>Update their system role and work role in the office.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-1.5">
                <Label htmlFor="memberSystemRole" className="flex items-center text-sm font-medium text-muted-foreground"><ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground"/>System Role</Label>
                <Select value={selectedSystemRole} onValueChange={(value) => setSelectedSystemRole(value as MemberRole)} disabled={isSubmitting || managingMember.role === "Owner" && managingMember.userId === user?.uid || managingMember.role === "Owner" && managingMember.userId === activeOffice?.ownerId }>
                  <SelectTrigger id="memberSystemRole">
                    <SelectValue placeholder="Select system role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Member">Member</SelectItem>
                    {(managingMember.role === "Owner") && <SelectItem value="Owner" disabled>Owner (Cannot change)</SelectItem>}
                  </SelectContent>
                </Select>
                 { (managingMember.role === "Owner" && managingMember.userId === user?.uid || managingMember.role === "Owner" && managingMember.userId === activeOffice?.ownerId ) && <p className="text-xs text-muted-foreground">The office owner's system role cannot be changed.</p> }
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="memberWorkRole" className="flex items-center text-sm font-medium text-muted-foreground"><Award className="mr-2 h-4 w-4 text-muted-foreground"/>Work Role (Optional)</Label>
                <Input id="memberWorkRole" value={selectedWorkRole} onChange={(e) => setSelectedWorkRole(e.target.value)} placeholder="e.g., Developer, Designer" disabled={isSubmitting}/>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {setIsManageMemberDialogOpen(false); setManagingMember(null);}} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleSaveMemberDetails} disabled={isSubmitting || (managingMember.role === "Owner" && managingMember.userId === activeOffice?.ownerId && selectedSystemRole === "Owner" && managingMember.workRole === selectedWorkRole) }>
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={isConfirmDeleteMemberDialogOpen} onOpenChange={(isOpen) => {if(!isSubmitting) setIsConfirmDeleteMemberDialogOpen(isOpen); if(!isOpen) setDeletingMember(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline">Remove {deletingMember?.name || 'Member'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deletingMember?.name || 'this member'} from the office? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-end">
            <AlertDialogCancel onClick={() => {setIsConfirmDeleteMemberDialogOpen(false); setDeletingMember(null)}} disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDeleteMember} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Remove Member
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={isConfirmDeleteRoomDialogOpen} onOpenChange={(isOpen) => {if(!isSubmitting) setIsConfirmDeleteRoomDialogOpen(isOpen); if(!isOpen) setDeletingRoom(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline">Delete {deletingRoom?.name || 'Room'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the room "{deletingRoom?.name || 'this room'}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-end">
            <AlertDialogCancel onClick={() => {setIsConfirmDeleteRoomDialogOpen(false); setDeletingRoom(null)}} disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDeleteRoom} disabled={isSubmitting}>
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Delete Room
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
