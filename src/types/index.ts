import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon | React.ElementType;
  label?: string;
  disabled?: boolean;
  external?: boolean;
  variant?: "default" | "ghost";
  children?: NavItem[];
}
