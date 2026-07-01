import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SearchIcon, PhoneIcon, GraduationCapIcon,
  BadgeCheckIcon,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import ErrorState from "@/components/ui/ErrorState";
import Pagination from "@/components/ui/Pagination";
import { cn, getUserFullName } from "@/lib/utils";

const DEFAULT_LIMIT = 20;
const API_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:3000";

function buildUserImageUrl(image) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  if (image.startsWith("/uploads/")) return `${API_BASE}${image}`;
  if (image.startsWith("uploads/")) return `${API_BASE}/${image}`;
  if (image.startsWith("user/")) return `${API_BASE}/uploads/${image}`;
  return `${API_BASE}/uploads/user/${image}`;
}

// ─── Verification badge ─────────────────────────────────────────────────────────

const VERIFICATION = {
  true:        { label: "تأیید شده",   className: "bg-emerald-500/10 text-emerald-600" },
  "semi-true": { label: "نیمه‌تأیید",  className: "bg-amber-500/10 text-amber-600" },
  none:        { label: "تأیید نشده",  className: "bg-muted text-muted-foreground" },
};

function VerificationBadge({ status }) {
  const v = VERIFICATION[status] ?? VERIFICATION.none;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", v.className)}>
      <BadgeCheckIcon className="w-2.5 h-2.5" />
      {v.label}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ coach }) {
  const src = buildUserImageUrl(coach.image);
  const fullName = getUserFullName(coach);
  const initials = (fullName || coach.phone || "?")[0]?.toUpperCase() ?? "?";
  return (
    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
      {src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextSibling.style.display = "inline";
          }}
        />
      ) : null}
      <span className="text-primary font-bold text-sm" style={{ display: src ? "none" : "inline" }}>{initials}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CoachesPage() {
  const [coaches, setCoaches]     = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0 });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [search, setSearch]       = useState("");

  const fetchPage = async ({ page = 1, limit = DEFAULT_LIMIT } = {}) => {
    setLoading(true);
    setError(false);
    const { ok, data } = await apiClient.get("/club-panel/coaches", { page, limit });
    if (ok) {
      setCoaches(data.coaches);
      setPagination(data.pagination ?? { page, limit, total: data.coaches.length, totalPages: 1 });
    } else {
      setError(true);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPage(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (newPage) => {
    setPagination(p => ({ ...p, page: newPage }));
    fetchPage({ page: newPage, limit: pagination.limit });
  };

  const handleLimitChange = (newLimit) => {
    setPagination(p => ({ ...p, limit: newLimit, page: 1 }));
    fetchPage({ page: 1, limit: newLimit });
  };

  const filtered = coaches.filter(c => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const fullName = getUserFullName(c);
    return (
      fullName.toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q)
    );
  });

  return (
    <div dir="rtl">
      <PageHeader
        title="مربی‌ها"
        description={pagination.total > 0 ? `${pagination.total} مربی ثبت‌شده در پلتفرم` : ""}
      />

      <div className="p-6 space-y-5">

        {/* search */}
        <div className="relative max-w-sm">
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="جستجو با نام یا شماره..."
            className="w-full h-9 rounded-xl border border-input bg-background pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            message="اطلاعات مربی‌ها بارگذاری نشد"
            onRetry={() => fetchPage({ page: pagination.page, limit: pagination.limit })}
          />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <GraduationCapIcon className="w-14 h-14 text-muted-foreground/25 mb-4" />
            <h3 className="font-bold text-foreground mb-1">
              {search ? "نتیجه‌ای یافت نشد" : "هنوز مربی‌ای ثبت نشده"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {search
                ? "عبارت جستجو را تغییر دهید"
                : "به محض اینکه کاربری به‌عنوان مربی ثبت شود اینجا نمایش داده می‌شود"
              }
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_auto] gap-4 px-4 py-2.5 bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span className="text-right">مربی</span>
              <span className="text-right">تخصص</span>
              <span className="text-center">شهر</span>
              <span className="text-left">وضعیت</span>
            </div>

            <div className="divide-y divide-border">
              {filtered.map((c, i) => {
                const fullName = getUserFullName(c);
                return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_1fr_auto] gap-3 sm:gap-4 items-center px-4 py-3 text-right hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar coach={c} />
                    <div className="min-w-0 text-right">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {fullName}
                      </p>
                      {c.phone && (
                        <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                          <PhoneIcon className="w-3 h-3" />
                          <span dir="ltr" className="inline-block">{c.phone}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs text-muted-foreground sm:hidden">تخصص: </span>
                    {c.headline ? (
                      <p className="text-sm text-foreground truncate flex items-center gap-1.5">
                        <GraduationCapIcon className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                        {c.headline}
                      </p>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 sm:justify-self-center sm:text-center">
                    <span className="text-xs text-muted-foreground sm:hidden">شهر: </span>
                    <p className="text-sm text-muted-foreground">{c.city || "—"}</p>
                  </div>

                  <div className="flex sm:justify-self-start sm:justify-end">
                    <VerificationBadge status={c.verificationStatus} />
                  </div>
                </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            {!loading && pagination.total > 0 && (
              <div className="px-4 py-3 border-t border-border bg-muted/20">
                <Pagination
                  page={pagination.page}
                  limit={pagination.limit}
                  total={pagination.total}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  onLimitChange={handleLimitChange}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
