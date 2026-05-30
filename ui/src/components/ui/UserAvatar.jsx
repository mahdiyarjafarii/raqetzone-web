import React from "react";
import { cn } from "@/lib/utils";

function buildImageUrl(image) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_WEBSITE_URL}/uploads/user/${image}`;
}

export default function UserAvatar({ image, name, className, fallbackClassName }) {
  const src = buildImageUrl(image);
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "flex"; }}
        className={cn("object-cover shrink-0", className)}
      />
    );
  }
  return (
    <div className={cn("flex items-center justify-center font-bold shrink-0", fallbackClassName ?? className)}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
