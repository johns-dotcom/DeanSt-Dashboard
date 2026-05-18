import { Badge, statusBadgeTone } from "@/components/dashboard/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice } from "@/lib/db/schema";

export function InvoicePreview({
  invoice,
  workspaceName,
  paymentTerms,
}: {
  invoice: Invoice;
  workspaceName: string;
  paymentTerms: string;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-lg border-hairline border-border bg-base p-8 text-sm">
      <header className="flex items-start justify-between border-b-hairline border-border pb-5">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">From</div>
          <div className="mt-1 text-base font-medium">{workspaceName} Media</div>
          <div className="text-xs text-muted-foreground">Operations · {paymentTerms}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Invoice</div>
          <div className="font-mono text-lg">{invoice.invoiceNumber}</div>
          <div className="mt-1 text-xs text-muted-foreground">Issued {formatDate(invoice.issuedDate)}</div>
          {invoice.dueDate ? <div className="text-xs text-muted-foreground">Due {formatDate(invoice.dueDate)}</div> : null}
          <div className="mt-2"><Badge tone={statusBadgeTone[invoice.status]}>{invoice.status}</Badge></div>
        </div>
      </header>

      <section className="mt-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Bill to</div>
        <div className="mt-1 font-medium">{invoice.client}</div>
        {invoice.description ? <p className="mt-2 text-xs text-muted-foreground">{invoice.description}</p> : null}
      </section>

      <section className="mt-6">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr className="border-b-hairline border-border">
              <th className="py-2 text-left font-medium">Description</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Rate</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((it, idx) => (
              <tr key={idx} className="border-b-hairline border-border">
                <td className="py-2">{it.description || "—"}</td>
                <td className="py-2 text-right tabular-nums">{it.quantity}</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(it.rate)}</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(it.amount || it.quantity * it.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-4 ml-auto w-full max-w-xs text-sm tabular-nums">
        <div className="flex justify-between py-1"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(Number(invoice.subtotal))}</span></div>
        {Number(invoice.taxRate) > 0 ? (
          <div className="flex justify-between py-1"><span className="text-muted-foreground">Tax · {invoice.taxRate}%</span><span>{formatCurrency(Number(invoice.subtotal) * Number(invoice.taxRate) / 100)}</span></div>
        ) : null}
        <div className="mt-1 flex justify-between border-t-hairline border-border py-2 font-medium"><span>Total</span><span>{formatCurrency(Number(invoice.total))}</span></div>
      </section>

      <footer className="mt-8 border-t-hairline border-border pt-4 text-xs text-muted-foreground">
        Payment terms: {paymentTerms}. Please remit by {formatDate(invoice.dueDate)}.
      </footer>
    </div>
  );
}
