import React from "react";
import { ChevronRightIcon, ChevronLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function Pagination({ page, limit, total, totalPages, onPageChange, onLimitChange, className }) {
  if (!total || totalPages <= 0) return null;

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  // Build visible page numbers with ellipsis
  function getPages() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) pages.push(p);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  const pages = getPages();

  return (
    <div dir="rtl" className={cn("flex flex-col sm:flex-row items-center justify-between gap-3 pt-3", className)}>
      {/* Records info + per-page selector */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          نمایش {from}–{to} از {total} رکورد
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs">تعداد در صفحه:</span>
          <select
            value={limit}
            onChange={e => onLimitChange(Number(e.target.value))}
            className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {PAGE_SIZE_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Page buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* Next (RTL: visually right side) */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className={cn(
              "h-8 w-8 rounded-lg border flex items-center justify-center transition-colors",
              page <= 1
                ? "border-border text-muted-foreground/40 cursor-not-allowed"
                : "border-border text-foreground hover:bg-muted"
            )}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>

          {pages.map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="h-8 w-8 flex items-center justify-center text-xs text-muted-foreground">
                ···
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={cn(
                  "h-8 min-w-[2rem] px-2 rounded-lg border text-xs font-medium transition-colors",
                  p === page
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground hover:bg-muted"
                )}
              >
                {p}
              </button>
            )
          )}

          {/* Prev */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className={cn(
              "h-8 w-8 rounded-lg border flex items-center justify-center transition-colors",
              page >= totalPages
                ? "border-border text-muted-foreground/40 cursor-not-allowed"
                : "border-border text-foreground hover:bg-muted"
            )}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
