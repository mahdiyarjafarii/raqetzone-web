import React from "react";
import DealCard from "./DealCard";
import SectionHeader from "./SectionHeader";

function SkeletonDeal() {
  return <div className="shrink-0 w-64 h-44 rounded-2xl bg-muted animate-pulse" />;
}

export default function DealsSection({ deals = [], loading }) {
  if (!loading && deals.length === 0) return null;

  return (
    <div>
      <SectionHeader title="آفرهای محدود" emoji="⚡" />

      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonDeal key={i} />)
          : deals.map((deal, i) => <DealCard key={deal.id} deal={deal} index={i} />)
        }
      </div>
    </div>
  );
}
