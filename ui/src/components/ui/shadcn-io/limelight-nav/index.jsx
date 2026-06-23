import React, { cloneElement } from "react";
import { Sparkles, Trophy, Home, User, CalendarCheck } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

const defaultNavItems = [
  { id: "home", icon: <Home />, label: "خانه", href: "/" },
  { id: "clubs", icon: <CalendarCheck />, label: "رزرو", href: "/clubs" },
  { id: "tournament", icon: <Trophy />, label: "مسابقات", href: "/tournament" },
  { id: "chat", icon: <Sparkles />, label: "دستیار", href: "/ai" },
  { id: "profile", icon: <User />, label: "پروفایل", href: "/profile" },
];

function TournamentItem({ active, href, onClick }) {
  return (
    <Link
      to={href}
      onClick={onClick}
      aria-label="مسابقات"
      id="tour-nav-tournament"
      className="relative z-20 flex flex-1 h-full cursor-pointer items-center justify-center mb-[10px]"
    >
      <div className="flex flex-col items-center justify-center" style={{ marginTop: -24 }}>
        <motion.div
          animate={active ? { scale: 1.08 } : { scale: 1 }}
          transition={{ type: "spring", stiffness: 360, damping: 24 }}
          className="relative"
        >
          {!active && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", opacity: 0.4 }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          <div
            className="relative w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
              boxShadow: active
                ? "0 4px 14px rgba(239,68,68,0.5)"
                : "0 3px 10px rgba(239,68,68,0.3)",
            }}
          >
            <Trophy className="w-6 h-6 text-white" strokeWidth={2.2} />
          </div>
        </motion.div>

        <span className={cn(
          "text-xs mt-1 leading-none",
          active ? "text-red-500 dark:text-red-400 font-bold" : "text-muted-foreground"
        )}>
          مسابقات
        </span>
      </div>
    </Link>
  );
}

export const LimelightNav = ({
  items = defaultNavItems,
  onTabChange,
  className,
  iconContainerClassName,
  iconClassName,
}) => {
  const location = useLocation();

  if (items.length === 0) return null;

  const isActive = (item) => {
    const currentPath = location.pathname;
    if (item.href === "/") return currentPath === "/";
    return currentPath.startsWith(item.href);
  };

  return (
    <nav
      className={cn(
        "relative inline-flex items-center h-16 w-full bg-card text-foreground border-t shadow-lg md:w-120 overflow-visible",
        className
      )}
    >
      {items.map(({ id, icon, label, href }, index) => {
        const active = isActive({ href });

        if (id === "tournament") {
          return (
            <TournamentItem
              key={id}
              active={active}
              href={href}
              onClick={() => onTabChange?.(index)}
            />
          );
        }

        return (
          <Link
            key={id}
            id={`tour-nav-${id}`}
            to={href}
            className={cn(
              "relative z-20 flex flex-1 h-full cursor-pointer items-center justify-center p-2",
              iconContainerClassName
            )}
            onClick={() => onTabChange?.(index)}
            aria-label={label}
          >
            <div className="flex flex-col items-center justify-center">
              <p>
                {cloneElement(icon, {
                  className: cn(
                    "w-5 h-5 transition-all duration-150",
                    active ? "text-primary" : "text-muted-foreground",
                    icon.props?.className || "",
                    iconClassName || ""
                  ),
                })}
              </p>
              <p className={cn("text-xs mt-1", active ? "text-primary font-semibold" : "text-muted-foreground")}>
                {label}
              </p>
            </div>
          </Link>
        );
      })}
    </nav>
  );
};
