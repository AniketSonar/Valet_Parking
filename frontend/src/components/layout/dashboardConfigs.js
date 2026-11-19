import {
  LayoutDashboard,
  ParkingSquare,
  CarFront,
  Users,
  BarChart3,
  UserRoundPen,
  ClipboardList,
  ShieldAlert,
  MessageSquare,
  History,
  CreditCard,
  FileChartColumn,
  Building2,
  MapPinned,
  Bell,
  Settings,
  KeyRound,
  Star,
} from "lucide-react";

/**
 * CENTRAL DASHBOARD CONFIG
 * ------------------------------------------------------------
 * Add / rename / reorder sidebar items for any role here.
 * `id` values are the tab ids each dashboard already switches on.
 * Look & feel lives in css/DashboardLayout.css.
 */

export const adminConfig = {
  brandSubtitle: "VALET PARKING",
  roleLabel: "Administrator",
  defaultName: "Super Admin",
  profileId: "settings",
  searchPlaceholder: "Search...",
  menu: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "infra", label: "Infra Management", icon: Building2 },
    { id: "parking-operations", label: "Parking Operations", icon: CarFront },
    { id: "parking-slots", label: "Parking Slots", icon: ParkingSquare },
    { id: "revenue", label: "Revenue", icon: CreditCard },
    { id: "incidents", label: "Incident Management", icon: ShieldAlert },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "settings", label: "Settings", icon: Settings },
  ],
};

export const parkingAdminConfig = {
  brandSubtitle: "VALET PARKING",
  roleLabel: "Manager",
  defaultName: "Manager",
  searchPlaceholder: "Search...",
  menu: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "staff-management", label: "Staff Management", icon: Users },
    { id: "parking-operations", label: "Parking Operations", icon: CarFront },
    { id: "parking-slots", label: "Parking Slots", icon: ParkingSquare },
    { id: "retrievals", label: "Retrieval Requests", icon: KeyRound },
    { id: "incidents", label: "Incident Management", icon: ShieldAlert },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "settings", label: "Settings", icon: Settings },
  ],
};

export const receptionConfig = {
  brandSubtitle: "RECEPTION DESK",
  menuLabel: "OPERATIONS",
  roleLabel: "Reception Desk",
  defaultName: "Reception",
  searchPlaceholder: "Search sessions, customers...",
  menu: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "sessions", label: "Active Sessions", icon: ClipboardList },
    { id: "customers", label: "Customers", icon: Users },
    { id: "vehicles", label: "Vehicles", icon: CarFront },
  ],
};

export const valetConfig = {
  brandSubtitle: "VALET PARKING",
  roleLabel: "Valet",
  defaultName: "Valet",
  searchPlaceholder: "Search vehicles, tickets...",
  menu: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "security-dashboard", label: "Check-In", icon: ClipboardList },
    { id: "my-vehicles", label: "My Vehicles", icon: CarFront },
    { id: "parking-slots", label: "Parking Slots", icon: ParkingSquare },
    { id: "retrieval-requests", label: "Retrieval Requests", icon: History },
    { id: "completed-returns", label: "Completed Returns", icon: History },
    { id: "regular-guests", label: "Regular / Event Guests", icon: Star },
    { id: "incidents", label: "Incident Management", icon: ShieldAlert },
    { id: "settings", label: "Settings", icon: Settings },
  ],
};

export const customerConfig = {
  brandSubtitle: "CUSTOMER PORTAL",
  menuLabel: "MY ACCOUNT",
  roleLabel: "Customer",
  defaultName: "Customer",
  searchPlaceholder: "Search your vehicles...",
  menu: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "vehicles", label: "My Vehicles", icon: CarFront },
    { id: "history", label: "Parking History", icon: History },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "feedback", label: "Feedback", icon: MessageSquare },
  ],
};
