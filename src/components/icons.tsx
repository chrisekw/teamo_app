import * as React from 'react';

const APP_LOGO_BLUE = "#007FFF"; // A vibrant blue for the logo

// Internal component for the graphical icon part
const IconElement = () => (
  <>
    {/* Central circle */}
    <circle cx="32" cy="32" r="7" fill={APP_LOGO_BLUE} />
    {/* Outer circles - positioned relative to a 64x64 viewBox */}
    <circle cx="12" cy="18" r="5.5" fill={APP_LOGO_BLUE} /> 
    <circle cx="52" cy="18" r="5.5" fill={APP_LOGO_BLUE} />
    <circle cx="32" cy="50" r="5.5" fill={APP_LOGO_BLUE} />

    {/* Connecting lines */}
    <line x1="32" y1="32" x2="12" y2="18" stroke={APP_LOGO_BLUE} strokeWidth="3.5" strokeLinecap="round" />
    <line x1="32" y1="32" x2="52" y2="18" stroke={APP_LOGO_BLUE} strokeWidth="3.5" strokeLinecap="round" />
    <line x1="32" y1="32" x2="32" y2="50" stroke={APP_LOGO_BLUE} strokeWidth="3.5" strokeLinecap="round" />
    <line x1="12" y1="18" x2="52" y2="18" stroke={APP_LOGO_BLUE} strokeWidth="3.5" strokeLinecap="round" />
    <line x1="12" y1="18" x2="32" y2="50" stroke={APP_LOGO_BLUE} strokeWidth="3.5" strokeLinecap="round" />
    <line x1="52" y1="18" x2="32" y2="50" stroke={APP_LOGO_BLUE} strokeWidth="3.5" strokeLinecap="round" />
  </>
);

// Exported component for the icon ONLY (e.g., for collapsed sidebar)
// ViewBox adjusted to tightly wrap the 64x64 icon definition
export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" {...props}>
    <IconElement />
  </svg>
);

// Exported component for the full logo (ICON + TEXT)
// Icon (native 64x64) is scaled down to fit. Text is positioned next to it.
// Target overall height of 40 for the viewBox. Icon scaled to 32px height.
// Text "Teamo" at fontSize ~28-30.
// Approximate total width: Icon (32) + Space (8) + Text (approx 110 for "Teamo" at ~30px font) = 150
export const TeamoTextLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 150 40" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Icon part, scaled to height 32, vertically centered within 40px height */}
    {/* (40-32)/2 = 4px top/bottom margin for icon. */}
    <g transform="translate(0, 4) scale(0.5)"> {/* 64*0.5=32px height. 4px y-offset for centering */}
      <IconElement />
    </g>
    {/* Text part, positioned after the scaled icon */}
    {/* Scaled icon width is 32px. Add 8px space. Text starts at x=40. */}
    {/* y baseline adjustment: for Space Grotesk, a y around 29-30 usually looks good for a 40px height container with fontSize 30 */}
    <text 
      x="40" 
      y="29.5" // Adjusted for better vertical alignment of Space Grotesk
      fontFamily="Space Grotesk, sans-serif" // Matches font-headline
      fontSize="28" // Slightly adjusted for balance with the new icon
      fontWeight="bold" 
      fill={APP_LOGO_BLUE}
    >
      Teamo
    </text>
  </svg>
);

