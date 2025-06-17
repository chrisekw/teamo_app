import * as React from 'react';

const APP_LOGO_BLUE = "#007FFF"; // A vibrant blue for the logo

// Internal component for the graphical icon part
const IconElement = () => (
  <>
    <path d="M32 10L10 32L32 54L54 32L32 10Z" stroke={APP_LOGO_BLUE} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="10" cy="32" r="6.5" fill={APP_LOGO_BLUE}/>
    <circle cx="32" cy="10" r="6.5" fill={APP_LOGO_BLUE}/>
    <circle cx="32" cy="54" r="6.5" fill={APP_LOGO_BLUE}/>
    <circle cx="54" cy="32" r="6.5" fill={APP_LOGO_BLUE}/>
  </>
);

// Exported component for the icon ONLY (e.g., for collapsed sidebar)
export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" {...props}>
    <IconElement />
  </svg>
);

// Exported component for the full logo (ICON + TEXT)
export const TeamoTextLogo = (props: React.SVGProps<SVGSVGElement>) => (
  // viewBox is set to achieve a good balance for icon and text at a typical display height (e.g. 32-40px)
  // Icon (native 64x64) is scaled down to fit. Text is positioned next to it.
  // Target overall height of 40 for the viewBox for consistency.
  // Scaled icon height: 32 (0.5 of 64). (40-32)/2 = 4px top/bottom margin for icon.
  // Text "Teamo" at fontSize 30, fontWeight bold.
  // Total width: Icon (32) + Space (8) + Text (approx 110) = 150
  <svg viewBox="0 0 150 40" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Icon part, scaled to height 32, vertically centered within 40px height */}
    <g transform="translate(0, 4) scale(0.5)"> {/* 64*0.5=32px height. (40-32)/2 = 4px y-offset for centering */}
      <IconElement />
    </g>
    {/* Text part, positioned after the scaled icon */}
    {/* Scaled icon width is 32px. Add 8px space. Text starts at x=40. */}
    <text 
      x="40" 
      y="30" // Baseline for fontSize 30 within 40px height
      fontFamily="Space Grotesk, sans-serif" // Matches font-headline
      fontSize="30" 
      fontWeight="bold" 
      fill={APP_LOGO_BLUE}
    >
      Teamo
    </text>
  </svg>
);
