"use client";

import { SlideOver, SlideOverContent } from "@/components/dashboard/slide-over";
import { ReceiptsManager } from "./receipts-manager";
import type { Invoice } from "@/lib/db/schema";

export function ReceiptsPanel({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <SlideOver open={open} onOpenChange={onOpenChange}>
      <SlideOverContent
        title={invoice ? `Receipts · ${invoice.invoiceNumber}` : "Receipts"}
        description={invoice ? invoice.client : ""}
      >
        {invoice ? <ReceiptsManager invoiceId={invoice.id} /> : null}
      </SlideOverContent>
    </SlideOver>
  );
}
