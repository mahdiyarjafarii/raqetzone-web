import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PlusIcon, PencilIcon, ToggleLeftIcon, ToggleRightIcon } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { fmt } from "@/lib/utils";
import { cn } from "@/lib/utils";

const SPORTS = ["padel","tennis","squash","badminton","ping-pong"];
const SURFACES = ["artificial","clay","hard","grass"];
const SPORT_ICONS = { padel:"🏓", tennis:"🎾", squash:"🟡", badminton:"🏸", "ping-pong":"🏓" };
const empty = { name:"", location:"", address:"", surfaceType:"artificial", sportType:"padel", pricePerHour:"", openTime:"08:00", closeTime:"23:00", slotDuration:"60", description:"" };

function CourtForm({ form, setForm, onSubmit, loading, submitLabel }) {
  const f = (k, v) => setForm(p => ({...p, [k]: v}));
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="نام زمین" value={form.name} onChange={e=>f("name",e.target.value)} required />
        <Input label="مکان" value={form.location} onChange={e=>f("location",e.target.value)} required />
      </div>
      <Input label="آدرس کامل" value={form.address} onChange={e=>f("address",e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">نوع ورزش</label>
          <select value={form.sportType} onChange={e=>f("sportType",e.target.value)} className="h-9 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none">
            {SPORTS.map(s => <option key={s} value={s}>{SPORT_ICONS[s]} {s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">نوع سطح</label>
          <select value={form.surfaceType} onChange={e=>f("surfaceType",e.target.value)} className="h-9 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none">
            {SURFACES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input label="قیمت/ساعت (تومان)" type="number" value={form.pricePerHour} onChange={e=>f("pricePerHour",e.target.value)} required />
        <Input label="ساعت باز شدن" type="time" value={form.openTime} onChange={e=>f("openTime",e.target.value)} />
        <Input label="ساعت بستن" type="time" value={form.closeTime} onChange={e=>f("closeTime",e.target.value)} />
      </div>
      <Input label="مدت هر اسلات (دقیقه)" type="number" value={form.slotDuration} onChange={e=>f("slotDuration",e.target.value)} />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">توضیحات</label>
        <textarea value={form.description} onChange={e=>f("description",e.target.value)} rows={2} className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none resize-none" />
      </div>
      <Button type="submit" disabled={loading} className="w-full">{loading ? "در حال ذخیره..." : submitLabel}</Button>
    </form>
  );
}

export default function CourtsPage() {
  const [courts, setCourts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]         = useState(empty);
  const [saving, setSaving]     = useState(false);

  const fetch = async () => {
    setLoading(true);
    const { ok, data } = await apiClient.get("/admin/courts");
    if (ok) setCourts(data.courts);
    setLoading(false);
  };
  useEffect(() => { fetch(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { ok, data } = await apiClient.post("/admin/courts", form);
    setSaving(false);
    if (!ok) return toast.error(data?.message ?? "خطا");
    toast.success("زمین ایجاد شد ✅");
    setCreateOpen(false); setForm(empty);
    fetch();
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { ok, data } = await apiClient.patch(`/admin/courts/${editTarget.id}`, form);
    setSaving(false);
    if (!ok) return toast.error(data?.message ?? "خطا");
    toast.success("زمین ویرایش شد ✅");
    setEditTarget(null);
    fetch();
  };

  const toggleActive = async (court) => {
    await apiClient.patch(`/admin/courts/${court.id}`, { isActive: !court.isActive });
    toast.success(court.isActive ? "غیرفعال شد" : "فعال شد");
    fetch();
  };

  return (
    <div dir="rtl">
      <PageHeader
        title="مدیریت زمین‌ها"
        description={`${courts.length} زمین`}
        actions={<Button onClick={() => { setForm(empty); setCreateOpen(true); }}><PlusIcon className="w-4 h-4" />افزودن زمین</Button>}
      />

      <div className="p-6">
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["زمین","ورزش","مکان","قیمت/ساعت","ساعات","وضعیت","عملیات"].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:5}).map((_,i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({length:7}).map((__,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}
                  </tr>
                ))
              ) : courts.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">زمینی وجود ندارد</td></tr>
              ) : courts.map((c, i) => (
                <motion.tr key={c.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.03}}
                  className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.surfaceType}</div>
                  </td>
                  <td className="px-4 py-3">{SPORT_ICONS[c.sportType]} {c.sportType}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.location}</td>
                  <td className="px-4 py-3 font-semibold text-primary">{fmt(c.pricePerHour)} ت</td>
                  <td className="px-4 py-3 text-muted-foreground" dir="ltr">{c.openTime}–{c.closeTime}</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.isActive ? "success" : "muted"}>{c.isActive ? "فعال" : "غیرفعال"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => { setEditTarget(c); setForm({ name:c.name, location:c.location, address:c.address??"", surfaceType:c.surfaceType??"artificial", sportType:c.sportType, pricePerHour:String(c.pricePerHour), openTime:c.openTime, closeTime:c.closeTime, slotDuration:String(c.slotDuration), description:c.description??"" }); }}>
                        <PencilIcon className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(c)}>
                        {c.isActive ? <ToggleRightIcon className="w-4 h-4 text-emerald-500" /> : <ToggleLeftIcon className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="افزودن زمین جدید" size="lg">
        <CourtForm form={form} setForm={setForm} onSubmit={handleCreate} loading={saving} submitLabel="ایجاد زمین" />
      </Modal>
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="ویرایش زمین" size="lg">
        <CourtForm form={form} setForm={setForm} onSubmit={handleEdit} loading={saving} submitLabel="ذخیره تغییرات" />
      </Modal>
    </div>
  );
}
