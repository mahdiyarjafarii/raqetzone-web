import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PlusIcon, PencilIcon, TrashIcon, Building2Icon,
  MapPinIcon, PhoneIcon, ClockIcon, ChevronRightIcon,
  ToggleLeftIcon, ToggleRightIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

const SPORTS = ["padel","tennis","squash","badminton","ping-pong"];
const AMENITIES = ["parking","locker","shower","cafe","wifi","lighting","shop","coaching","firstaid","ac"];
const AMENITY_LABELS = { parking:"پارکینگ", locker:"رختکن", shower:"دوش", cafe:"کافه", wifi:"وای‌فای", lighting:"روشنایی", shop:"فروشگاه", coaching:"کوچینگ", firstaid:"کمک‌های اولیه", ac:"تهویه" };
const SPORT_LABELS   = { padel:"پادل", tennis:"تنیس", squash:"اسکواش", badminton:"بدمینتون", "ping-pong":"پینگ‌پنگ" };

const emptyClub = {
  name: "", description: "", address: "", phone: "",
  sportTypes: [], amenities: [],
  openTime: "07:00", closeTime: "23:00",
};

function MultiCheck({ label, options, labelMap, value, onChange }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o} type="button" onClick={() => toggle(o)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
              value.includes(o)
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            )}>
            {labelMap[o] ?? o}
          </button>
        ))}
      </div>
    </div>
  );
}

function ClubForm({ form, setForm, onSubmit, loading, submitLabel }) {
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="نام باشگاه *" value={form.name} onChange={e => f("name", e.target.value)} required />
        <Input label="شماره تماس" type="tel" value={form.phone} onChange={e => f("phone", e.target.value)} dir="ltr" />
      </div>
      <Input label="آدرس کامل *" value={form.address} onChange={e => f("address", e.target.value)} required />
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">توضیحات</label>
        <textarea
          value={form.description}
          onChange={e => f("description", e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="ساعت باز شدن" type="time" value={form.openTime} onChange={e => f("openTime", e.target.value)} />
        <Input label="ساعت بستن" type="time" value={form.closeTime} onChange={e => f("closeTime", e.target.value)} />
      </div>
      <MultiCheck
        label="ورزش‌های ارائه شده"
        options={SPORTS}
        labelMap={SPORT_LABELS}
        value={form.sportTypes}
        onChange={v => f("sportTypes", v)}
      />
      <MultiCheck
        label="امکانات"
        options={AMENITIES}
        labelMap={AMENITY_LABELS}
        value={form.amenities}
        onChange={v => f("amenities", v)}
      />
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "در حال ذخیره..." : submitLabel}
      </Button>
    </form>
  );
}

