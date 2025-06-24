
"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Palette, Bell, ShieldCheck, Database, Accessibility, Save, MonitorSmartphone, Loader2 } from "lucide-react";
import { requestNotificationPermissionAndGetToken, messaging as firebaseMessagingInstance } from "@/lib/firebase/client";
import { useFontSize } from "@/context/font-size-context";
import { useLanguage } from "@/context/language-context";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme, systemTheme } = useTheme();
  const { fontSize, setFontSize } = useFontSize();
  const { locale, setLocale, t, isLoaded } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("system");
  
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

  // Expose toast to window for foreground message handler
  useEffect(() => {
    (window as any).TeamoToast = { toast };
    return () => { delete (window as any).TeamoToast };
  }, [toast]);


  const handleSaveChanges = () => {
    toast({
      title: t('Toast.settingsSavedTitle'),
      description: t('Toast.settingsSavedDescription'),
    });
  };

  const handleTogglePushNotifications = async () => {
    if (!firebaseMessagingInstance) {
      toast({
        variant: "destructive",
        title: t('Toast.pushNotSupportedTitle'),
        description: t('Toast.pushNotSupportedDescription'),
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
            title: t('Toast.pushEnabledTitle'),
            description: t('Toast.pushEnabledDescription', { token: token.substring(0, 20) + "..." }),
          });
        } else {
          setPushNotificationsEnabled(false);
          if (Notification.permission === 'denied') {
            toast({
              variant: "destructive",
              title: t('Toast.pushDeniedTitle'),
              description: t('Toast.pushDeniedDescription'),
              duration: 7000,
            });
          } else {
            toast({
              variant: "destructive",
              title: t('Toast.pushFailedTitle'),
              description: t('Toast.pushFailedDescription'),
            });
          }
        }
      } else if (pushNotificationsEnabled) {
        setPushNotificationsEnabled(false);
        toast({
          title: t('Toast.pushDisabledTitle'),
          description: t('Toast.pushDisabledDescription'),
        });
      } else if (!pushNotificationsEnabled && Notification.permission === 'granted') {
          const token = await requestNotificationPermissionAndGetToken();
          if (token) {
               setPushNotificationsEnabled(true);
               toast({
                  title: t('Toast.pushReEnabledTitle'),
                  description: t('Toast.pushReEnabledDescription', { token: token.substring(0, 20) + "..." }),
               });
          } else {
              toast({ variant: "destructive", title: t('Toast.errorTitle'), description: t('Toast.errorVapidKey') });
          }
      }
    } catch (error) {
        console.error("Error toggling push notifications:", error);
        toast({ variant: "destructive", title: t('Toast.errorTitle'), description: t('Toast.errorGeneric') });
        setPushNotificationsEnabled(Notification.permission === 'granted');
    } finally {
        setIsRequestingPushPermission(false);
    }
  };
  
  if (!mounted || !isLoaded) {
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-10 w-36" />
            </div>
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold">{t('SettingsPage.pageTitle')}</h1>
        <Button onClick={handleSaveChanges}>
          <Save className="mr-2 h-4 w-4" /> {t('SettingsPage.saveButton')}
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5 text-primary" />{t('SettingsPage.appearanceTitle')}</CardTitle>
          <CardDescription>{t('SettingsPage.appearanceDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t('SettingsPage.themeLabel')}</Label>
            <RadioGroup value={currentTheme} onValueChange={(value) => { setTheme(value); setCurrentTheme(value);}}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light">{t('SettingsPage.themeLight')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark">{t('SettingsPage.themeDark')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="system" />
                <Label htmlFor="system">{t('SettingsPage.themeSystem')}</Label>
              </div>
            </RadioGroup>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="language">{t('SettingsPage.languageLabel')}</Label>
              <Select value={locale} onValueChange={(value) => setLocale(value as 'en' | 'es' | 'fr')}>
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('SettingsPage.languageEnglish')}</SelectItem>
                  <SelectItem value="es">{t('SettingsPage.languageSpanish')}</SelectItem>
                  <SelectItem value="fr">{t('SettingsPage.languageFrench')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('SettingsPage.fontSizeLabel')}</Label>
              <RadioGroup value={fontSize} onValueChange={(value) => setFontSize(value as 'small' | 'medium' | 'large')} className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="small" id="font-small" />
                  <Label htmlFor="font-small">{t('SettingsPage.fontSizeSmall')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="font-medium" />
                  <Label htmlFor="font-medium">{t('SettingsPage.fontSizeMedium')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="large" id="font-large" />
                  <Label htmlFor="font-large">{t('SettingsPage.fontSizeLarge')}</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5 text-primary" />{t('SettingsPage.notificationsTitle')}</CardTitle>
          <CardDescription>{t('SettingsPage.notificationsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t('SettingsPage.emailNotificationsLabel')}</Label>
            <Select value={emailNotifications} onValueChange={setEmailNotifications}>
              <SelectTrigger>
                <SelectValue placeholder="Select email notification preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('SettingsPage.emailAll')}</SelectItem>
                <SelectItem value="important">{t('SettingsPage.emailImportant')}</SelectItem>
                <SelectItem value="none">{t('SettingsPage.emailNone')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="pushNotificationsSwitch" className="flex flex-col space-y-1">
              <span className="flex items-center"><MonitorSmartphone className="mr-2 h-4 w-4 text-muted-foreground"/>{t('SettingsPage.pushNotificationsLabel')}</span>
              <span className="font-normal leading-snug text-muted-foreground">
                {t('SettingsPage.pushNotificationsDescription')}
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
              <span>{t('SettingsPage.inAppSoundsLabel')}</span>
               <span className="font-normal leading-snug text-muted-foreground">
                {t('SettingsPage.inAppSoundsDescription')}
              </span>
            </Label>
            <Switch id="notificationSounds" checked={notificationSounds} onCheckedChange={setNotificationSounds} />
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Accessibility className="mr-2 h-5 w-5 text-primary" />{t('SettingsPage.accessibilityTitle')}</CardTitle>
          <CardDescription>{t('SettingsPage.accessibilityDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="flex items-center justify-between">
            <Label htmlFor="highContrast" className="flex flex-col space-y-1">
              <span>{t('SettingsPage.highContrastLabel')}</span>
              <span className="font-normal leading-snug text-muted-foreground">
                {t('SettingsPage.highContrastDescription')}
              </span>
            </Label>
            <Switch id="highContrast" checked={highContrast} onCheckedChange={setHighContrast} />
          </div>
           <div className="flex items-center justify-between">
            <Label htmlFor="reduceMotion" className="flex flex-col space-y-1">
              <span>{t('SettingsPage.reduceMotionLabel')}</span>
              <span className="font-normal leading-snug text-muted-foreground">
                {t('SettingsPage.reduceMotionDescription')}
              </span>
            </Label>
            <Switch id="reduceMotion" checked={reduceMotion} onCheckedChange={setReduceMotion} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
         <CardHeader>
          <CardTitle className="flex items-center"><ShieldCheck className="mr-2 h-5 w-5 text-primary" />{t('SettingsPage.privacyTitle')}</CardTitle>
          <CardDescription>{t('SettingsPage.privacyDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Button variant="outline" className="w-full sm:w-auto">{t('SettingsPage.twoFactorButton')}</Button>
            <Button variant="outline" className="w-full sm:w-auto">{t('SettingsPage.manageDevicesButton')}</Button>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Database className="mr-2 h-5 w-5 text-primary" />{t('SettingsPage.dataTitle')}</CardTitle>
          <CardDescription>{t('SettingsPage.dataDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => toast({title: t('Toast.cacheClearedTitle'), description: t('Toast.cacheClearedDescription')})}>{t('SettingsPage.clearCacheButton')}</Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => toast({title: t('Toast.exportStartedTitle'), description: t('Toast.exportStartedDescription')})}>{t('SettingsPage.exportDataButton')}</Button>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSaveChanges} size="lg">
          <Save className="mr-2 h-5 w-5" /> {t('SettingsPage.saveAllButton')}
        </Button>
      </div>
    </div>
  );
}
