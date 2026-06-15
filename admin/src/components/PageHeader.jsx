import React from "react";

export default function PageHeader({ title, description, actions, badge }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 px-3 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-5 border-b border-border bg-card/50">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base sm:text-lg font-black text-foreground tracking-tight truncate">{title}</h1>
            {badge && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {badge}
              </span>
            )}
          </div>
          {description && <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate sm:whitespace-normal">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 sm:shrink-0 w-full sm:w-auto">{actions}</div>}
    </div>
  );
}
