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

export interface IconColorTheme {
  color: string;
  bg: string;
  glow: string;
}

export const ICON_COLORS: Record<string, IconColorTheme> = {
  dashboard:    { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)', glow: 'rgba(59, 130, 246, 0.25)' }, // Royal Blue
  home:         { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)', glow: 'rgba(59, 130, 246, 0.25)' },
  users:        { color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', glow: 'rgba(16, 185, 129, 0.25)' }, // Emerald
  departments:  { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', glow: 'rgba(245, 158, 11, 0.25)' }, // Amber
  vendors:      { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)', glow: 'rgba(139, 92, 246, 0.25)' }, // Purple
  orders:       { color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.12)', glow: 'rgba(244, 63, 94, 0.25)' }, // Rose
  my_orders:    { color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.12)', glow: 'rgba(244, 63, 94, 0.25)' },
  create:       { color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', glow: 'rgba(16, 185, 129, 0.25)' }, // Green
  pending:      { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', glow: 'rgba(245, 158, 11, 0.25)' },
  queue:        { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', glow: 'rgba(245, 158, 11, 0.25)' },
  completed:    { color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', glow: 'rgba(16, 185, 129, 0.25)' },
  approved:     { color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', glow: 'rgba(16, 185, 129, 0.25)' },
  rejected:     { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', glow: 'rgba(239, 68, 68, 0.25)' },
  bills:        { color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.12)', glow: 'rgba(6, 182, 212, 0.25)' }, // Cyan
  reports:      { color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.12)', glow: 'rgba(14, 165, 233, 0.25)' }, // Sky
  analytics:    { color: '#D946EF', bg: 'rgba(217, 70, 239, 0.12)', glow: 'rgba(217, 70, 239, 0.25)' }, // Fuchsia
  notifications:{ color: '#FB923C', bg: 'rgba(251, 146, 60, 0.12)', glow: 'rgba(251, 146, 60, 0.25)' }, // Coral
  audit:        { color: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)', glow: 'rgba(99, 102, 241, 0.25)' }, // Indigo
  health:       { color: '#14B8A6', bg: 'rgba(20, 184, 166, 0.12)', glow: 'rgba(20, 184, 166, 0.25)' }, // Mint
  settings:     { color: '#64748B', bg: 'rgba(100, 116, 139, 0.12)', glow: 'rgba(100, 116, 139, 0.25)' }, // Slate
  profile:      { color: '#2563EB', bg: 'rgba(37, 99, 235, 0.12)', glow: 'rgba(37, 99, 235, 0.25)' }, // Blue
  menu:         { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', glow: 'rgba(245, 158, 11, 0.25)' },
  incoming:     { color: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)', glow: 'rgba(99, 102, 241, 0.25)' },
  active:       { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)', glow: 'rgba(59, 130, 246, 0.25)' },
  modifications:{ color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.12)', glow: 'rgba(6, 182, 212, 0.25)' },
  availability: { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)', glow: 'rgba(139, 92, 246, 0.25)' },
  revenue:      { color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', glow: 'rgba(16, 185, 129, 0.25)' },
  history:      { color: '#64748B', bg: 'rgba(100, 116, 139, 0.12)', glow: 'rgba(100, 116, 139, 0.25)' },
  logout:       { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', glow: 'rgba(239, 68, 68, 0.25)' },
};

export function getIconTheme(name: string): IconColorTheme {
  return ICON_COLORS[name] || { color: '#2563EB', bg: 'rgba(37, 99, 235, 0.12)', glow: 'rgba(37, 99, 235, 0.25)' };
}

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
