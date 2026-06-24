import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSetAtom } from "jotai";
import { motion } from "framer-motion";
import {
  CheckCircleIcon, XCircleIcon, SearchIcon,
  ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon,
  CalendarIcon, ClockIcon, ShoppingBagIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import ErrorState from "@/components/ui/ErrorState";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Pagination from "@/components/ui/Pagination";
import { cn, fmt, fmtDate, getUserFullName } from "@/lib/utils";
import {
  setLastSeenBookingAt,
  unseenBookingsCountAtom,
} from "@/store/bookingStore";

const ADMIN_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:3000";
const BOOKING_POLL_INTERVAL_MS = 60_000;
const DEFAULT_LIMIT = 20;

function buildUserImageUrl(image) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  if (image.startsWith("/uploads/")) return `${ADMIN_BASE}${image}`;
  if (image.startsWith("uploads/")) return `${ADMIN_BASE}/${image}`;
  if (image.startsWith("user/")) return `${ADMIN_BASE}/uploads/${image}`;
  return `${ADMIN_BASE}/uploads/user/${image}`;
}

function UserAvatar({ image, name }) {
  const src = buildUserImageUrl(image);
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-border">
      {src ? (
        <img
          src={src}
          alt={name ?? ""}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextSibling.style.display = "flex";
          }}
        />
      ) : null}
      <div
        className="w-full h-full bg-gradient-to-br from-violet-600 to-indigo-500 text-white text-xs font-bold items-center justify-center"
        style={{ display: src ? "none" : "flex" }}
      >
        {name?.[0]?.toUpperCase() ?? ""}
      </div>
    </div>
  );
}

const STATUS_BADGE = {
  pending:   { variant: "warning",     label: "در انتظار" },
  approved:  { variant: "success",     label: "تأیید شده" },
  rejected:  { variant: "destructive", label: "رد شده"    },
  cancelled: { variant: "muted",       label: "لغو شده"   },
};

const FILTERS = [
  { value: "",          label: "همه"        },
  { value: "pending",   label: "در انتظار" },
  { value: "approved",  label: "تأیید شده" },
  { value: "rejected",  label: "رد شده"    },
];

function SortButton({ dir, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
    >
      تاریخ ثبت
      {dir === "desc" ? (
        <ArrowDownIcon className="w-3 h-3 text-primary" />
      ) : dir === "asc" ? (
        <ArrowUpIcon className="w-3 h-3 text-primary" />
      ) : (
        <ArrowUpDownIcon className="w-3 h-3" />
      )}
    </button>
  );
}

