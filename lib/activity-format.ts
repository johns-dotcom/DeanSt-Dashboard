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

const PAST_TENSE: Record<ActivityAction, (label: string | null) => string> = {
  "auth.signed_in": () => "signed in",
  "auth.signed_out": () => "signed out",
  "workspace.updated": () => "updated workspace settings",
  "profile.updated": () => "updated their profile",
  "member.invited": (l) => `invited ${l ?? "a teammate"}`,
  "member.invite_resent": (l) => `resent invite to ${l ?? "a teammate"}`,
  "member.invite_revoked": (l) => `revoked invite for ${l ?? "a teammate"}`,
  "member.role_changed": (l) => `changed role for ${l ?? "a teammate"}`,
  "member.removed": (l) => `removed ${l ?? "a teammate"}`,
  "invoice.created": (l) => `created invoice ${l ?? ""}`.trim(),
  "invoice.updated": (l) => `updated invoice ${l ?? ""}`.trim(),
  "invoice.deleted": (l) => `deleted invoice ${l ?? ""}`.trim(),
  "deal.created": (l) => `created deal ${l ?? ""}`.trim(),
  "deal.updated": (l) => `updated deal ${l ?? ""}`.trim(),
  "deal.deleted": (l) => `deleted deal ${l ?? ""}`.trim(),
  "contact.created": (l) => `added contact ${l ?? ""}`.trim(),
  "contact.updated": (l) => `updated contact ${l ?? ""}`.trim(),
  "contact.deleted": (l) => `removed contact ${l ?? ""}`.trim(),
  "task.created": (l) => `added task "${l ?? ""}"`,
  "task.updated": (l) => `updated task "${l ?? ""}"`,
  "task.deleted": (l) => `deleted task "${l ?? ""}"`,
  "task.completed": (l) => `completed "${l ?? ""}"`,
  "task.reopened": (l) => `reopened "${l ?? ""}"`,
  "document.uploaded": (l) => `uploaded ${l ?? "a file"}`,
  "document.deleted": (l) => `deleted ${l ?? "a file"}`,
};

export function describeActivity(action: string, label: string | null): string {
  const fn = PAST_TENSE[action as ActivityAction];
  return fn ? fn(label) : action.replaceAll(".", " · ");
}

const CATEGORY: Record<string, string> = {
  auth: "auth",
  workspace: "workspace",
  profile: "profile",
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
