import React, { useCallback, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  LayoutDashboardIcon, CalendarCheckIcon,
  Building2Icon, UserCircle2Icon,
  TrophyIcon, BarChart3Icon, UsersIcon,
  LogOutIcon, TagIcon, ShieldCheckIcon, StarIcon,
  MegaphoneIcon, ScanLineIcon, KeyRoundIcon,
} from "lucide-react";
import { cn, getUserFullName } from "@/lib/utils";
import { adminUserAtom, adminTokenAtom } from "@/store/authStore";
import apiClient from "@/lib/apiClient";
import {
  getLastSeenBookingAt,
  setLastSeenBookingAt,
  unseenBookingsCountAtom,
} from "@/store/bookingStore";

const CLUB_OWNER_NAV = [
  { to: "/",            icon: LayoutDashboardIcon, label: "داشبورد"      },
  { to: "/clubs",       icon: Building2Icon,        label: "باشگاه"     },
  { to: "/bookings",    icon: CalendarCheckIcon,    label: "رزروها"       },
  { to: "/tournaments", icon: TrophyIcon,           label: "تورنومنت‌ها"  },
  { to: "/marketing",   icon: MegaphoneIcon,        label: "رشد و مارکتینگ" },
  { to: "/discounts",   icon: TagIcon,              label: "تخفیف‌ها"     },
  { to: "/customers",   icon: UserCircle2Icon,      label: "مشتریان"       },
  { to: "/reviews",     icon: StarIcon,             label: "نظرات"         },
  { to: "/verify",        icon: ScanLineIcon,   label: "تأیید رزرو"    },
  { to: "/set-password",  icon: KeyRoundIcon,   label: "تنظیم رمز عبور" },
];

const ADMIN_EXTRA_NAV = [
  { to: "/analytics", icon: BarChart3Icon, label: "آنالیتیکس" },
  { to: "/users",     icon: UsersIcon,     label: "کاربران"    },
];

const BOOKING_POLL_INTERVAL_MS = 60_000;

function NavItem({ to, icon: Icon, label, badgeCount = 0, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary-foreground" : "")} />
          <span className="flex-1">{label}</span>
          {badgeCount > 0 && (
            <span className={cn(
              "min-w-5 h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
              isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-red-500 text-white"
            )}>
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ className, onNavigate }) {
  const [, setUser]  = useAtom(adminUserAtom);
  const [, setToken] = useAtom(adminTokenAtom);
  const user         = useAtomValue(adminUserAtom);
  const unseenBookingsCount = useAtomValue(unseenBookingsCountAtom);
  const setUnseenBookingsCount = useSetAtom(unseenBookingsCountAtom);
  const navigate     = useNavigate();
  const location = useLocation();
  const pollRef = useRef(null);

  const isAdmin = user?.isAdmin;

  const handleNavigate = useCallback(() => {
    onNavigate?.();
  }, [onNavigate]);

  const refreshUnseenBookingsCount = useCallback(async () => {
    const { ok, data } = await apiClient.get("/club-panel/bookings");
    if (!ok) return;

    const rows = Array.isArray(data?.bookings) ? data.bookings : [];
    const latestCreatedAt = rows[0]?.createdAt;

    if (location.pathname.startsWith("/bookings")) {
      setUnseenBookingsCount(0);
      if (latestCreatedAt) setLastSeenBookingAt(latestCreatedAt);
      return;
    }

    const lastSeenBookingAt = getLastSeenBookingAt();
    if (!lastSeenBookingAt) {
      if (latestCreatedAt) setLastSeenBookingAt(latestCreatedAt);
      setUnseenBookingsCount(0);
      return;
    }

    const lastSeenMs = Date.parse(lastSeenBookingAt);
    if (Number.isNaN(lastSeenMs)) return;

    const unseenCount = rows.filter((booking) => {
      const createdAtMs = Date.parse(booking?.createdAt);
      return !Number.isNaN(createdAtMs) && createdAtMs > lastSeenMs;
    }).length;

    setUnseenBookingsCount(Math.max(0, unseenCount));
  }, [location.pathname, setUnseenBookingsCount]);

  useEffect(() => {
    const syncNow = async () => {
      await refreshUnseenBookingsCount();
    };
    syncNow();

    pollRef.current = setInterval(syncNow, BOOKING_POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refreshUnseenBookingsCount]);

  const handleLogout = () => {
    localStorage.removeItem("raqetzone-admin-token");
    localStorage.removeItem("raqetzone-admin-user");
    setUser(null); setToken(null);
    onNavigate?.();
    navigate("/login");
  };

  return (
    <aside className={cn("flex flex-col w-60 shrink-0 h-screen bg-sidebar border-l border-sidebar-border overflow-hidden", className)}>
      {/* Brand */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Raqetzone" className="h-8 w-8 rounded-xl object-contain" />
          <div>
            <p className="font-black text-foreground text-sm leading-tight">رکت‌زون</p>
            <p className="text-[10px] text-muted-foreground">
              {isAdmin ? "پنل سوپر ادمین" : "پنل صاحب باشگاه"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto no-scrollbar">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2 mt-1">
          مدیریت باشگاه
        </p>
        {CLUB_OWNER_NAV.map((item) => (
          <NavItem
            key={item.to}
            {...item}
            badgeCount={item.to === "/bookings" ? unseenBookingsCount : 0}
            onClick={handleNavigate}
          />
        ))}

        {isAdmin && (
          <>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2 mt-4">
              ادمین سیستم
            </p>
            {ADMIN_EXTRA_NAV.map((item) => <NavItem key={item.to} {...item} onClick={handleNavigate} />)}
          </>
        )}
      </nav>

      {/* Role badge + User + Logout */}
      <div className="px-3 pb-4 border-t border-sidebar-border pt-3 space-y-1.5">
        {/* Role badge */}
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold",
          isAdmin
            ? "bg-primary/10 text-primary"
            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        )}>
          <ShieldCheckIcon className="w-3.5 h-3.5" />
          {isAdmin ? "سوپر ادمین" : "صاحب باشگاه"}
        </div>

        {user && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/60">
            
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{getUserFullName(user)}</p>
              <p className="text-[10px] text-muted-foreground truncate" dir="ltr">{user.phone}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
        >
          <LogOutIcon className="w-4 h-4 shrink-0" />
          خروج از حساب
        </button>
      </div>
    </aside>
  );
}
