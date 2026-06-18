import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SearchIcon, ShieldIcon } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import { fmtDate, getUserFullName } from "@/lib/utils";

const PLAN_LABEL = { basic:"پلاس", premium:"پریمیوم", pro:"حرفه‌ای" };
const COACH_STATUS_LABEL = {
  none: "—",
  pending: "در انتظار تایید",
  approved: "تایید شده",
  rejected: "رد شده",
};

export default function UsersPage() {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actingId, setActingId] = useState("");

  useEffect(() => {
    (async () => {
      const { ok, data } = await apiClient.get("/admin/users");
      if (ok) setUsers(data.users);
      else toast.error("خطا در بارگذاری کاربران");
      setLoading(false);
    })();
  }, []);

  const filtered = search
    ? users.filter((u) => {
        const fullName = getUserFullName(u);
        return fullName.includes(search) || u.phone?.includes(search);
      })
    : users;

  const updateCoachVerification = async (userId, status) => {
    setActingId(userId);
    const { ok, data } = await apiClient.patch(`/admin/users/${userId}/coach-verification`, { status });
    setActingId("");
    if (!ok) return toast.error(data?.message ?? "خطا در بروزرسانی وضعیت مربی");

    setUsers((prev) => prev.map((user) => (
      user.id === userId
        ? {
            ...user,
            isCoach: data?.user?.isCoach ?? user.isCoach,
            coachVerificationStatus: data?.user?.coachVerificationStatus ?? user.coachVerificationStatus,
          }
        : user
    )));
    toast.success("وضعیت مربی بروزرسانی شد");
  };

  return (
    <div dir="rtl">
      <PageHeader title="کاربران" description={`${users.length} کاربر ثبت‌نام کرده`} />
      <div className="p-3 sm:p-6 space-y-4">
        <div className="relative w-full sm:w-64">
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="جستجو..." className="h-9 w-full rounded-xl border border-border bg-card pr-9 pl-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["کاربر","تلفن","اشتراک","تاریخ عضویت","نقش","وضعیت مربی","عملیات مربی"].map(h=>(
                    <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({length:8}).map((_,i)=>(
                  <tr key={i} className="border-b border-border">
                    {Array.from({length:7}).map((__,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse"/></td>)}
                  </tr>
                )) : filtered.map((u,i)=>(
                  <motion.tr key={u.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.02}}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{getUserFullName(u)}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs" dir="ltr">{u.phone}</td>
                    <td className="px-4 py-3">
                      {u.subscriptionType
                        ? <Badge variant="success">{PLAN_LABEL[u.subscriptionType] ?? u.subscriptionType}</Badge>
                        : <span className="text-muted-foreground text-xs">رایگان</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      {u.isAdmin
                        ? <Badge variant="default" className="gap-1"><ShieldIcon className="w-3 h-3"/>ادمین</Badge>
                        : <span className="text-muted-foreground text-xs">کاربر</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {u.isCoach ? (
                        <Badge variant={u.coachVerificationStatus === "approved" ? "success" : u.coachVerificationStatus === "rejected" ? "destructive" : "warning"}>
                          {COACH_STATUS_LABEL[u.coachVerificationStatus] ?? u.coachVerificationStatus}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.isCoach ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateCoachVerification(u.id, "approved")}
                            disabled={actingId === u.id || u.coachVerificationStatus === "approved"}
                            className="h-8 px-2.5 rounded-lg bg-emerald-500/10 text-emerald-700 text-xs font-semibold disabled:opacity-50"
                          >
                            تایید
                          </button>
                          <button
                            type="button"
                            onClick={() => updateCoachVerification(u.id, "rejected")}
                            disabled={actingId === u.id || u.coachVerificationStatus === "rejected"}
                            className="h-8 px-2.5 rounded-lg bg-red-500/10 text-red-700 text-xs font-semibold disabled:opacity-50"
                          >
                            رد
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">درخواستی ندارد</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
