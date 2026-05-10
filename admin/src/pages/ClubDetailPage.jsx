import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRightIcon, PlusIcon, PencilIcon, TrashIcon,
  ToggleLeftIcon, ToggleRightIcon, PhoneIcon, ClockIcon, CalendarDaysIcon,
  MapPinIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import CourtSlotsModal from "@/components/CourtSlotsModal";
import { fmt, cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:3000";

const SPORTS   = ["padel","tennis","squash","badminton","ping-pong"];
const SURFACES = ["artificial","clay","hard","grass"];
const SPORT_ICONS = { padel:"🏓", tennis:"🎾", squash:"🟡", badminton:"🏸", "ping-pong":"🏓" };
const SPORT_LABELS = { padel:"پادل", tennis:"تنیس", squash:"اسکواش", badminton:"بدمینتون", "ping-pong":"پینگ‌پنگ" };
const SURFACE_LABELS = { artificial:"چمن مصنوعی", clay:"خاک رس", hard:"سخت", grass:"چمن طبیعی" };

const emptyForm = {
  name:"", location:"", address:"", surfaceType:"artificial", sportType:"padel",
  pricePerHour:"", openTime:"", closeTime:"", slotDuration:"60", description:"", managerPhone:"",
};

function CourtForm({ form, setForm, onSubmit, loading, submitLabel }) {
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="نام زمین *" value={form.name} onChange={e=>f("name",e.target.value)} required />
        <Input label="موقعیت (نمایشی)" value={form.location} onChange={e=>f("location",e.target.value)} />
      </div>
      <Input label="آدرس" value={form.address} onChange={e=>f("address",e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">نوع ورزش</label>
          <select value={form.sportType} onChange={e=>f("sportType",e.target.value)}
            className="h-9 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none">
            {SPORTS.map(s=><option key={s} value={s}>{SPORT_ICONS[s]} {SPORT_LABELS[s]??s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">نوع سطح</label>
          <select value={form.surfaceType} onChange={e=>f("surfaceType",e.target.value)}
            className="h-9 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none">
            {SURFACES.map(s=><option key={s} value={s}>{SURFACE_LABELS[s]??s}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input label="قیمت/ساعت (ت) *" type="number" value={form.pricePerHour} onChange={e=>f("pricePerHour",e.target.value)} required />
        <Input label="باز شدن" type="time" value={form.openTime} onChange={e=>f("openTime",e.target.value)} />
        <Input label="بستن" type="time" value={form.closeTime} onChange={e=>f("closeTime",e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="مدت اسلات (دقیقه)" type="number" value={form.slotDuration} onChange={e=>f("slotDuration",e.target.value)} />
        <Input label="شماره مدیر" type="tel" value={form.managerPhone} onChange={e=>f("managerPhone",e.target.value)} dir="ltr" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">توضیحات</label>
        <textarea value={form.description} onChange={e=>f("description",e.target.value)} rows={2}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none resize-none" />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "در حال ذخیره..." : submitLabel}
      </Button>
    </form>
  );
}

export default function ClubDetailPage() {
  const { clubId } = useParams();
  const navigate   = useNavigate();
  const [club, setClub]       = useState(null);
  const [courts, setCourts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [slotsTarget, setSlotsTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchClub = async () => {
    const { ok, data } = await apiClient.get("/club-panel/clubs");
    if (ok) setClub(data.clubs.find(c => c.id === clubId) ?? null);
  };

  const fetchCourts = async () => {
    setLoading(true);
    const { ok, data } = await apiClient.get(`/club-panel/clubs/${clubId}/courts`);
    if (ok) setCourts(data.courts);
    else toast.error("خطا در بارگذاری زمین‌ها");
    setLoading(false);
  };

  useEffect(() => {
    fetchClub();
    fetchCourts();
  }, [clubId]);

  const prefill = (c) => ({
    name: c.name, location: c.location??"", address: c.address??"",
    surfaceType: c.surfaceType??"artificial", sportType: c.sportType,
    pricePerHour: String(c.pricePerHour), openTime: c.openTime, closeTime: c.closeTime,
    slotDuration: String(c.slotDuration), description: c.description??"",
    managerPhone: c.managerPhone??"",
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { ok, data } = await apiClient.post(`/club-panel/clubs/${clubId}/courts`, form);
    setSaving(false);
    if (!ok) return toast.error(data?.message ?? "خطا");
    toast.success("زمین اضافه شد ✅");
    setCreateOpen(false); setForm(emptyForm); fetchCourts();
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { ok, data } = await apiClient.patch(`/club-panel/courts/${editTarget.id}`, form);
    setSaving(false);
    if (!ok) return toast.error(data?.message ?? "خطا");
    toast.success("زمین ویرایش شد ✅");
    setEditTarget(null); fetchCourts();
  };

  const handleDelete = async (id) => {
    if (!confirm("زمین حذف شود؟")) return;
    const { ok } = await apiClient.delete(`/club-panel/courts/${id}`);
    if (ok) { toast.success("زمین حذف شد"); fetchCourts(); }
    else toast.error("خطا در حذف");
  };

  const toggleActive = async (court) => {
    await apiClient.patch(`/club-panel/courts/${court.id}`, { isActive: !court.isActive });
    toast.success(court.isActive ? "غیرفعال شد" : "فعال شد");
    fetchCourts();
  };

  return (
    <div dir="rtl">
      <PageHeader
        title={club?.name ?? "مدیریت زمین‌ها"}
        description={`${courts.length} زمین`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/clubs")}>
              <ArrowRightIcon className="w-4 h-4" />
              بازگشت
            </Button>
            <Button onClick={() => { setForm({ ...emptyForm, openTime: club?.openTime??"07:00", closeTime: club?.closeTime??"23:00", location: club?.name??"", managerPhone: club?.phone??"" }); setCreateOpen(true); }}>
              <PlusIcon className="w-4 h-4" />
              افزودن زمین
            </Button>
          </div>
        }
      />

      {/* Club info banner */}
      {club && (
        <div className="mx-6 mt-2 mb-0 rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="flex h-36">
            {/* Cover image / placeholder */}
            {(() => {
              const raw = club.images?.[0];
              if (raw) {
                const src = raw.startsWith("http") ? raw : `${API_BASE}${raw}`;
                return (
                  <div className="relative w-48 shrink-0 overflow-hidden rounded-r-xl">
                    <img src={src} alt={club.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-l from-black/40 to-transparent" />
                  </div>
                );
              }
              return (
                <div className="w-48 shrink-0 rounded-r-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="text-5xl">🏟️</span>
                </div>
              );
            })()}

            {/* Info */}
            <div className="flex-1 min-w-0 px-5 py-4 flex flex-col justify-between">
              {/* Top: name + active badge */}
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold text-foreground text-lg leading-tight">{club.name}</h2>
                <Badge variant={club.isActive ? "success" : "muted"} className="shrink-0">
                  {club.isActive ? "فعال" : "غیرفعال"}
                </Badge>
              </div>

              {/* Middle: address, phone, hours */}
              <div className="flex flex-col gap-1.5 mt-2">
                {club.address && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPinIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span className="line-clamp-1">{club.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  {club.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <PhoneIcon className="w-3.5 h-3.5 shrink-0" />
                      <span dir="ltr">{club.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ClockIcon className="w-3.5 h-3.5 shrink-0" />
                    <span dir="ltr">{club.openTime}–{club.closeTime}</span>
                  </div>
                </div>
              </div>

              {/* Bottom: sport chips + amenity count */}
              <div className="flex items-center gap-2 flex-wrap mt-2">
                {club.sportTypes?.map(s => (
                  <span key={s} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {SPORT_LABELS[s] ?? s}
                  </span>
                ))}
                {club.amenities?.length > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {club.amenities.length} امکانات
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["زمین","ورزش","سطح","قیمت/ساعت","ساعات","مدیر","وضعیت","عملیات"].map(h=>(
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:4}).map((_,i)=>(
                  <tr key={i} className="border-b border-border">
                    {Array.from({length:8}).map((__,j)=>(
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse"/></td>
                    ))}
                  </tr>
                ))
              ) : courts.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-4xl">🏟️</span>
                    <p>هنوز زمینی اضافه نشده</p>
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                      <PlusIcon className="w-3.5 h-3.5" />
                      افزودن اولین زمین
                    </Button>
                  </div>
                </td></tr>
              ) : courts.map((c, i)=>(
                <motion.tr key={c.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.03}}
                  className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{c.name}</p>
                    {c.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{c.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {SPORT_ICONS[c.sportType]} {SPORT_LABELS[c.sportType]??c.sportType}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{SURFACE_LABELS[c.surfaceType]??c.surfaceType}</td>
                  <td className="px-4 py-3 font-semibold text-primary">{fmt(c.pricePerHour)} ت</td>
                  <td className="px-4 py-3 text-muted-foreground" dir="ltr">{c.openTime}–{c.closeTime}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs" dir="ltr">{c.managerPhone??"-"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.isActive?"success":"muted"}>{c.isActive?"فعال":"غیرفعال"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={()=>{ setEditTarget(c); setForm(prefill(c)); }}>
                        <PencilIcon className="w-3.5 h-3.5"/>
                      </Button>
                      <Button size="sm" variant="outline" onClick={()=>setSlotsTarget(c)} title="مدیریت سانس‌ها">
                        <CalendarDaysIcon className="w-3.5 h-3.5"/>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={()=>toggleActive(c)}>
                        {c.isActive
                          ? <ToggleRightIcon className="w-4 h-4 text-emerald-500"/>
                          : <ToggleLeftIcon className="w-4 h-4 text-muted-foreground"/>
                        }
                      </Button>
                      <Button size="sm" variant="destructive" onClick={()=>handleDelete(c.id)}>
                        <TrashIcon className="w-3.5 h-3.5"/>
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CourtSlotsModal open={!!slotsTarget} onClose={()=>setSlotsTarget(null)} court={slotsTarget} />

      <Modal open={createOpen} onClose={()=>setCreateOpen(false)} title="افزودن زمین جدید" size="lg">
        <CourtForm form={form} setForm={setForm} onSubmit={handleCreate} loading={saving} submitLabel="ایجاد زمین"/>
      </Modal>
      <Modal open={!!editTarget} onClose={()=>setEditTarget(null)} title="ویرایش زمین" size="lg">
        <CourtForm form={form} setForm={setForm} onSubmit={handleEdit} loading={saving} submitLabel="ذخیره تغییرات"/>
      </Modal>
    </div>
  );
}
