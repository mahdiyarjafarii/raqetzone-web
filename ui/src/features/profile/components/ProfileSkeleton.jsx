import React from "react";

export default function ProfileSkeleton() {
  return (
    <div className="space-y-4 px-4 pt-5 animate-pulse">
      {/* Header */}
      <div className="flex items-end gap-4">
        <div className="h-20 w-20 rounded-2xl bg-muted shrink-0" />
        <div className="flex-1 space-y-2 pb-1">
          <div className="h-6 bg-muted rounded-lg w-36" />
          <div className="h-4 bg-muted rounded-lg w-24" />
          <div className="h-3 bg-muted rounded-lg w-48" />
        </div>
      </div>
      {/* Level */}
      <div className="h-24 rounded-2xl bg-muted" />
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-muted" />
        ))}
      </div>
      {/* Chart */}
      <div className="h-40 rounded-2xl bg-muted" />
      {/* Matches */}
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
