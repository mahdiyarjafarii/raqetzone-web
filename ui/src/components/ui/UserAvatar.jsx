import React from "react";
import { cn } from "@/lib/utils";

function buildImageUrl(image) {
  if (!image) return null;
  if (image.startsWith("http")) return encodeURI(image);
  const encodedImage = image.split("/").map(encodeURIComponent).join("/");
  return `${import.meta.env.VITE_WEBSITE_URL}/uploads/user/${encodedImage}`;
}

export default function UserAvatar({ image, name, className, fallbackClassName, isCoach }) {
  const src = buildImageUrl(image);

  const inner = src ? (
    <>
      <img
        src={src}
        alt={name ?? ""}
        onError={(e) => {
          e.currentTarget.style.display = "none";
          e.currentTarget.nextSibling.style.display = "flex";
        }}
        className={cn("object-cover shrink-0 w-full h-full", isCoach ? "" : className)}
      />
      <div
        style={{ display: "none" }}
        className={cn("flex items-center justify-center font-bold shrink-0 w-full h-full", fallbackClassName ?? (isCoach ? "" : className))}
      >
        {name?.[0]?.toUpperCase() ?? "?"}
      </div>
    </>
  ) : (
    <div className={cn("flex items-center justify-center font-bold shrink-0 w-full h-full", fallbackClassName ?? (isCoach ? "" : className))}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );

  if (isCoach) {
    return (
      <div
        className={cn(
          "shrink-0 rounded-full p-[2.5px]",
          "bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500",
          "shadow-[0_0_8px_rgba(251,191,36,0.5)]",
          className
        )}
      >
        <div className="w-full h-full rounded-full overflow-hidden bg-muted">
          {inner}
        </div>
      </div>
    );
  }

  return src ? (
    <>
      <img
        src={src}
        alt={name ?? ""}
        onError={(e) => {
          e.currentTarget.style.display = "none";
          e.currentTarget.nextSibling.style.display = "flex";
        }}
        className={cn("object-cover shrink-0", className)}
      />
      <div
        style={{ display: "none" }}
        className={cn("flex items-center justify-center font-bold shrink-0", fallbackClassName ?? className)}
      >
        {name?.[0]?.toUpperCase() ?? "?"}
      </div>
    </>
  ) : (
    <div className={cn("flex items-center justify-center font-bold shrink-0", fallbackClassName ?? className)}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
