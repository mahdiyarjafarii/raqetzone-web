import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { StarIcon, MessageSquareIcon, SendIcon, Trash2Icon } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:3000";

function Stars({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <StarIcon key={n} className={cn("w-3.5 h-3.5",
          n <= value ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/20"
        )} />
      ))}
    </div>
  );
}

function formatDate(d) {
  try { return new Date(d).toLocaleDateString("fa-IR", { year:"numeric", month:"long", day:"numeric" }); }
  catch { return ""; }
}

function ReplyForm({ review, onSave }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(review.ownerReply ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { ok } = await apiClient.post(`/club-panel/reviews/${review.id}/reply`, { reply: text });
    setSaving(false);
    if (!ok) return toast.error("خطا در ذخیره پاسخ");
    toast.success("پاسخ ذخیره شد");
    setOpen(false);
    onSave();
  };

  const handleDelete = async () => {
    setSaving(true);
    await apiClient.post(`/club-panel/reviews/${review.id}/reply`, { reply: null });
    setSaving(false);
    toast.success("پاسخ حذف شد");
    onSave();
  };

  return (
    <div className="mt-3">
      {review.ownerReply && !open && (
        <div className="bg-primary/5 border border-primary/15 rounded-xl px-3 py-2.5 flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold text-primary mb-1">پاسخ شما</p>
            <p className="text-xs text-foreground">{review.ownerReply}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => setOpen(true)} className="text-[10px] text-primary underline">ویرایش</button>
            <button onClick={handleDelete} className="p-1 hover:bg-destructive/10 rounded">
              <Trash2Icon className="w-3 h-3 text-destructive/60" />
            </button>
          </div>
        </div>
      )}

      {!review.ownerReply && !open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs text-primary font-medium"
        >
          <MessageSquareIcon className="w-3.5 h-3.5" />
          پاسخ دادن
        </button>
      )}

      {open && (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={2}
            placeholder="پاسخ شما..."
            className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !text.trim()}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
            >
              <SendIcon className="w-3 h-3" />
              {saving ? "ذخیره..." : "ذخیره"}
            </button>
            <button onClick={() => { setOpen(false); setText(review.ownerReply ?? ""); }}
              className="h-8 px-3 rounded-lg border border-border text-xs text-muted-foreground">
              انصراف
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ average: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient.get("/club-panel/clubs").then(({ ok, data }) => {
      if (ok) { setClubs(data.clubs ?? []); if (data.clubs?.length) setSelectedClub(data.clubs[0]); }
    });
  }, []);

  const fetchReviews = async (clubId) => {
    setLoading(true);
    const { ok, data } = await apiClient.get(`/public/clubs/${clubId}/reviews`);
    if (ok) { setReviews(data.reviews ?? []); setStats(data.stats ?? { average: 0, total: 0 }); }
    setLoading(false);
  };

  useEffect(() => { if (selectedClub) fetchReviews(selectedClub.id); }, [selectedClub]);

  return (
    <div dir="rtl">
      <PageHeader
        title="نظرات کاربران"
        description={selectedClub ? `${stats.total} نظر — میانگین ${stats.average} از ۵` : ""}
      />

      <div className="p-6 space-y-5">
        {/* Club selector */}
        {clubs.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {clubs.map(c => (
              <button key={c.id} onClick={() => setSelectedClub(c)}
                className={cn("px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
                  selectedClub?.id === c.id ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary"
                )}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Stats bar */}
        {!loading && stats.total > 0 && (
          <div className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4">
            <div className="text-4xl font-black text-foreground">{stats.average}</div>
            <div>
              <div className="flex gap-0.5 mb-1">
                {[1,2,3,4,5].map(n => (
                  <StarIcon key={n} className={cn("w-5 h-5",
                    n <= Math.round(stats.average) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/20"
                  )} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">بر اساس {stats.total} نظر</p>
            </div>
          </div>
        )}

        {/* Reviews */}
        {loading ? (
          Array.from({length:3}).map((_,i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
          ))
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <StarIcon className="w-12 h-12 mb-3 text-muted-foreground/20" />
            <p>هنوز نظری ثبت نشده</p>
          </div>
        ) : (
          reviews.map((r, i) => (
            <motion.div key={r.id} initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} transition={{delay:i*0.04}}
              className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {r.user?.image
                      ? <img src={r.user.image.startsWith("http") ? r.user.image : `${BASE}/uploads/user/${r.user.image}`} alt="" className="w-full h-full object-cover" />
                      : <span className="text-sm font-bold text-primary">{r.user?.name?.[0]?.toUpperCase() ?? "?"}</span>
                    }
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{r.user?.name ?? "کاربر"}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(r.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} />
                  <Badge variant={r.ownerReply ? "success" : "muted"}>
                    {r.ownerReply ? "پاسخ داده شده" : "بی‌پاسخ"}
                  </Badge>
                </div>
              </div>
              {r.comment && <p className="text-sm text-foreground leading-relaxed mb-2">{r.comment}</p>}
              <ReplyForm review={r} onSave={() => fetchReviews(selectedClub.id)} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
