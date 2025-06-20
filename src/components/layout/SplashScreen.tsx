
"use client";

import { useState, useEffect } from 'react';
import { TeamoTextLogo } from '@/components/icons';

interface SplashScreenProps {
  onFinished: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinished }) => {
  const targetText = "Teamo";
  const [displayTextContent, setDisplayTextContent] = useState("");
  const [showBlinkingCursor, setShowBlinkingCursor] = useState(true);
  const [typingDone, setTypingDone] = useState(false);

  useEffect(() => {
    let charIndex = 0;
    const type = () => {
      if (charIndex < targetText.length) {
        setDisplayTextContent(targetText.substring(0, charIndex + 1));
        charIndex++;
        setTimeout(type, 150); // Typing speed (ms)
      } else {
        setTypingDone(true);
        setShowBlinkingCursor(false); // Hide cursor after typing
        setTimeout(onFinished, 700); // Wait a bit after typing before calling onFinished
      }
    };
    const initialDelayTimeout = setTimeout(type, 300); // Initial delay before typing starts

    return () => {
        clearTimeout(initialDelayTimeout);
        // No need to clear the chained timeouts inside 'type' as they stop naturally
    };
  }, [onFinished, targetText]);

  // Cursor blink effect
  useEffect(() => {
    if (typingDone) {
      setShowBlinkingCursor(false);
      return;
    }
    const blinkInterval = setInterval(() => {
      setShowBlinkingCursor(prev => !prev);
    }, 500); // Blink speed (ms)
    return () => clearInterval(blinkInterval);
  }, [typingDone]);
  
  // Append cursor to the text being displayed in the logo
  const textForLogo = displayTextContent + (showBlinkingCursor && !typingDone ? "_" : "");

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
      <TeamoTextLogo className="h-20 w-auto sm:h-24 md:h-28" textToDisplay={textForLogo} />
    </div>
  );
};

export default SplashScreen;
