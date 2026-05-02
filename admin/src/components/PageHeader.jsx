import React from "react";

export default function PageHeader({ title, description, actions, badge }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-5 border-b border-border bg-card/50">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-foreground tracking-tight">{title}</h1>
            {badge && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {badge}
              </span>
            )}
          </div>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
