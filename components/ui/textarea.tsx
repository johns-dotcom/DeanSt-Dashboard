import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, style, ...props }, ref) => (
    <textarea
      ref={ref}
      style={{
        background: "var(--cream-light)",
        border: "1px solid var(--hair)",
        color: "var(--ink)",
        ...style,
      }}
      className={cn(
        "flex min-h-[80px] w-full rounded-md px-3 py-2 text-sm transition-colors placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
