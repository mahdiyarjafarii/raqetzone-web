import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircleIcon, XCircleIcon, SearchIcon, FilterIcon } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { fmt, fmtDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

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

export default function BookingsPage() {
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("");
  const [search, setSearch]       = useState("");
  const [actionModal, setActionModal] = useState(null); // { id, action: 'approve'|'reject' }
  const [adminNote, setAdminNote] = useState("");
  const [acting, setActing]       = useState(false);

  const fetch = async (s = filter) => {
    setLoading(true);
    const { ok, data } = await apiClient.get("/admin/bookings", s ? { status: s } : {});
    if (ok) setBookings(data.bookings);
    else toast.error("خطا در بارگذاری رزروها");
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [filter]);

  const handleAction = async () => {
    if (!actionModal) return;
    setActing(true);
    const ep = `/admin/bookings/${actionModal.id}/${actionModal.action}`;
    const { ok, data } = await apiClient.patch(ep, { adminNote: adminNote || undefined });
    setActing(false);
    if (!ok) return toast.error(data?.message ?? "خطا");
    toast.success(actionModal.action === "approve" ? "رزرو تأیید شد ✅" : "رزرو رد شد");
    setActionModal(null); setAdminNote("");
    fetch();
  };

  const filtered = search
    ? bookings.filter(b =>
        b.user?.name?.includes(search) ||
        b.user?.phone?.includes(search) ||
        b.court?.name?.includes(search)
      )
    : bookings;

  return (
    <div dir="rtl">
      <PageHeader title="مدیریت رزروها" description={`${bookings.length} رزرو`} />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="جستجو کاربر یا زمین..."
              className="h-9 rounded-xl border border-border bg-card pr-9 pl-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 w-56"
            />
          </div>

          <div className="flex gap-1.5">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors",
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
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["کاربر","زمین","تاریخ","ساعت","مبلغ","وضعیت","عملیات"].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({length:6}).map((_,i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({length:7}).map((__,j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">رزروی یافت نشد</td></tr>
                ) : (
                  filtered.map((b, i) => {
                    const sb = STATUS_BADGE[b.status] ?? STATUS_BADGE.pending;
                    return (
                      <motion.tr
                        key={b.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{b.user?.name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground" dir="ltr">{b.user?.phone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{b.court?.name}</div>
                          <div className="text-xs text-muted-foreground">{b.court?.location}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{b.date}</td>
                        <td className="px-4 py-3 text-muted-foreground" dir="ltr">{b.startTime}–{b.endTime}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{fmt(b.totalPrice)} ت</td>
                        <td className="px-4 py-3"><Badge variant={sb.variant}>{sb.label}</Badge></td>
                        <td className="px-4 py-3">
                          {b.status === "pending" && (
                            <div className="flex gap-1.5">
                              <Button size="sm" onClick={() => { setActionModal({ id: b.id, action: "approve" }); setAdminNote(""); }} className="gap-1">
                                <CheckCircleIcon className="w-3.5 h-3.5" /> تأیید
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => { setActionModal({ id: b.id, action: "reject" }); setAdminNote(""); }} className="gap-1">
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
