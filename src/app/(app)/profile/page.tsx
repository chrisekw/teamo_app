
"use client";

import { useState, useEffect, type FormEvent, useRef, ChangeEvent } from "react";
import { useAuth } from "@/lib/firebase/auth";
import { getUserProfile, updateUserProfile, getOrCreateUserProfile } from "@/lib/firebase/firestore/userProfile";
import type { UserProfile } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import dynamic from 'next/dynamic';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User, Mail, Phone, Briefcase, CalendarIcon as CalendarLucide, Info, FileText, UploadCloud } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

const DynamicCalendar = dynamic(() => import('@/components/ui/calendar').then(mod => mod.Calendar), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[280px]" />
});

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(""); // Read-only
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profession, setProfession] = useState("");
  const [birthday, setBirthday] = useState<Date | undefined>();
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const resumeFileRef = useRef<HTMLInputElement>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);


  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setIsLoadingProfile(true);
        try {
          // Use getOrCreateUserProfile to ensure profile exists
          const userProfile = await getOrCreateUserProfile(user.uid, {
            displayName: user.displayName || "",
            email: user.email || "",
            avatarUrl: user.photoURL || undefined,
          });
          setProfile(userProfile);
          setDisplayName(userProfile.displayName);
          setEmail(userProfile.email);
          setPhoneNumber(userProfile.phoneNumber || "");
          setProfession(userProfile.profession || "");
          setBirthday(userProfile.birthday);
          setBio(userProfile.bio || "");
          setAvatarPreview(userProfile.avatarUrl || null);
          if (userProfile.resumeUrl) { // Assuming resumeUrl stores a filename or identifiable string
            setResumeFileName("resume.pdf"); // Placeholder name
          }
        } catch (error) {
          console.error("Failed to fetch profile:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load your profile." });
        } finally {
          setIsLoadingProfile(false);
        }
      }
    };
    if (!authLoading) {
      fetchProfile();
    }
  }, [user, authLoading, toast]);

  const handleSaveChanges = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setIsSaving(true);
    
    const profileUpdateData: Partial<Omit<UserProfile, 'id' | 'email' | 'createdAt' | 'updatedAt'>> = {
      displayName,
      avatarUrl: avatarPreview || profile.avatarUrl, // Use preview if changed, else original
      phoneNumber: phoneNumber || undefined,
      profession: profession || undefined,
      birthday: birthday,
      bio: bio || undefined,
      // resumeUrl will be handled separately if actual upload is implemented
    };

    try {
      await updateUserProfile(user.uid, profileUpdateData);
      // Optionally update Firebase Auth profile too (more complex, involves re-auth sometimes)
      // if (auth.currentUser && (displayName !== auth.currentUser.displayName || avatarPreview !== auth.currentUser.photoURL)) {
      //   await updateProfile(auth.currentUser, { displayName, photoURL: avatarPreview });
      // }
      setProfile(prev => ({ ...prev!, ...profileUpdateData, birthday: birthday } as UserProfile));
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save your profile." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChangeClick = () => {
    avatarFileRef.current?.click();
  };

  const handleAvatarFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        // In a real app, you'd upload this file to Firebase Storage here
        // and then update profile.avatarUrl with the storage URL.
        toast({ title: "Photo Selected", description: "Click 'Save Changes' to apply. (Upload not implemented)"});
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleResumeUploadClick = () => {
    resumeFileRef.current?.click();
  };

  const handleResumeFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setResumeFileName(file.name);
        // In a real app, upload to Firebase Storage and set resumeUrl
        toast({ title: "Resume Selected", description: `${file.name} ready. Click 'Save Changes' to apply. (Upload not implemented)`});
    }
  };


  if (authLoading || isLoadingProfile) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex justify-center">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader className="items-center pb-6">
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-8 w-32 mt-4" />
          </CardHeader>
          <CardContent className="space-y-8 p-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
            <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-24 w-full" />
            </div>
             <Skeleton className="h-10 w-full mt-4" />
          </CardContent>
          <CardFooter className="pt-6 border-t">
             <Skeleton className="h-10 w-32 ml-auto" />
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (!profile) {
    return <div className="container mx-auto p-8 text-center">Could not load profile.</div>;
  }
  
  const avatarSrc = avatarPreview || "https://placehold.co/128x128.png";

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex justify-center">
      <Card className="w-full max-w-2xl shadow-xl">
        <form onSubmit={handleSaveChanges}>
          <CardHeader className="items-center text-center pb-6">
            <div className="relative mb-4">
              <Avatar className="h-32 w-32 border-4 border-background shadow-md">
                <AvatarImage src={avatarSrc} alt={displayName} data-ai-hint="person face professional" />
                <AvatarFallback className="text-4xl">
                  {displayName?.charAt(0).toUpperCase() || user?.displayName?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAvatarChangeClick} className="bg-primary/10 hover:bg-primary/20 text-primary">
              Change Photo
            </Button>
            <input type="file" ref={avatarFileRef} onChange={handleAvatarFileSelected} accept="image/*" className="hidden" />
          </CardHeader>
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="flex items-center text-sm font-medium text-muted-foreground"><User className="mr-2 h-4 w-4" />Full Name</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter your full name" disabled={isSaving}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center text-sm font-medium text-muted-foreground"><Mail className="mr-2 h-4 w-4" />Email Address</Label>
              <Input id="email" type="email" value={email} placeholder="Enter your email" readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="flex items-center text-sm font-medium text-muted-foreground"><Phone className="mr-2 h-4 w-4" />Phone Number</Label>
              <Input id="phoneNumber" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Enter your phone number" disabled={isSaving}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profession" className="flex items-center text-sm font-medium text-muted-foreground"><Briefcase className="mr-2 h-4 w-4" />Profession</Label>
              <Input id="profession" value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="Enter your profession" disabled={isSaving}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthday" className="flex items-center text-sm font-medium text-muted-foreground"><CalendarLucide className="mr-2 h-4 w-4" />Birthday</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !birthday && "text-muted-foreground")}
                    disabled={isSaving}
                  >
                    <CalendarLucide className="mr-2 h-4 w-4" />
                    {birthday ? format(birthday, "PPP") : <span>MM/DD/YYYY</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <DynamicCalendar
                    mode="single"
                    selected={birthday}
                    onSelect={setBirthday}
                    captionLayout="dropdown-buttons"
                    fromYear={1950}
                    toYear={new Date().getFullYear() - 10}
                    disabled={isSaving}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio" className="flex items-center text-sm font-medium text-muted-foreground"><Info className="mr-2 h-4 w-4" />Bio</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself" rows={4} disabled={isSaving}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resume" className="flex items-center text-sm font-medium text-muted-foreground"><FileText className="mr-2 h-4 w-4" />Resume / CV</Label>
              <Button type="button" variant="outline" className="w-full justify-center" onClick={handleResumeUploadClick} disabled={isSaving}>
                <UploadCloud className="mr-2 h-4 w-4" /> {resumeFileName ? `Replace: ${resumeFileName}` : "Upload Resume"}
              </Button>
               <input type="file" ref={resumeFileRef} onChange={handleResumeFileSelected} accept=".pdf,.doc,.docx" className="hidden" />
              {profile.resumeUrl && !resumeFileName && <p className="text-xs text-muted-foreground mt-1">Current resume: <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="underline">View Saved Resume</a> (Link not functional)</p>}
            </div>
          </CardContent>
          <CardFooter className="pt-6 border-t p-6 sm:p-8">
            <Button type="submit" className="w-full sm:w-auto ml-auto" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

