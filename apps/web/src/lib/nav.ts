import { MODULE_LABELS, type ModuleSlug } from "@serverspot/config";
import {
  BarChart3,
  FileText,
  Gamepad2,
  HelpCircle,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShoppingBag,
  Trophy,
  Users,
  Vote,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  module?: ModuleSlug;
};

export const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Store", href: "/admin/store", icon: ShoppingBag, module: "store" },
  { title: "Forum", href: "/admin/forum", icon: MessageSquare, module: "forum" },
  { title: "Support", href: "/admin/support", icon: HelpCircle, module: "support" },
  { title: "Blog", href: "/admin/blog", icon: FileText, module: "blog" },
  { title: "Players", href: "/admin/players", icon: Users, module: "players" },
  {
    title: "Leaderboards",
    href: "/admin/leaderboards",
    icon: Trophy,
    module: "leaderboards",
  },
  { title: "Votes", href: "/admin/votes", icon: Vote, module: "votes" },
  {
    title: "Applications",
    href: "/admin/applications",
    icon: FileText,
    module: "applications",
  },
  { title: "Analytics", href: "/admin/analytics", icon: BarChart3, module: "analytics" },
];

export const settingsNav: NavItem[] = [
  { title: "Settings", href: "/admin/settings/general", icon: Settings },
  { title: "Theme", href: "/admin/settings/theme", icon: Settings },
  { title: "Integrations", href: "/admin/settings/integrations", icon: Settings },
  { title: "Developer", href: "/admin/settings/developer", icon: Settings },
];

export { MODULE_LABELS };
