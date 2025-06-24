
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User, Loader2, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";

export function UserNav() {
  const { user, signOut, loading } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: "Signed Out", description: "You have been successfully signed out."});
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sign Out Error", description: error.message });
    }
  };

  if (loading && !user) { // Show loader only if no user is yet available during initial load
    return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
  }
  
  if (!user) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href="/login">Sign In</Link>
      </Button>
    );
  }

  const userDisplayName = user.displayName || user.email?.split('@')[0] || "User";
  const userEmailDisplay = user.email || "No email";
  const userAvatarFallback = userDisplayName.charAt(0).toUpperCase();


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.photoURL || `https://placehold.co/100x100.png?text=${userAvatarFallback}`} alt={userDisplayName} data-ai-hint="person avatar" />
            <AvatarFallback>{userAvatarFallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userDisplayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmailDisplay}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile"> 
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/goals">
              <TrendingUp className="mr-2 h-4 w-4" />
              <span>Goals</span>
              <DropdownMenuShortcut>⌘G</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={loading}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
