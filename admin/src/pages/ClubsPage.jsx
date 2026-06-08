import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PlusIcon, PencilIcon, TrashIcon, Building2Icon,
  MapPinIcon, PhoneIcon, ClockIcon, ChevronRightIcon,
  ToggleLeftIcon, ToggleRightIcon, ImagePlusIcon, XCircleIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAtomValue } from "jotai";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import PersianTimePicker from "@/components/PersianTimePicker";
import { cn } from "@/lib/utils";
import { adminUserAtom } from "@/store/authStore";

const API_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:3000";

const SPORTS = ["padel","tennis","squash","badminton","ping-pong"];
const AMENITIES = ["parking","locker","shower","cafe","wifi","lighting","shop","coaching","firstaid","ac"];
const AMENITY_LABELS = { parking:"پارکینگ", locker:"رختکن", shower:"دوش", cafe:"کافه", wifi:"وای‌فای", lighting:"روشنایی", shop:"فروشگاه", coaching:"کوچینگ", firstaid:"کمک‌های اولیه", ac:"تهویه" };
const SPORT_LABELS   = { padel:"پدل", tennis:"تنیس", squash:"اسکواش", badminton:"بدمینتون", "ping-pong":"پینگ‌پنگ" };

const IRAN_PROVINCES = [
  "آذربایجان شرقی","آذربایجان غربی","اردبیل","اصفهان","البرز","ایلام","بوشهر","تهران",
  "چهارمحال و بختیاری","خراسان جنوبی","خراسان رضوی","خراسان شمالی","خوزستان","زنجان",
  "سمنان","سیستان و بلوچستان","فارس","قزوین","قم","کردستان","کرمان","کرمانشاه",
  "کهگیلویه و بویراحمد","گلستان","گیلان","لرستان","مازندران","مرکزی","هرمزگان","همدان","یزد",
];

const emptyClub = {
  name: "", description: "", address: "", province: "",
  sportTypes: [], amenities: [], images: [],
  openTime: "07:00", closeTime: "23:00",
};

