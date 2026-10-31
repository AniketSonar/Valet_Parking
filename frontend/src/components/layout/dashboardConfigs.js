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
  searchPlaceholder: "Search...",
  menu: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "staff", label: "Staff Management", icon: UserRoundPen },
    { id: "areas", label: "Areas & Managers", icon: Building2 },
    { id: "revenue", label: "Revenue & Payments", icon: CreditCard },
    { id: "reports", label: "Reports & Overview", icon: FileChartColumn },
  ],
};

export const parkingAdminConfig = {
  brandSubtitle: "VALET PARKING",
  roleLabel: "Manager",
  defaultName: "Manager",
  searchPlaceholder: "Search...",
  menu: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "parking-slots", label: "Parking Slots", icon: ParkingSquare },
    { id: "parking-operations", label: "Parking Operations", icon: CarFront },
    { id: "valet-management", label: "Valet Management", icon: Users },
    { id: "valet-positions", label: "Valet Positions", icon: MapPinned },
    { id: "parking-sessions", label: "Parking Sessions", icon: ClipboardList },
    { id: "incidents", label: "Incident Management", icon: ShieldAlert },
    { id: "feedback", label: "Feedback", icon: MessageSquare },
    { id: "revenue", label: "Revenue & Payments", icon: CreditCard },
    { id: "reports", label: "Reports", icon: BarChart3 },
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
    { id: "payments", label: "Payments & Invoices", icon: CreditCard },
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
    { id: "retrieval-requests", label: "Retrieval Requests", icon: History },
    { id: "parking-slots", label: "Parking Slots", icon: ParkingSquare },
    { id: "completed-returns", label: "Completed Returns", icon: History },
    { id: "security-payments", label: "Payments", icon: CreditCard },
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
