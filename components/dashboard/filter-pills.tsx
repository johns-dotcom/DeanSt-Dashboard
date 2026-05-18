"use client";

import { cn } from "@/lib/utils";

export interface FilterPill<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function FilterPills<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: FilterPill<T>[];
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full border-hairline border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-hover",
              active && "border-foreground/40 bg-hover text-foreground"
            )}
          >
            {opt.label}
            {typeof opt.count === "number" ? <span className="ml-1.5 opacity-60">{opt.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
