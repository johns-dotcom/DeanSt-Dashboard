import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", style, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      style={{
        background: "var(--cream-light)",
        border: "1px solid var(--hair)",
        color: "var(--ink)",
        ...style,
      }}
      className={cn(
        "flex h-9 w-full rounded-md px-3 py-1.5 text-sm transition-colors placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
