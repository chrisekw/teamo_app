import * as React from 'react';

export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect width="100" height="100" rx="20" fill="hsl(var(--primary))"/>
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="60" fontWeight="bold" fill="hsl(var(--primary-foreground))" className="font-headline">T</text>
  </svg>
);

export const TeamoTextLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 150 40" xmlns="http://www.w3.org/2000/svg" {...props} className="h-8 w-auto">
    <text x="0" y="30" className="font-headline" fontSize="30" fill="hsl(var(--sidebar-foreground))">
      Teamo
    </text>
  </svg>
);
