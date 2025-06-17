
'use client';

import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from './client'; // Your Firebase client instance
import { useRouter } from 'next/navigation';
import type { z } from 'zod';
import type { loginSchema, signupSchema } from '@/app/(auth)/schemas'; // Assuming schemas are defined here

type LoginInput = z.infer<typeof loginSchema>;
type SignupInput = z.infer<typeof signupSchema>;

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  error: AuthError | null;
  signUp: (data: SignupInput) => Promise<void>;
  signIn: (data: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signUp = async (data: SignupInput) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user; // Use the user object from the credential

      if (firebaseUser && data.name) {
        await updateProfile(firebaseUser, { displayName: data.name });
        // After updating profile, reload this specific user object to get the latest data from Firebase.
        await firebaseUser.reload(); 
        // Set the user in context. onAuthStateChanged will also set this, but this makes it available sooner for the current flow.
        setUser(firebaseUser); 
      } else if (firebaseUser) {
        // If no name to update, still set the user state with the newly created user
        setUser(firebaseUser);
      }
      // If user creation failed and firebaseUser is null, error would have been thrown.
      // onAuthStateChanged will eventually ensure the global state is correct.
      router.push('/dashboard');
    } catch (e) {
      setError(e as AuthError);
      throw e; // Re-throw for form error handling
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (data: LoginInput) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      router.push('/dashboard');
    } catch (e) {
      setError(e as AuthError);
      throw e; // Re-throw for form error handling
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut(auth);
      setUser(null); // Clear user state immediately
      router.push('/login'); // Redirect to login after sign out
    } catch (e) {
      setError(e as AuthError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

