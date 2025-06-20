
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Loader2, MailWarning } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from '@/lib/firebase/auth';
import {
  onUserNotificationsUpdate, 
  onUnreadNotificationCountUpdate, 
  markNotificationAsRead,
  markAllUserNotificationsAsRead,
  type UserNotification
} from '@/lib/firebase/firestore/notifications';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { Unsubscribe } from 'firebase/firestore'; 

export function NotificationDropdown() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoading(true); 

      const unsubscribeNotifications = onUserNotificationsUpdate(
        user.uid,
        (notifs) => {
          setNotifications(notifs);
          setIsLoading(false); // Set loading false after first notifications data retrieval
        },
        { count: 10 }
      );

      const unsubscribeCount = onUnreadNotificationCountUpdate(
        user.uid,
        (count) => {
          setUnreadCount(count);
          // If notifications haven't loaded yet but count has, also consider loading done
          // This handles cases where there might be 0 notifications but the count listener responds first.
          if (notifications.length === 0 && isLoading) {
             // setIsLoading(false); // This might be redundant if the notifications listener sets it.
          }
        }
      );

      return () => {
        unsubscribeNotifications();
        unsubscribeCount();
      };
    } else if (!user && !authLoading) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
    }
  }, [user, authLoading]); // Removed 'isLoading' from dependency array


  const handleNotificationClick = async (notification: UserNotification) => {
    if (!user) return;
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(user.uid, notification.id);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to mark as read." });
      }
    }
    if (notification.link) {
      router.push(notification.link);
    }
    setIsMenuOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    try {
      await markAllUserNotificationsAsRead(user.uid);
      toast({ title: "Notifications Cleared", description: "All notifications marked as read." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to mark all as read." });
    }
  };

  if (authLoading && !user) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }
  if (!user) {
    return null;
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 min-w-fit justify-center p-0.5 text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Open notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 sm:w-96" align="end">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-xs h-auto p-1">
              <CheckCheck className="mr-1 h-3 w-3"/> Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <DropdownMenuItem disabled className="justify-center">
            <Loader2 className="h-4 w-4 animate-spin my-2" />
          </DropdownMenuItem>
        ) : notifications.length === 0 ? (
          <DropdownMenuItem disabled className="text-center text-muted-foreground py-3">
            <MailWarning className="h-5 w-5 mx-auto mb-1" />
            No new notifications.
          </DropdownMenuItem>
        ) : (
          <ScrollArea className="max-h-80">
            <DropdownMenuGroup>
              {notifications.map((notif) => (
                <DropdownMenuItem
                  key={notif.id}
                  className={cn(
                    "flex flex-col items-start gap-1 p-2.5 cursor-pointer data-[disabled]:opacity-100",
                    !notif.isRead && "bg-primary/5 hover:bg-primary/10"
                  )}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <NotificationItemContent notification={notif} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </ScrollArea>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-sm text-muted-foreground hover:text-primary" asChild>
            <Link href="/settings/notifications">View all (future)</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


const NotificationItemContent = ({ notification }: { notification: UserNotification }) => (
  <>
    <div className="flex justify-between w-full items-center">
        <p className={cn("text-sm font-medium", !notification.isRead && "font-semibold")}>{notification.title}</p>
        {!notification.isRead && <div className="h-2 w-2 rounded-full bg-primary ml-2 shrink-0"></div>}
    </div>
    <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
    <p className="text-xs text-muted-foreground/70 mt-0.5">
      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
    </p>
  </>
);

