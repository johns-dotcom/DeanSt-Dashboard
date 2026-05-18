"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="rounded-lg border-hairline border-border bg-surface p-8 max-w-md">
        <h2 className="text-base font-medium">Something went wrong</h2>
        <p className="mt-1 text-xs text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
        <Button onClick={reset} className="mt-4" size="sm">Try again</Button>
      </div>
    </div>
  );
}
