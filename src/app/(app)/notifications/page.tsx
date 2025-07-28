
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth';
import { onUserNotificationsUpdate, markNotificationAsRead, markAllUserNotificationsAsRead, type UserNotification } from '@/lib/firebase/firestore/notifications';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Bell, CheckCheck, MailWarning } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user && !authLoading) {
            setIsLoading(true);
            const unsubscribe = onUserNotificationsUpdate(user.uid, (notifs) => {
                setNotifications(notifs);
                setIsLoading(false);
            }, { count: 50 }); // Fetch more for the dedicated page

            return () => unsubscribe();
        } else if (!user && !authLoading) {
            setIsLoading(false);
        }
    }, [user, authLoading]);

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
    };

    const handleMarkAllAsRead = async () => {
        if (!user || notifications.every(n => n.isRead)) return;
        try {
            await markAllUserNotificationsAsRead(user.uid);
            toast({ title: "Notifications Cleared", description: "All notifications marked as read." });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to mark all as read." });
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <Card className="w-full max-w-3xl mx-auto shadow-lg">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-center">
                        <CardTitle className="font-headline text-2xl flex items-center mb-2 sm:mb-0">
                            <Bell className="mr-2 h-6 w-6 text-primary" />
                            All Notifications
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleMarkAllAsRead}
                            disabled={unreadCount === 0 || isLoading}
                        >
                            <CheckCheck className="mr-2 h-4 w-4" />
                            Mark all as read
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[70vh]">
                        {isLoading ? (
                            <div className="p-6 space-y-4">
                                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-center">
                                <MailWarning className="h-12 w-12 mb-4" />
                                <p className="font-medium">You're all caught up!</p>
                                <p className="text-sm">You have no new notifications.</p>
                            </div>
                        ) : (
                            <div className="p-2 sm:p-4">
                                {notifications.map((notif, index) => (
                                    <React.Fragment key={notif.id}>
                                        <div
                                            className={cn(
                                                "block p-3 rounded-lg cursor-pointer transition-colors",
                                                !notif.isRead ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                                            )}
                                            onClick={() => handleNotificationClick(notif)}
                                        >
                                            <div className="flex items-start space-x-3">
                                                {!notif.isRead && <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0"></div>}
                                                <div className={cn("flex-1", notif.isRead && "pl-5")}>
                                                    <p className={cn("text-sm font-medium", !notif.isRead && "font-semibold")}>
                                                        {notif.title}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                                        {notif.message}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground/80 mt-1">
                                                        {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        {index < notifications.length - 1 && <Separator className="my-1" />}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
