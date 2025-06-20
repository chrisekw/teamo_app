import * as React from 'react';

export const APP_LOGO_BLUE = "#007FFF"; // A vibrant blue for the logo - EXPORTED

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
export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" {...props}>
    <IconElement />
  </svg>
);

// Exported component for the full logo (ICON + TEXT)
// Accepts a textToDisplay prop for animation
export const TeamoTextLogo = (props: React.SVGProps<SVGSVGElement> & { textToDisplay?: string }) => (
  <svg viewBox="0 0 150 40" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g transform="translate(0, 4) scale(0.5)">
      <IconElement />
    </g>
    <text
      x="40"
      y="29.5"
      fontFamily="Space Grotesk, sans-serif"
      fontSize="28"
      fontWeight="bold"
      fill={APP_LOGO_BLUE}
      textAnchor="start" // Explicitly set text-anchor
    >
      {props.textToDisplay === undefined ? "Teamo" : props.textToDisplay}
    </text>
  </svg>
);