export default function BookingsPage() {
  const [bookings, setBookings]   = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0 });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [filter, setFilter]       = useState("");
  const [search, setSearch]       = useState("");
  const [sortDir, setSortDir]     = useState("desc");
  const [actionModal, setActionModal] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [acting, setActing]       = useState(false);
  const pollRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const setUnseenBookingsCount = useSetAtom(unseenBookingsCountAtom);

  const fetchPage = useCallback(async ({
    page    = pagination.page,
    limit   = pagination.limit,
    status  = filter,
    sort    = sortDir,
    showLoading = true,
  } = {}) => {
    if (showLoading) { setLoading(true); setError(false); }

    const params = { page, limit, sortDir: sort };
    if (status) params.status = status;

    const { ok, data } = await apiClient.get("/club-panel/bookings", params);
    if (ok) {
      const rows = Array.isArray(data?.bookings) ? data.bookings : [];
      setBookings(rows);
      setPagination(data.pagination ?? { page, limit, total: rows.length, totalPages: 1 });
      setUnseenBookingsCount(0);
      if (rows.length > 0 && page === 1) setLastSeenBookingAt(rows[0]?.createdAt);
    } else if (showLoading) {
      setError(true);
    }
    if (showLoading) setLoading(false);
  }, [filter, pagination.page, pagination.limit, sortDir, setUnseenBookingsCount]);

  // Initial load
  useEffect(() => {
    fetchPage({ page: 1 });
  }, [filter, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling (silent)
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchPage({ showLoading: false });
    }, BOOKING_POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchPage]);

  const handleFilterChange = (value) => {
    setFilter(value);
    setPagination(p => ({ ...p, page: 1 }));
  };

  const handleSortToggle = () => {
    setSortDir(d => d === "desc" ? "asc" : "desc");
    setPagination(p => ({ ...p, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(p => ({ ...p, page: newPage }));
    fetchPage({ page: newPage });
  };

  const handleLimitChange = (newLimit) => {
    setPagination(p => ({ ...p, limit: newLimit, page: 1 }));
    fetchPage({ page: 1, limit: newLimit });
  };

  const handleAction = async () => {
    if (!actionModal) return;
    setActing(true);
    const ep = `/club-panel/bookings/${actionModal.id}/${actionModal.action}`;
    const { ok, data } = await apiClient.patch(ep, { adminNote: adminNote || undefined });
    setActing(false);
    if (!ok) return toast.error(data?.message ?? "خطا");
    toast.success(actionModal.action === "approve" ? "رزرو تأیید شد ✅" : "رزرو رد شد");
    setActionModal(null);
    setAdminNote("");
    fetchPage({ showLoading: false });
  };

  // Client-side search filter (within current page)
  const filtered = search.trim()
    ? bookings.filter((b) => {
        const q = search.trim();
        const fullName = getUserFullName(b.user);
        return fullName.includes(q) || b.user?.phone?.includes(q) || b.court?.name?.includes(q);
      })
    : bookings;

  return (
    <div dir="rtl">
      <PageHeader
        title="مدیریت رزروها"
        description={pagination.total > 0 ? `${pagination.total} رزرو` : ""}
      />

      <div className="p-3 sm:p-6 space-y-4">
        {/* Filters & search */}
        <div className="flex flex-col gap-3">
          <div className="relative w-full sm:w-64">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="جستجو کاربر یا زمین..."
              className="h-9 rounded-xl border border-border bg-card pr-9 pl-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => handleFilterChange(f.value)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap",
                  filter === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-muted-foreground">کاربر</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-muted-foreground">زمین</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-muted-foreground">تاریخ</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-muted-foreground">ساعت</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-muted-foreground">مبلغ</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-muted-foreground">وضعیت</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-muted-foreground">
                    <SortButton dir={sortDir} onClick={handleSortToggle} />
                  </th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-muted-foreground">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className={cn("h-4 bg-muted rounded-lg animate-pulse", j === 0 ? "w-32" : "w-20")} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={8}>
                      <ErrorState
                        message="رزروها بارگذاری نشدند"
                        onRetry={() => fetchPage({ page: 1 })}
                      />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <CalendarIcon className="w-10 h-10 opacity-20" />
                        <span className="text-sm">رزروی یافت نشد</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((b, i) => {
                    const fullName = getUserFullName(b.user);
                    const sb = STATUS_BADGE[b.status] ?? STATUS_BADGE.pending;
                    const registeredAt = b.createdAt
                      ? new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(b.createdAt))
                      : "—";
                    return (
                      <motion.tr
                        key={b.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.015 }}
                        className="border-b border-border last:border-0 hover:bg-muted/25 transition-colors group"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar image={b.user?.image} name={fullName} />
                            <div>
                              <div className="font-medium text-foreground text-sm">{fullName}</div>
                              <div className="text-xs text-muted-foreground" dir="ltr">{b.user?.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-foreground text-sm">{b.court?.name}</div>
                          <div className="text-xs text-muted-foreground">{b.court?.location}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-sm text-foreground">
                            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            {fmtDate(b.date)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground" dir="ltr">
                            <ClockIcon className="w-3.5 h-3.5 shrink-0" />
                            {b.startTime}–{b.endTime}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {b.basePrice != null && b.basePrice > b.totalPrice ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-muted-foreground line-through">{fmt(b.basePrice)} ت</span>
                              <span className="font-semibold text-emerald-600 text-sm">{fmt(b.totalPrice)} ت</span>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {b.slotDiscountPercent > 0 && (
                                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 text-[10px] font-bold">
                                    ٪{b.slotDiscountPercent} تخفیف
                                  </span>
                                )}
                                {b.discountCode && (
                                  <span className="inline-flex items-center rounded-full bg-violet-500/10 text-violet-600 px-1.5 py-0.5 text-[10px] font-bold">
                                    کد {b.discountCode}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="font-semibold text-foreground text-sm">{fmt(b.totalPrice)} ت</span>
                          )}
                          {b.assets?.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              {b.assets.map((a) => (
                                <div key={a.assetId} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <ShoppingBagIcon className="w-3 h-3 shrink-0 text-amber-500" />
                                  <span>{a.name} ×{a.quantity}</span>
                                  <span className="text-amber-600 font-semibold mr-auto">{fmt(a.totalPrice)} ت</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant={sb.variant}>{sb.label}</Badge>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                          {registeredAt}
                        </td>
                        <td className="px-4 py-3.5">
                          {b.status === "pending" && (
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => { setActionModal({ id: b.id, action: "approve" }); setAdminNote(""); }}
                                className="gap-1 text-xs"
                              >
                                <CheckCircleIcon className="w-3.5 h-3.5" /> تأیید
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => { setActionModal({ id: b.id, action: "reject" }); setAdminNote(""); }}
                                className="gap-1 text-xs"
                              >
                                <XCircleIcon className="w-3.5 h-3.5" /> رد
                              </Button>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
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
      </div>

      {/* Confirm modal */}
      <Modal
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        title={actionModal?.action === "approve" ? "تأیید رزرو" : "رد رزرو"}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {actionModal?.action === "approve"
              ? "این رزرو تأیید می‌شود و کاربر اطلاع‌رسانی می‌گیرد."
              : "این رزرو رد می‌شود. دلیل رد را وارد کنید (اختیاری)."}
          </p>
          <Input
            label="یادداشت مدیر (اختیاری)"
            value={adminNote}
            onChange={e => setAdminNote(e.target.value)}
            placeholder="..."
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setActionModal(null)} className="flex-1">انصراف</Button>
            <Button
              variant={actionModal?.action === "approve" ? "default" : "destructive"}
              onClick={handleAction}
              disabled={acting}
              className="flex-1"
            >
              {acting ? "در حال ثبت..." : actionModal?.action === "approve" ? "تأیید" : "رد کردن"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
