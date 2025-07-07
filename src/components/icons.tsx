import * as React from 'react';

export const APP_LOGO_BLUE = "#007FFF"; // A vibrant blue for the logo - EXPORTED

// Exported component for the text logo ONLY
export const TeamoTextLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 110 40" xmlns="http://www.w3.org/2000/svg" {...props}>
    <text
      x="0"
      y="29.5"
      fontFamily="Space Grotesk, sans-serif"
      fontSize="28"
      fontWeight="bold"
      fill={APP_LOGO_BLUE}
      textAnchor="start"
    >
      Teamo
    </text>
  </svg>
);
