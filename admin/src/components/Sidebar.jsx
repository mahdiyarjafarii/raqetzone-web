import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAtom, useAtomValue } from "jotai";
import {
  LayoutDashboardIcon, CalendarCheckIcon, MapPinIcon,
  TrophyIcon, BarChart3Icon, UsersIcon, LogOutIcon, TagIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminUserAtom, adminTokenAtom } from "@/store/authStore";

const NAV = [
  { to: "/",            icon: LayoutDashboardIcon, label: "داشبورد"      },
  { to: "/bookings",    icon: CalendarCheckIcon,   label: "رزروها"       },
  { to: "/courts",      icon: MapPinIcon,           label: "زمین‌ها"     },
  { to: "/discounts",   icon: TagIcon,              label: "تخفیف‌ها"    },
  { to: "/tournaments", icon: TrophyIcon,           label: "تورنومنت‌ها" },
  { to: "/analytics",   icon: BarChart3Icon,        label: "آنالیتیکس"   },
  { to: "/users",       icon: UsersIcon,            label: "کاربران"     },
];

export default function Sidebar() {
  const [, setUser]  = useAtom(adminUserAtom);
  const [, setToken] = useAtom(adminTokenAtom);
  const user         = useAtomValue(adminUserAtom);
  const navigate     = useNavigate();

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
            <p className="text-[10px] text-muted-foreground">پنل مدیریت</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto no-scrollbar">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2 mt-1">منو اصلی</p>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
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
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-4 border-t border-sidebar-border pt-3 space-y-1">
        {user && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/60 mb-1">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary text-xs font-bold">{(user.name ?? user.phone ?? "A")[0]}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{user.name ?? "ادمین"}</p>
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
