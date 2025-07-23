
'use client';

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn } from 'lucide-react';
import { TeamoTextLogo, GoogleLogo } from '@/components/icons';
import { loginSchema, type LoginInput } from '../schemas';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const { signIn, signInWithGoogle, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit: SubmitHandler<LoginInput> = async (data) => {
    try {
      await signIn(data);
      toast({ title: 'Login Successful', description: "Welcome back!" });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  };
  
  const onGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast({ title: 'Login Successful', description: 'Welcome to Teamo!' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: error.message || 'Could not sign in with Google.',
      });
    }
  };


  return (
    <Card className="w-full shadow-xl">
      <CardHeader className="items-center">
        <TeamoTextLogo className="h-10 mb-4" />
        <CardTitle className="font-headline text-2xl">Welcome Back!</CardTitle>
        <CardDescription>Sign in to continue to Teamo.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button variant="outline" className="w-full" onClick={onGoogleSignIn} disabled={authLoading}>
            <GoogleLogo className="mr-2 h-5 w-5" />
            Sign in with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={authLoading}>
                {authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Sign In
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Button variant="link" asChild className="p-0 h-auto">
            <Link href="/signup">Sign Up</Link>
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}
