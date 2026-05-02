import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PlusIcon, TrophyIcon, MapPinIcon, CalendarIcon, UsersIcon } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { fmtDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_BADGE = {
  open:      { v:"success",     l:"باز"        },
  full:      { v:"destructive", l:"پر شد"      },
  cancelled: { v:"muted",       l:"لغو شده"    },
  completed: { v:"default",     l:"پایان یافت" },
};

const SPORT_ICONS = { padel:"🏓", tennis:"🎾", squash:"🟡", badminton:"🏸" };
const SPORTS = ["padel","tennis","squash","badminton","ping-pong"];
const emptyForm = { title:"", sportType:"padel", location:"", courtName:"", scheduledAt:"", teamSize:"2" };

export default function TournamentsPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]       = useState(false);
  const [form, setForm]       = useState(emptyForm);
  const [saving, setSaving]   = useState(false);

  const fetch = async () => {
    setLoading(true);
    const { ok, data } = await apiClient.get("/admin/matches");
    if (ok) setMatches(data.matches);
    setLoading(false);
  };
  useEffect(() => { fetch(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.location || !form.scheduledAt) return toast.error("فیلدهای الزامی را پر کنید");
    setSaving(true);
    const { ok, data } = await apiClient.post("/matches", { ...form, teamSize: parseInt(form.teamSize) });
    setSaving(false);
    if (!ok) return toast.error(data?.message ?? "خطا");
    toast.success("مسابقه ایجاد شد 🏆");
    setOpen(false); setForm(emptyForm);
    fetch();
  };

  return (
    <div dir="rtl">
      <PageHeader
        title="مدیریت تورنومنت‌ها"
        description={`${matches.length} مسابقه`}
        actions={<Button onClick={() => setOpen(true)}><PlusIcon className="w-4 h-4" />مسابقه جدید</Button>}
      />

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({length:6}).map((_,i) => <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />)
        ) : matches.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <TrophyIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">مسابقه‌ای وجود ندارد</p>
          </div>
        ) : (
          matches.map((m, i) => {
            const sb = STATUS_BADGE[m.status] ?? STATUS_BADGE.open;
            return (
              <motion.div
                key={m.id}
                initial={{opacity:0, y:12}}
                animate={{opacity:1, y:0}}
                transition={{delay:i*0.04}}
                className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className={cn(
                  "h-2",
                  m.sportType==="padel" && "bg-emerald-500",
                  m.sportType==="tennis" && "bg-yellow-500",
                  m.sportType==="squash" && "bg-red-500",
                  m.sportType==="badminton" && "bg-blue-500",
                )} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{SPORT_ICONS[m.sportType] ?? "🏅"}</span>
                      <div>
                        <p className="font-bold text-foreground text-sm">{m.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{m.sportType}</p>
                      </div>
                    </div>
                    <Badge variant={sb.v}>{sb.l}</Badge>
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" />{new Date(m.scheduledAt).toLocaleDateString("fa-IR", {weekday:"short", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"})}</div>
                    <div className="flex items-center gap-1.5"><MapPinIcon className="w-3.5 h-3.5" />{m.courtName ?? m.location}</div>
                    <div className="flex items-center gap-1.5"><UsersIcon className="w-3.5 h-3.5" />تیم {m.teamSize} نفره</div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="ایجاد مسابقه جدید" size="md">
        <form onSubmit={handleCreate} className="space-y-3">
          <Input label="عنوان مسابقه" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} required />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">نوع ورزش</label>
              <select value={form.sportType} onChange={e=>setForm(p=>({...p,sportType:e.target.value}))} className="h-9 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none">
                {SPORTS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">اندازه تیم</label>
              <select value={form.teamSize} onChange={e=>setForm(p=>({...p,teamSize:e.target.value}))} className="h-9 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none">
                {[1,2,3,4].map(n=><option key={n} value={n}>{n} نفر</option>)}
              </select>
            </div>
          </div>
          <Input label="مکان" value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} required />
          <Input label="نام زمین (اختیاری)" value={form.courtName} onChange={e=>setForm(p=>({...p,courtName:e.target.value}))} />
          <Input label="زمان مسابقه" type="datetime-local" value={form.scheduledAt} onChange={e=>setForm(p=>({...p,scheduledAt:e.target.value}))} required />
          <Button type="submit" disabled={saving} className="w-full">{saving ? "در حال ایجاد..." : "ایجاد مسابقه 🏆"}</Button>
        </form>
      </Modal>
    </div>
  );
}
