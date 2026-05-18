import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  action,
  className,
  children,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-lg border-hairline border-border bg-surface px-5 py-4", className)}>
      {title || action ? (
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">{title}</h2>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
