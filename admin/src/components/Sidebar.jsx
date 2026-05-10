import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAtom, useAtomValue } from "jotai";
import {
  LayoutDashboardIcon, CalendarCheckIcon,
  Building2Icon, MapPinIcon,
  TrophyIcon, BarChart3Icon, UsersIcon,
  LogOutIcon, TagIcon, ShieldCheckIcon, StarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminUserAtom, adminTokenAtom } from "@/store/authStore";

const CLUB_OWNER_NAV = [
  { to: "/",          icon: LayoutDashboardIcon, label: "داشبورد"      },
  { to: "/clubs",     icon: Building2Icon,        label: "باشگاه‌ها"  },
  { to: "/bookings",  icon: CalendarCheckIcon,    label: "رزروها"       },
  { to: "/courts",    icon: MapPinIcon,           label: "زمین‌ها"      },
  { to: "/discounts", icon: TagIcon,              label: "تخفیف‌ها"     },
  { to: "/reviews",   icon: StarIcon,             label: "نظرات"         },
];

const ADMIN_EXTRA_NAV = [
  { to: "/tournaments", icon: TrophyIcon,    label: "تورنومنت‌ها" },
  { to: "/analytics",   icon: BarChart3Icon, label: "آنالیتیکس"  },
  { to: "/users",       icon: UsersIcon,     label: "کاربران"     },
];

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
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
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const [, setUser]  = useAtom(adminUserAtom);
  const [, setToken] = useAtom(adminTokenAtom);
  const user         = useAtomValue(adminUserAtom);
  const navigate     = useNavigate();

  const isAdmin = user?.isAdmin;

  const handleLogout = () => {
    localStorage.removeItem("raqetzone-admin-token");
    localStorage.removeItem("raqetzone-admin-user");
    setUser(null); setToken(null);
    navigate("/login");
  };

  return (
    <aside className="flex flex-col w-60 shrink-0 h-screen bg-sidebar border-l border-sidebar-border overflow-hidden">
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
        {CLUB_OWNER_NAV.map((item) => <NavItem key={item.to} {...item} />)}

        {isAdmin && (
          <>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2 mt-4">
              ادمین سیستم
            </p>
            {ADMIN_EXTRA_NAV.map((item) => <NavItem key={item.to} {...item} />)}
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
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary text-xs font-bold">{(user.name ?? user.phone ?? "U")[0]}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{user.name ?? "کاربر"}</p>
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
