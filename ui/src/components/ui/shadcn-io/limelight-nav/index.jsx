import React, { cloneElement } from "react";
import { Sparkles, Trophy, Home, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

const defaultNavItems = [
  { id: "home", icon: <Home />, label: "خانه", href: "/" },
  { id: "tournament", icon: <Trophy />, label: "تورنومنت", href: "/tournament" },
  { id: "chat", icon: <Sparkles />, label: "هوش مصنوعی", href: "/ai" },
  { id: "profile", icon: <User />, label: "پروفایل", href: "/profile" },
];

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

    // For home page, only match exact path
    if (item.href === "/") {
      return currentPath === "/";
    }

    // For other pages, check if current path starts with item href
    // This handles nested routes like /image/history, /video/history, etc.
    return currentPath.startsWith(item.href);
  };

  const handleItemClick = (index) => {
    onTabChange?.(index);
  };

  return (
    <nav
      className={cn(
        "relative inline-flex items-center h-16 w-full bg-card text-foreground border  shadow-lg md:w-120",
        className
      )}
    >
      {items.map(({ id, icon, label, href }, index) => {
        const active = isActive({ href });

        return (
          <Link
            key={id}
            to={href}
            className={cn(
              "relative z-20 flex flex-1 h-full cursor-pointer items-center justify-center p-2",
              iconContainerClassName
            )}
            onClick={() => handleItemClick(index)}
            aria-label={label}
          >
            <div className="flex flex-col items-center justify-center">
              <p>
                {cloneElement(icon, {
                  className: cn(
                    "w-5 h-5 transition-opacity duration-100 ease-in-out",
                    active ? "text-primary" : "text-muted-foreground",
                    icon.props?.className || "",
                    iconClassName || ""
                  ),
                })}
              </p>

              <p
                className={cn(
                  "text-xs mt-1",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {label}
              </p>
            </div>
          </Link>
        );
      })}
    </nav>
  );
};
