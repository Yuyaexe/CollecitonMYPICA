import {
  LayoutDashboard,
  Layers,
  LayoutGrid,
  Printer,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { MessageKey } from "@/lib/i18n/messages";

export interface DashboardNavItem {
  href: string;
  labelKey: MessageKey;
  shortLabelKey: MessageKey;
  icon: LucideIcon;
}

export const dashboardNavItems: DashboardNavItem[] = [
  {
    href: "/dashboard",
    labelKey: "nav.dashboard",
    shortLabelKey: "nav.dashboardShort",
    icon: LayoutDashboard,
  },
  {
    href: "/collections",
    labelKey: "nav.collectionManager",
    shortLabelKey: "nav.collectionManagerShort",
    icon: LayoutGrid,
  },
  {
    href: "/collection",
    labelKey: "nav.collection",
    shortLabelKey: "nav.collectionShort",
    icon: Layers,
  },
  {
    href: "/anime-collection",
    labelKey: "nav.animeCollection",
    shortLabelKey: "nav.animeCollectionShort",
    icon: Sparkles,
  },
  {
    href: "/proxy-print",
    labelKey: "nav.proxyPrint",
    shortLabelKey: "nav.proxyPrintShort",
    icon: Printer,
  },
  {
    href: "/settings",
    labelKey: "nav.settings",
    shortLabelKey: "nav.settingsShort",
    icon: Settings,
  },
];
