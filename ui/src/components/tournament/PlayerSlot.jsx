import React from "react";
import { UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function PlayerSlot({ player, size = "md" }) {
  const sizeMap = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  if (!player) {
    return (
      <div
        className={cn(
          "rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted",
          sizeMap[size]
        )}
      >
        <UserIcon className="w-4 h-4 text-muted-foreground" />
      </div>
    );
  }

  const initials = player.name ? player.name.slice(0, 2).toUpperCase() : "?";

  return (
    <div className="flex flex-col items-center gap-1">
      <Avatar className={cn("border-2 border-border", sizeMap[size])}>
        {player.image && <AvatarImage src={player.image} alt={player.name} />}
        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>
      {player.name && (
        <span className="text-[10px] text-muted-foreground max-w-[52px] truncate text-center">
          {player.name}
        </span>
      )}
    </div>
  );
}
