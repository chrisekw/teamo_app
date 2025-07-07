
"use client";

import { useEffect } from 'react';
import { TeamoTextLogo } from '@/components/icons';

interface SplashScreenProps {
  onFinished: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinished }) => {
  // Call onFinished after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinished();
    }, 1200); // 1.2 second splash screen

    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background animate-in fade-in-0">
      <TeamoTextLogo className="h-20 w-auto sm:h-24 md:h-28" />
    </div>
  );
};

export default SplashScreen;
