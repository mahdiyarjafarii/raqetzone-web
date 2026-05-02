import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SearchIcon, ShieldIcon } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import { fmtDate } from "@/lib/utils";

const PLAN_LABEL = { basic:"پلاس", premium:"پریمیوم", pro:"حرفه‌ای" };

export default function UsersPage() {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { ok, data } = await apiClient.get("/admin/users");
      if (ok) setUsers(data.users);
      else toast.error("خطا در بارگذاری کاربران");
      setLoading(false);
    })();
  }, []);

  const filtered = search
    ? users.filter(u => u.name?.includes(search) || u.phone?.includes(search))
    : users;

  return (
    <div dir="rtl">
      <PageHeader title="کاربران" description={`${users.length} کاربر ثبت‌نام کرده`} />
      <div className="p-6 space-y-4">
        <div className="relative w-64">
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="جستجو..." className="h-9 w-full rounded-xl border border-border bg-card pr-9 pl-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["کاربر","تلفن","اشتراک","تاریخ عضویت","نقش"].map(h=>(
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:8}).map((_,i)=>(
                <tr key={i} className="border-b border-border">
                  {Array.from({length:5}).map((__,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse"/></td>)}
                </tr>
              )) : filtered.map((u,i)=>(
                <motion.tr key={u.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.02}}
                  className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{u.name ?? "—"}</td>
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
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
