import {
  LayoutDashboard,
  Layers,
  LayoutGrid,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface DashboardNavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export const dashboardNavItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { href: "/collections", label: "Collection Manager", shortLabel: "Folders", icon: LayoutGrid },
  { href: "/collection", label: "Collection", shortLabel: "Cards", icon: Layers },
  { href: "/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
];
