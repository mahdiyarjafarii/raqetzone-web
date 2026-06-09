import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StarIcon, SendIcon, Trash2Icon, MessageSquareIcon } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/apiClient";
import useAuth from "@/auth/useAuth";

const BASE = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:3000";

function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran", year: "numeric", month: "long", day: "numeric" });
  } catch { return ""; }
}

// ── Star input ────────────────────────────────────────────────────────────────

function StarInput({ value, onChange, size = "w-7 h-7" }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
        >
          <StarIcon className={cn(size, "transition-colors",
            n <= (hovered || value)
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted-foreground/30"
          )} />
        </button>
      ))}
    </div>
  );
}

// ── Static stars ──────────────────────────────────────────────────────────────

function Stars({ value, size = "w-3.5 h-3.5" }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <StarIcon key={n} className={cn(size,
          n <= value ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/20"
        )} />
      ))}
    </div>
  );
}

// ── Review card ───────────────────────────────────────────────────────────────

function ReviewCard({ review, currentUserId, onDelete }) {
  const initial = review.user?.name?.[0]?.toUpperCase() ?? "?";
  const avatar = review.user?.image
    ? (review.user.image.startsWith("http") ? review.user.image : `${BASE}/${review.user.image.replace(/^\/+/, "")}`)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {avatar
              ? <img src={avatar} alt="" className="w-full h-full object-cover" />
              : <span className="text-sm font-bold text-primary">{initial}</span>
            }
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">{review.user?.name ?? "کاربر"}</p>
            <p className="text-[10px] text-muted-foreground">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Stars value={review.rating} />
          {review.userId === currentUserId && (
            <button onClick={() => onDelete(review.id)} className="p-1 rounded-lg hover:bg-destructive/10 transition-colors">
              <Trash2Icon className="w-3.5 h-3.5 text-destructive/60" />
            </button>
          )}
        </div>
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-sm text-foreground leading-relaxed">{review.comment}</p>
      )}

      {/* Owner reply */}
      {review.ownerReply && (
        <div className="bg-primary/5 border border-primary/15 rounded-xl px-3 py-2.5 space-y-1">
          <p className="text-[10px] font-semibold text-primary flex items-center gap-1">
            <MessageSquareIcon className="w-3 h-3" />
            پاسخ مدیریت
          </p>
          <p className="text-xs text-foreground leading-relaxed">{review.ownerReply}</p>
        </div>
      )}
    </motion.div>
  );
}

// ── Write review form ─────────────────────────────────────────────────────────

function WriteReview({ clubId, existingReview, onSubmit }) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return toast.error("لطفاً امتیاز بدید");
    setSaving(true);
    const { ok, data } = await apiClient.post(`/clubs/${clubId}/reviews`, { rating, comment });
    setSaving(false);
    if (!ok) return toast.error(data?.message ?? "خطا در ثبت نظر");
    toast.success(existingReview ? "نظر ویرایش شد" : "نظر ثبت شد ✅");
    setOpen(false);
    onSubmit();
  };

  return (
    <div className="bg-muted/40 border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-foreground"
      >
        <span>{existingReview ? "ویرایش نظر شما" : "نظر و امتیاز بدید"}</span>
        <StarIcon className="w-4 h-4 fill-amber-400 text-amber-400" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">امتیاز:</span>
                <StarInput value={rating} onChange={setRating} />
              </div>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder="نظرتون رو بنویسید (اختیاری)..."
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none transition-colors"
              />
              <button
                onClick={handleSubmit}
                disabled={!rating || saving}
                className={cn(
                  "w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                  rating && !saving
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <SendIcon className="w-4 h-4" />
                {saving ? "در حال ثبت..." : "ثبت نظر"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Average stars display ─────────────────────────────────────────────────────

function RatingSummary({ average, total }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-3xl font-black text-foreground">{average || "—"}</div>
      <div>
        <Stars value={Math.round(average)} size="w-4 h-4" />
        <p className="text-xs text-muted-foreground mt-0.5">{total} نظر</p>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ClubReviews({ clubId, onStatsLoad }) {
  const { currentUser } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ average: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await apiClient.get(`/public/clubs/${clubId}/reviews`);
    if (ok) {
      setReviews(data.reviews ?? []);
      const s = data.stats ?? { average: 0, total: 0 };
      setStats(s);
      onStatsLoad?.(s);
    }
    setLoading(false);
  }, [clubId]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id) => {
    const { ok } = await apiClient.delete(`/reviews/${id}`);
    if (ok) { toast.success("نظر حذف شد"); fetch(); }
    else toast.error("خطا در حذف");
  };

  const myReview = reviews.find(r => r.user?.id === currentUser?.id);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-foreground text-base">نظرات</h2>
        {!loading && <RatingSummary average={stats.average} total={stats.total} />}
      </div>

      {/* Write / edit review */}
      {currentUser && (
        <WriteReview clubId={clubId} existingReview={myReview} onSubmit={fetch} />
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-muted/40 rounded-2xl p-6 text-center text-muted-foreground text-sm">
          <StarIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          اولین نفری باشید که نظر می‌دید!
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <ReviewCard
              key={r.id}
              review={r}
              currentUserId={currentUser?.id}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