function ClubCard({ club, index, onEdit, onDelete, onToggle, onManage }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2Icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">{club.name}</h3>
              <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
                <MapPinIcon className="w-3 h-3" />
                <span>{club.address}</span>
              </div>
            </div>
          </div>
          <Badge variant={club.isActive ? "success" : "muted"}>
            {club.isActive ? "فعال" : "غیرفعال"}
          </Badge>
        </div>

        {club.description && (
          <p className="text-muted-foreground text-sm mt-3 leading-relaxed line-clamp-2">{club.description}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          {club.phone && (
            <span className="flex items-center gap-1">
              <PhoneIcon className="w-3 h-3" />
              <span dir="ltr">{club.phone}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {club.openTime}–{club.closeTime}
          </span>
          <span className="font-semibold text-foreground">{club.courtCount ?? 0} زمین</span>
        </div>
      </div>

      {/* Sport + amenity chips */}
      {(club.sportTypes?.length > 0 || club.amenities?.length > 0) && (
        <div className="px-5 py-3 flex flex-wrap gap-1.5 border-b border-border bg-muted/20">
          {club.sportTypes?.map(s => (
            <span key={s} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {SPORT_LABELS[s] ?? s}
            </span>
          ))}
          {club.amenities?.map(a => (
            <span key={a} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {AMENITY_LABELS[a] ?? a}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="px-5 py-3 flex items-center gap-2">
        <Button size="sm" onClick={() => onManage(club)} className="flex-1 gap-1">
          <ChevronRightIcon className="w-3.5 h-3.5" />
          مدیریت زمین‌ها
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(club)}>
          <PencilIcon className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onToggle(club)}>
          {club.isActive
            ? <ToggleRightIcon className="w-4 h-4 text-emerald-500" />
            : <ToggleLeftIcon className="w-4 h-4 text-muted-foreground" />
          }
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onDelete(club.id)}>
          <TrashIcon className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

export default function ClubsPage() {
  const navigate = useNavigate();
  const [clubs, setClubs]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]         = useState(emptyClub);
  const [saving, setSaving]     = useState(false);

  const fetch = async () => {
    setLoading(true);
    const { ok, data } = await apiClient.get("/club-panel/clubs");
    if (ok) setClubs(data.clubs);
    else toast.error("خطا در بارگذاری باشگاه‌ها");
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { ok, data } = await apiClient.post("/club-panel/clubs", form);
    setSaving(false);
    if (!ok) return toast.error(data?.message ?? "خطا");
    toast.success("باشگاه ایجاد شد ✅");
    setCreateOpen(false);
    setForm(emptyClub);
    fetch();
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { ok, data } = await apiClient.patch(`/club-panel/clubs/${editTarget.id}`, form);
    setSaving(false);
    if (!ok) return toast.error(data?.message ?? "خطا");
    toast.success("باشگاه ویرایش شد ✅");
    setEditTarget(null);
    fetch();
  };

  const handleDelete = async (id) => {
    if (!confirm("آیا مطمئن هستید؟ تمام زمین‌های این باشگاه نیز حذف می‌شوند.")) return;
    const { ok } = await apiClient.delete(`/club-panel/clubs/${id}`);
    if (ok) { toast.success("باشگاه حذف شد"); fetch(); }
    else toast.error("خطا در حذف باشگاه");
  };

  const handleToggle = async (club) => {
    await apiClient.patch(`/club-panel/clubs/${club.id}`, { isActive: !club.isActive });
    toast.success(club.isActive ? "غیرفعال شد" : "فعال شد");
    fetch();
  };

  const openEdit = (club) => {
    setEditTarget(club);
    setForm({
      name: club.name,
      description: club.description ?? "",
      address: club.address,
      phone: club.phone ?? "",
      sportTypes: club.sportTypes ?? [],
      amenities: club.amenities ?? [],
      openTime: club.openTime,
      closeTime: club.closeTime,
    });
  };

  if (loading) {
    return (
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-56 rounded-2xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <div dir="rtl">
      <PageHeader
        title="باشگاه‌هایم"
        description={`${clubs.length} باشگاه ثبت شده`}
        actions={
          <Button onClick={() => { setForm(emptyClub); setCreateOpen(true); }}>
            <PlusIcon className="w-4 h-4" />
            ثبت باشگاه جدید
          </Button>
        }
      />

      <div className="p-6">
        {clubs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Building2Icon className="w-16 h-16 text-muted-foreground/30 mb-5" />
            <h3 className="font-bold text-foreground text-lg mb-2">هنوز باشگاهی ثبت نکرده‌اید</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              اولین باشگاه ورزشی خود را ثبت کنید و مدیریت زمین‌ها و رزروها را شروع کنید.
            </p>
            <Button onClick={() => { setForm(emptyClub); setCreateOpen(true); }}>
              <PlusIcon className="w-4 h-4" />
              ثبت اولین باشگاه
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {clubs.map((club, i) => (
              <ClubCard
                key={club.id}
                club={club}
                index={i}
                onEdit={openEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
                onManage={(c) => navigate(`/clubs/${c.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="ثبت باشگاه جدید" size="lg">
        <ClubForm form={form} setForm={setForm} onSubmit={handleCreate} loading={saving} submitLabel="ثبت باشگاه" />
      </Modal>
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="ویرایش باشگاه" size="lg">
        <ClubForm form={form} setForm={setForm} onSubmit={handleEdit} loading={saving} submitLabel="ذخیره تغییرات" />
      </Modal>
    </div>
  );
}
