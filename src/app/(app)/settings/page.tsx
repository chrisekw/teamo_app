
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
import { Palette, UserCircle, Bell, ShieldCheck, Database, Accessibility, Save } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme, systemTheme } = useTheme();

  const [mounted, setMounted] = useState(false);

  // Form states
  const [currentTheme, setCurrentTheme] = useState("system");
  const [language, setLanguage] = useState("en");
  const [fontSize, setFontSize] = useState("medium");

  // Removed user-specific details like fullName, userEmail, userAvatar as they are on /profile
  // const [fullName, setFullName] = useState("Teamo User");
  // const [userEmail, setUserEmail] = useState("user@teamo.app");
  // const [userAvatar, setUserAvatar] = useState("https://placehold.co/100x100.png");

  const [emailNotifications, setEmailNotifications] = useState("important");
  const [pushNotifications, setPushNotifications] = useState(true);
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
  }, [theme, systemTheme]);


  const handleSaveChanges = () => {
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
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

      {/* Appearance Section */}
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

      {/* Account Section - REMOVED, now on /profile page */}
      {/* <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><UserCircle className="mr-2 h-5 w-5 text-primary" />Account</CardTitle>
          <CardDescription>Manage your personal account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={userAvatar} alt={fullName} data-ai-hint="person avatar" />
              <AvatarFallback>{fullName.substring(0,1)}</AvatarFallback>
            </Avatar>
            <Button variant="outline">Change Picture</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" value={userEmail} readOnly disabled />
            </div>
          </div>
          <Button variant="outline">Change Password</Button>
        </CardContent>
      </Card> */}

      {/* Notifications Section */}
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
            <Label htmlFor="pushNotifications" className="flex flex-col space-y-1">
              <span>Push Notifications</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Receive push notifications on your devices.
              </span>
            </Label>
            <Switch id="pushNotifications" checked={pushNotifications} onCheckedChange={setPushNotifications} />
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
      
      {/* Accessibility Section */}
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

      {/* Other Sections Placeholder */}
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
