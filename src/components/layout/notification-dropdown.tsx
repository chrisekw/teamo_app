
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
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllUserNotificationsAsRead,
  type UserNotification
} from '@/lib/firebase/firestore/notifications';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function NotificationDropdown() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const fetchNotificationsData = useCallback(async () => {
    if (user) {
      setIsLoading(true);
      try {
        const [notifs, count] = await Promise.all([
          getUserNotifications(user.uid, { count: 10 }),
          getUnreadNotificationCount(user.uid),
        ]);
        setNotifications(notifs);
        setUnreadCount(count);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load notifications." });
      } finally {
        setIsLoading(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchNotificationsData();
      // Simple polling for updates when menu is open or for unread count
      const intervalId = setInterval(() => {
        if (isMenuOpen || document.visibilityState === 'visible') { // Only poll if menu open or tab visible
             getUnreadNotificationCount(user.uid).then(setUnreadCount).catch(console.error);
             if(isMenuOpen) {
                getUserNotifications(user.uid, { count: 10 }).then(setNotifications).catch(console.error);
             }
        }
      }, 30000); // Poll every 30 seconds
      return () => clearInterval(intervalId);
    }
  }, [user, authLoading, fetchNotificationsData, isMenuOpen]);


  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return;
    try {
      await markNotificationAsRead(user.uid, notificationId);
      // Optimistically update UI or refetch
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to mark as read." });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    try {
      await markAllUserNotificationsAsRead(user.uid);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast({ title: "Notifications Cleared", description: "All notifications marked as read." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to mark all as read." });
    }
  };
  
  if (authLoading && !user) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }
  if (!user) {
    return null; // Don't show if not logged in
  }

  return (
    <DropdownMenu onOpenChange={setIsMenuOpen}>
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
                  asChild={!!notif.link}
                  onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                >
                  {notif.link ? (
                    <Link href={notif.link} className="w-full">
                      <NotificationItemContent notification={notif} />
                    </Link>
                  ) : (
                    <div className="w-full" onClickCapture={(e) => e.stopPropagation()}> {/* Prevent dropdown closing if no link */}
                       <NotificationItemContent notification={notif} />
                    </div>
                  )}
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
