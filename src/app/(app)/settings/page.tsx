
"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Palette, UserCircle, Bell, ShieldCheck, Database, Accessibility, Save, MonitorSmartphone, Loader2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { requestNotificationPermissionAndGetToken, messaging as firebaseMessagingInstance } from "@/lib/firebase/client";

export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme, systemTheme } = useTheme();

  const [mounted, setMounted] = useState(false);

  const [currentTheme, setCurrentTheme] = useState("system");
  const [language, setLanguage] = useState("en");
  const [fontSize, setFontSize] = useState("medium");

  const [emailNotifications, setEmailNotifications] = useState("important");
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [isRequestingPushPermission, setIsRequestingPushPermission] = useState(false);
  const [notificationSounds, setNotificationSounds] = useState(true);

  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (theme === "system") {
        setCurrentTheme("system");
    } else {
        setCurrentTheme(theme || "system");
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
        setPushNotificationsEnabled(Notification.permission === 'granted');
    }
  }, [theme, systemTheme]);


  const handleSaveChanges = () => {
    toast({
      title: "Settings Saved (Mock)",
      description: "Your preferences have been notionally updated. Push notification token handling not implemented server-side.",
    });
  };

  const handleTogglePushNotifications = async () => {
    if (!firebaseMessagingInstance) {
      toast({
        variant: "destructive",
        title: "Push Not Supported",
        description: "Push notifications are not supported in this browser or device.",
      });
      setPushNotificationsEnabled(false);
      return;
    }

    setIsRequestingPushPermission(true);
    try {
      if (!pushNotificationsEnabled && Notification.permission !== 'granted') {
        const token = await requestNotificationPermissionAndGetToken();
        if (token) {
          setPushNotificationsEnabled(true);
          toast({
            title: "Push Notifications Enabled",
            description: "You can now receive push notifications on this device. Token (first 20 chars): " + token.substring(0, 20) + "...",
          });
          // In a real app, you would send this token to your server.
        } else {
          setPushNotificationsEnabled(false);
          if (Notification.permission === 'denied') {
            toast({
              variant: "destructive",
              title: "Permission Denied",
              description: "You have blocked push notifications. Please enable them in your browser settings to receive them.",
              duration: 7000,
            });
          } else {
            toast({
              variant: "destructive",
              title: "Failed to Enable",
              description: "Could not enable push notifications at this time.",
            });
          }
        }
      } else if (pushNotificationsEnabled) {
        // Simulating "disabling" by just updating UI.
        // True disabling would involve removing the token from the server and/or revoking permission via browser settings.
        setPushNotificationsEnabled(false);
        toast({
          title: "Push Notifications Disabled (UI)",
          description: "Push notifications UI toggle is off. Manage browser permissions to fully disable.",
        });
        // TODO: You might want to inform your server to invalidate/remove the token for this device.
      } else if (!pushNotificationsEnabled && Notification.permission === 'granted') {
          // User is re-enabling after previously granting permission
          const token = await requestNotificationPermissionAndGetToken(); // Re-fetch token
          if (token) {
               setPushNotificationsEnabled(true);
               toast({
                  title: "Push Notifications Re-enabled",
                  description: "Token (first 20 chars): " + token.substring(0, 20) + "...",
               });
          } else {
              toast({ variant: "destructive", title: "Error", description: "Could not re-enable push notifications. Ensure VAPID key is set." });
          }
      }
    } catch (error) {
        console.error("Error toggling push notifications:", error);
        toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
        setPushNotificationsEnabled(Notification.permission === 'granted'); // Reset to actual permission state
    } finally {
        setIsRequestingPushPermission(false);
    }
  };
  
  if (!mounted) {
    return null; 
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold">Application Settings</h1>
        <Button onClick={handleSaveChanges}>
          <Save className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5 text-primary" />Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Theme</Label>
            <RadioGroup value={currentTheme} onValueChange={(value) => { setTheme(value); setCurrentTheme(value);}}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light">Light</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark">Dark</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="system" />
                <Label htmlFor="system">System</Label>
              </div>
            </RadioGroup>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español (Spanish)</SelectItem>
                  <SelectItem value="fr">Français (French)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Font Size</Label>
              <RadioGroup value={fontSize} onValueChange={setFontSize} className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="small" id="font-small" />
                  <Label htmlFor="font-small">Small</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="font-medium" />
                  <Label htmlFor="font-medium">Medium</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="large" id="font-large" />
                  <Label htmlFor="font-large">Large</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5 text-primary" />Notifications</CardTitle>
          <CardDescription>Manage how you receive notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Email Notifications</Label>
            <Select value={emailNotifications} onValueChange={setEmailNotifications}>
              <SelectTrigger>
                <SelectValue placeholder="Select email notification preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notifications</SelectItem>
                <SelectItem value="important">Important Only</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="pushNotificationsSwitch" className="flex flex-col space-y-1">
              <span className="flex items-center"><MonitorSmartphone className="mr-2 h-4 w-4 text-muted-foreground"/>Push Notifications</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Receive push notifications on this device.
              </span>
            </Label>
             <Switch 
                id="pushNotificationsSwitch"
                checked={pushNotificationsEnabled} 
                onCheckedChange={handleTogglePushNotifications} 
                disabled={isRequestingPushPermission || !firebaseMessagingInstance}
             />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notificationSounds" className="flex flex-col space-y-1">
              <span>In-app Notification Sounds</span>
               <span className="font-normal leading-snug text-muted-foreground">
                Play sounds for new notifications in the app.
              </span>
            </Label>
            <Switch id="notificationSounds" checked={notificationSounds} onCheckedChange={setNotificationSounds} />
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Accessibility className="mr-2 h-5 w-5 text-primary" />Accessibility</CardTitle>
          <CardDescription>Customize accessibility features.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="flex items-center justify-between">
            <Label htmlFor="highContrast" className="flex flex-col space-y-1">
              <span>High Contrast Mode</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Improve visibility with higher contrast colors.
              </span>
            </Label>
            <Switch id="highContrast" checked={highContrast} onCheckedChange={setHighContrast} />
          </div>
           <div className="flex items-center justify-between">
            <Label htmlFor="reduceMotion" className="flex flex-col space-y-1">
              <span>Reduce Motion</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Limit animations and motion effects in the app.
              </span>
            </Label>
            <Switch id="reduceMotion" checked={reduceMotion} onCheckedChange={setReduceMotion} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
         <CardHeader>
          <CardTitle className="flex items-center"><ShieldCheck className="mr-2 h-5 w-5 text-primary" />Privacy & Security</CardTitle>
          <CardDescription>Manage your privacy settings and account security.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Button variant="outline" className="w-full sm:w-auto">Set up Two-Factor Authentication</Button>
            <Button variant="outline" className="w-full sm:w-auto">Manage Connected Devices</Button>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Database className="mr-2 h-5 w-5 text-primary" />Data & Storage</CardTitle>
          <CardDescription>Manage your application data and storage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => toast({title: "Cache Cleared (Mock)", description: "Application cache has been notionally cleared."})}>Clear Application Cache</Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => toast({title: "Data Export Started (Mock)", description: "Your data export will be available shortly."})}>Export Your Data</Button>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSaveChanges} size="lg">
          <Save className="mr-2 h-5 w-5" /> Save All Changes
        </Button>
      </div>
    </div>
  );
}
