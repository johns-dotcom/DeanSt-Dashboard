"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "rounded-lg border border-border bg-surface text-foreground text-sm shadow-none",
          success: "border-success",
          error: "border-danger",
        },
      }}
    />
  );
}