function timeToMinutes(time) {
  const [hour, minute] = (time || "").split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function validateClubTimes({ openTime, closeTime }) {
  const openMinutes = timeToMinutes(openTime);
  const closeMinutes = timeToMinutes(closeTime);
  if (openMinutes === null || closeMinutes === null) return "ساعت شروع و پایان باشگاه را درست وارد کنید";
  if (openMinutes >= closeMinutes) return "ساعت پایان کار باشگاه باید بعد از ساعت شروع باشد";
  return null;
}

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

function ImageUploader({ images, onChange }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("image", file);
      const { ok, data } = await apiClient.post("/club-panel/upload-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (ok && data.url) uploaded.push(data.url);
      else toast.error(`خطا در آپلود ${file.name}`);
    }
    onChange([...images, ...uploaded]);
    setUploading(false);
  };

  const remove = (url) => onChange(images.filter(u => u !== url));

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">
        تصاویر باشگاه <span className="text-red-500">*</span>
        <span className="font-normal mr-1">(حداقل ۱ عکس)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {images.map(url => (
          <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border shrink-0">
            <img src={`${API_BASE}${url}`} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
            >
              <XCircleIcon className="w-4 h-4 text-white" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0"
        >
          {uploading ? (
            <span className="text-[10px] animate-pulse">آپلود...</span>
          ) : (
            <>
              <ImagePlusIcon className="w-6 h-6 mb-1" />
              <span className="text-[10px]">افزودن</span>
            </>
          )}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
}

const CREATE_STEPS = [
  { id: 1, label: "تصاویر",       desc: "عکس‌های باشگاه" },
  { id: 2, label: "اطلاعات",      desc: "نام و آدرس"     },
  { id: 3, label: "ورزش و ساعت",  desc: "نوع ورزش"       },
  { id: 4, label: "امکانات",      desc: "خدمات جانبی"    },
];

function StepIndicator({ current, steps }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
              current === s.id
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-110"
                : current > s.id
                  ? "bg-emerald-500 text-white"
                  : "bg-muted text-muted-foreground"
            )}>
              {current > s.id ? "✓" : s.id}
            </div>
            <span className={cn(
              "text-[10px] font-medium hidden sm:block",
              current === s.id ? "text-primary" : "text-muted-foreground"
            )}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              "h-0.5 flex-1 rounded-full transition-all mb-4",
              current > s.id ? "bg-emerald-400" : "bg-muted"
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function ClubForm({ form, setForm, onSubmit, loading, submitLabel, isEdit = false }) {
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const [step, setStep] = useState(1);

  const next = () => setStep(s => s + 1);
  const prev = () => setStep(s => s - 1);

  if (isEdit) {
    return (
      <form onSubmit={e => { e.preventDefault(); onSubmit(); }} className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <Input label="نام باشگاه *" value={form.name} onChange={e => f("name", e.target.value)} required />
          <Input label="آدرس کامل *" value={form.address} onChange={e => f("address", e.target.value)} required />
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">استان <span className="text-red-500">*</span></label>
            <select value={form.province ?? ""} onChange={e => f("province", e.target.value)} required
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none">
              <option value="">انتخاب استان...</option>
              {IRAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">توضیحات</label>
          <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={2}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none resize-none" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PersianTimePicker label="ساعت باز شدن" value={form.openTime} onChange={value => f("openTime", value)} />
          <PersianTimePicker label="ساعت بستن" value={form.closeTime} onChange={value => f("closeTime", value)} />
        </div>
        <MultiCheck label="ورزش‌های ارائه شده" options={SPORTS} labelMap={SPORT_LABELS} value={form.sportTypes} onChange={v => f("sportTypes", v)} />
        <MultiCheck label="امکانات" options={AMENITIES} labelMap={AMENITY_LABELS} value={form.amenities} onChange={v => f("amenities", v)} />
        <ImageUploader images={form.images ?? []} onChange={v => f("images", v)} />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "در حال ذخیره..." : submitLabel}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <StepIndicator current={step} steps={CREATE_STEPS} />

      {step === 1 && (
        <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div className="text-center pb-1">
            <p className="text-sm font-semibold text-foreground">تصاویر باشگاه</p>
            <p className="text-xs text-muted-foreground mt-0.5">عکس‌هایی که معرف فضای باشگاه شما هستند را آپلود کنید</p>
          </div>
          <ImageUploader images={form.images ?? []} onChange={v => f("images", v)} />
          {form.images?.length > 0 && (
            <p className="text-xs text-emerald-600 text-center font-medium">{form.images.length} تصویر آپلود شد ✓</p>
          )}
          <Button type="button" disabled={!form.images?.length} onClick={next} className="w-full">
            مرحله بعد ←
          </Button>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
          <div className="text-center pb-1">
            <p className="text-sm font-semibold text-foreground">اطلاعات اصلی باشگاه</p>
            <p className="text-xs text-muted-foreground mt-0.5">نام و آدرس باشگاه خود را وارد کنید</p>
          </div>
          <Input label="نام باشگاه *" value={form.name} onChange={e => f("name", e.target.value)} />
          <Input label="آدرس کامل *" value={form.address} onChange={e => f("address", e.target.value)} />
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">استان <span className="text-red-500">*</span></label>
            <select value={form.province ?? ""} onChange={e => f("province", e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none">
              <option value="">انتخاب استان...</option>
              {IRAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">توضیحات (اختیاری)</label>
            <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={3}
              placeholder="یه معرفی کوتاه از باشگاهتون بنویسید..."
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none resize-none placeholder:text-muted-foreground/50" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={prev} className="flex-1">← قبلی</Button>
            <Button type="button" disabled={!form.name || !form.address || !form.province} onClick={next} className="flex-1">بعدی ←</Button>
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div className="text-center pb-1">
            <p className="text-sm font-semibold text-foreground">ورزش‌ها و ساعت کاری</p>
            <p className="text-xs text-muted-foreground mt-0.5">مشخص کنید چه ورزش‌هایی ارائه می‌دهید</p>
          </div>
          <MultiCheck label="ورزش‌های ارائه شده *" options={SPORTS} labelMap={SPORT_LABELS} value={form.sportTypes} onChange={v => f("sportTypes", v)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <PersianTimePicker label="ساعت باز شدن" value={form.openTime} onChange={value => f("openTime", value)} />
            <PersianTimePicker label="ساعت بستن" value={form.closeTime} onChange={value => f("closeTime", value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={prev} className="flex-1">← قبلی</Button>
            <Button type="button" disabled={!form.sportTypes?.length} onClick={next} className="flex-1">بعدی ←</Button>
          </div>
        </motion.div>
      )}

      {step === 4 && (
        <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div className="text-center pb-1">
            <p className="text-sm font-semibold text-foreground">امکانات جانبی</p>
            <p className="text-xs text-muted-foreground mt-0.5">امکاناتی که در باشگاه شما موجود است را انتخاب کنید</p>
          </div>
          <MultiCheck label="امکانات" options={AMENITIES} labelMap={AMENITY_LABELS} value={form.amenities} onChange={v => f("amenities", v)} />
          <div className="rounded-xl bg-muted/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground text-sm">خلاصه باشگاه:</p>
            <p>📛 {form.name}</p>
            <p>📍 {form.address}</p>
            {form.province && <p>🗺️ {form.province}</p>}
            <p>🕐 {form.openTime} تا {form.closeTime}</p>
            <p>🏓 {form.sportTypes.map(s => SPORT_LABELS[s]).join("، ")}</p>
            <p>🖼️ {form.images?.length} تصویر</p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={prev} className="flex-1">← قبلی</Button>
            <Button type="button" onClick={onSubmit} disabled={loading} className="flex-1">
              {loading ? "در حال ثبت..." : submitLabel}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ClubCoverImage({ club }) {
  const raw = club.images?.[0];
  if (!raw) {
    return (
      <div className="h-40 w-full bg-primary/10 flex items-center justify-center">
        <Building2Icon className="w-12 h-12 text-primary/40" />
      </div>
    );
  }
  const src = raw.startsWith("http") ? raw : `${API_BASE}${raw}`;
  return (
    <div className="relative h-40 w-full overflow-hidden">
      <img src={src} alt={club.name} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
    </div>
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
      {/* Cover image */}
      <ClubCoverImage club={club} />

      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-base">{club.name}</h3>
            <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
              <MapPinIcon className="w-3 h-3 shrink-0" />
              <span className="truncate">{club.address}</span>
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
  const user     = useAtomValue(adminUserAtom);
  const isAdmin  = user?.isAdmin;
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

  const handleCreate = async () => {
    const timeError = validateClubTimes(form);
    if (timeError) return toast.error(timeError);
    setSaving(true);
    const { ok, data } = await apiClient.post("/club-panel/clubs", form);
    setSaving(false);
    if (!ok) return toast.error(data?.message ?? "خطا");
    toast.success("باشگاه ایجاد شد ✅");
    setCreateOpen(false);
    setForm(emptyClub);
    fetch();
  };

  const handleEdit = async () => {
    const timeError = validateClubTimes(form);
    if (timeError) return toast.error(timeError);
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
      province: club.province ?? "",
      sportTypes: club.sportTypes ?? [],
      amenities: club.amenities ?? [],
      images: club.images ?? [],
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
        title={isAdmin ? "باشگاه‌ها" : "باشگاه"}
        description={`${clubs.length} باشگاه ثبت شده`}
        actions={
          (isAdmin || clubs.length === 0) && (
            <Button onClick={() => { setForm(emptyClub); setCreateOpen(true); }}>
              <PlusIcon className="w-4 h-4" />
              ثبت باشگاه جدید
            </Button>
          )
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
            <Button onClick={() => { setForm({ ...emptyClub }); setCreateOpen(true); }}>
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
        <ClubForm form={form} setForm={setForm} onSubmit={handleEdit} loading={saving} submitLabel="ذخیره تغییرات" isEdit />
      </Modal>
    </div>
  );
}
