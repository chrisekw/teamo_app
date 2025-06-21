
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type FontSize = 'small' | 'medium' | 'large';

interface FontSizeContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export const FontSizeProvider = ({ children }: { children: ReactNode }) => {
  // Default to 'medium'
  const [fontSize, setFontSizeState] = useState<FontSize>('medium');
  const [isMounted, setIsMounted] = useState(false);

  // On initial mount, read from localStorage
  useEffect(() => {
    const storedFontSize = localStorage.getItem('app-font-size') as FontSize | null;
    if (storedFontSize && ['small', 'medium', 'large'].includes(storedFontSize)) {
      setFontSizeState(storedFontSize);
    }
    setIsMounted(true);
  }, []);

  // Function to update the font size
  const setFontSize = useCallback((size: FontSize) => {
    if (['small', 'medium', 'large'].includes(size)) {
      setFontSizeState(size);
      localStorage.setItem('app-font-size', size);
    }
  }, []);

  // Effect to apply the class to the <html> element
  useEffect(() => {
    if (isMounted) {
      const root = document.documentElement;
      // Clean up old classes
      root.classList.remove('font-size-small', 'font-size-large');
      
      // Apply new class if not medium (which is the default)
      if (fontSize === 'small') {
        root.classList.add('font-size-small');
      } else if (fontSize === 'large') {
        root.classList.add('font-size-large');
      }
    }
  }, [fontSize, isMounted]);

  const value = { fontSize, setFontSize };

  return (
    <FontSizeContext.Provider value={value}>
      {children}
    </FontSizeContext.Provider>
  );
};

export const useFontSize = (): FontSizeContextType => {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
};
