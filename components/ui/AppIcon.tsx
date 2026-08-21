"use client";
import React from "react";
import {
  LayoutDashboard,
  Home,
  PlusCircle,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Receipt,
  Bell,
  User,
  UserCheck,
  Settings,
  GraduationCap,
  ShieldCheck,
  Utensils,
  UtensilsCrossed,
  FileText,
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  Store,
  HeartPulse,
  Inbox,
  ClipboardList,
  RefreshCw,
  Zap,
  Wallet,
  LogOut,
  Menu,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  Search,
  Sliders,
  ChefHat,
  FileEdit,
  Send,
  type LucideProps
} from "lucide-react";

export type IconName =
  | "dashboard"
  | "home"
  | "create"
  | "orders"
  | "my_orders"
  | "pending"
  | "queue"
  | "completed"
  | "approved"
  | "rejected"
  | "bills"
  | "notifications"
  | "profile"
  | "settings"
  | "history"
  | "audit"
  | "reports"
  | "analytics"
  | "users"
  | "departments"
  | "vendors"
  | "health"
  | "incoming"
  | "active"
  | "modifications"
  | "menu"
  | "availability"
  | "revenue"
  | "coordinator"
  | "principal"
  | "dcr"
  | "vendor"
  | "admin"
  | "logout"
  | "menu_btn"
  | "back"
  | "eye"
  | "eye_off"
  | "check"
  | "search"
  | "chef"
  | "file_edit"
  | "send";

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  dashboard: LayoutDashboard,
  home: Home,
  create: PlusCircle,
  orders: Package,
  my_orders: Package,
  pending: Clock,
  queue: Clock,
  completed: CheckCircle2,
  approved: CheckCircle2,
  rejected: XCircle,
  bills: Receipt,
  notifications: Bell,
  profile: User,
  settings: Settings,
  history: FileText,
  audit: FileText,
  reports: BarChart3,
  analytics: TrendingUp,
  users: Users,
  departments: Building2,
  vendors: Store,
  health: HeartPulse,
  incoming: Inbox,
  active: ClipboardList,
  modifications: RefreshCw,
  menu: Utensils,
  availability: Zap,
  revenue: Wallet,
  coordinator: UserCheck,
  principal: GraduationCap,
  dcr: ShieldCheck,
  vendor: UtensilsCrossed,
  admin: Sliders,
  logout: LogOut,
  menu_btn: Menu,
  back: ArrowLeft,
  eye: Eye,
  eye_off: EyeOff,
  check: Check,
  search: Search,
  chef: ChefHat,
  file_edit: FileEdit,
  send: Send,
};

export default function AppIcon({
  name,
  size = 18,
  color,
  className = "",
  style = {},
  strokeWidth = 2,
}: {
  name: IconName | string;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
}) {
  const IconComponent = ICON_MAP[name] || Package;
  return (
    <IconComponent
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
    />
  );
}
