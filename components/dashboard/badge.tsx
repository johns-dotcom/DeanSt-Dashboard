import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  danger: "bg-danger text-danger-foreground",
  info: "bg-info text-info-foreground",
  neutral: "bg-muted text-muted-foreground",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof tones;
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={cn("pill", tones[tone], className)}>{children}</span>;
}

export const statusBadgeTone: Record<string, keyof typeof tones> = {
  draft: "neutral",
  pending: "info",
  overdue: "danger",
  paid: "success",
  active: "success",
  closed: "neutral",
  negotiating: "warning",
  open: "info",
  done: "success",
  high: "danger",
  medium: "warning",
  low: "success",
  invoice: "info",
  reimbursement: "warning",
  recording: "info",
  brand: "warning",
};
