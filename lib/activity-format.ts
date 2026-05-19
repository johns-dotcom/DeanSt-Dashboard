export type ActivityAction =
  | "auth.signed_in"
  | "auth.signed_out"
  | "workspace.updated"
  | "profile.updated"
  | "member.invited"
  | "member.invite_resent"
  | "member.invite_revoked"
  | "member.role_changed"
  | "member.removed"
  | "invoice.created"
  | "invoice.updated"
  | "invoice.deleted"
  | "deal.created"
  | "deal.updated"
  | "deal.deleted"
  | "contact.created"
  | "contact.updated"
  | "contact.deleted"
  | "task.created"
  | "task.updated"
  | "task.deleted"
  | "task.completed"
  | "task.reopened"
  | "document.uploaded"
  | "document.deleted";

const TITLES: Record<ActivityAction, string> = {
  "auth.signed_in": "Signed in",
  "auth.signed_out": "Signed out",
  "workspace.updated": "Updated workspace",
  "profile.updated": "Updated profile",
  "member.invited": "Invited teammate",
  "member.invite_resent": "Resent invite",
  "member.invite_revoked": "Revoked invite",
  "member.role_changed": "Changed role",
  "member.removed": "Removed member",
  "invoice.created": "Created invoice",
  "invoice.updated": "Updated invoice",
  "invoice.deleted": "Deleted invoice",
  "deal.created": "Created deal",
  "deal.updated": "Updated deal",
  "deal.deleted": "Deleted deal",
  "contact.created": "Added contact",
  "contact.updated": "Updated contact",
  "contact.deleted": "Removed contact",
  "task.created": "Added task",
  "task.updated": "Updated task",
  "task.deleted": "Deleted task",
  "task.completed": "Completed task",
  "task.reopened": "Reopened task",
  "document.uploaded": "Uploaded file",
  "document.deleted": "Deleted file",
};

/** Short bold action label, e.g. "Created invoice". */
export function actionTitle(action: string): string {
  return TITLES[action as ActivityAction] ?? action.replaceAll(".", " · ");
}

/** Full past-tense sentence, used in compact contexts. */
export function describeActivity(action: string, label: string | null): string {
  const title = actionTitle(action).toLowerCase();
  return label ? `${title} ${label}` : title;
}

/**
 * The "details" cell — extracts a short string from event metadata
 * appropriate for each action type. Falls back to "—".
 */
export function detailsText(action: string, metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata || typeof metadata !== "object") return "—";
  if (action === "invoice.created" && typeof metadata.total === "number") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(metadata.total);
  }
  if (action === "member.role_changed" && metadata.from && metadata.to) {
    return `${String(metadata.from).replaceAll("_", " ")} → ${String(metadata.to).replaceAll("_", " ")}`;
  }
  if (action === "auth.signed_in" && typeof metadata.provider === "string") {
    return `via ${metadata.provider}`;
  }
  return "—";
}

const CATEGORY: Record<string, string> = {
  auth: "auth",
  workspace: "settings",
  profile: "settings",
  member: "team",
  invoice: "invoices",
  deal: "deals",
  contact: "contacts",
  task: "tasks",
  document: "documents",
};

export function activityCategory(action: string): string {
  const prefix = action.split(".")[0];
  return CATEGORY[prefix] ?? prefix;
}
