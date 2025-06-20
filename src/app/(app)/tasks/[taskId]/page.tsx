
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page is a fallback to redirect from an old path structure.
// It replaces the old task detail page that was causing a routing conflict.
export default function OldTaskDetailPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main tasks page as a sensible default
    router.replace('/tasks');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full min-h-screen">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecting to tasks...</p>
      </div>
    </div>
  );
}
