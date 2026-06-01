import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  boolean,
  date,
  numeric,
  jsonb,
  primaryKey,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ─────────── enums ─────────── */
export const roleEnum = pgEnum("role", ["admin", "member", "view_only"]);
export const invoiceTypeEnum = pgEnum("invoice_type", ["invoice", "reimbursement"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "pending", "overdue", "paid"]);
export const dealTypeEnum = pgEnum("deal_type", ["recording", "brand"]);
export const dealStatusEnum = pgEnum("deal_status", ["active", "closed", "negotiating"]);
export const taskPriorityEnum = pgEnum("task_priority", ["high", "medium", "low"]);
export const taskStatusEnum = pgEnum("task_status", ["open", "done"]);
export const linkedEntityTypeEnum = pgEnum("linked_entity_type", ["invoice", "deal", "contact"]);

/* ─────────── Auth.js core tables ─────────── */
export const users = pgTable("users", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => ({ pk: primaryKey({ columns: [t.provider, t.providerAccountId] }) })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.identifier, t.token] }) })
);

/* ─────────── domain tables ─────────── */
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  invoicePrefix: text("invoice_prefix").notNull().default("INV-"),
  defaultPaymentTerms: text("default_payment_terms").notNull().default("Net 30"),
  domainRestriction: text("domain_restriction"),
  invoiceSeq: integer("invoice_seq").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: roleEnum("role").notNull(),
  displayName: text("display_name").notNull(),
  avatarInitials: text("avatar_initials").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workspaceInvites = pgTable("workspace_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: roleEnum("role").notNull(),
  invitedBy: text("invited_by").references(() => users.id, { onDelete: "set null" }),
  accepted: boolean("accepted").notNull().default(false),
  token: uuid("token").notNull().unique().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export interface LineItem {
  description: string;
  notes?: string;
  quantity: number;
  rate: number;
  amount: number;
}

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  client: text("client").notNull(),
  type: invoiceTypeEnum("type").notNull(),
  description: text("description"),
  lineItems: jsonb("line_items").$type<LineItem[]>().notNull().default([]),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  issuedDate: date("issued_date").notNull().defaultNow(),
  dueDate: date("due_date"),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  sent: boolean("sent").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  artist: text("artist").notNull(),
  type: dealTypeEnum("type").notNull(),
  counterparty: text("counterparty").notNull(),
  value: numeric("value", { precision: 14, scale: 2 }).notNull().default("0"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: dealStatusEnum("status").notNull().default("negotiating"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role"),
  industry: text("industry"),
  email: text("email"),
  phone: text("phone"),
  clients: text("clients").array().notNull().default(sql`'{}'`),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  dueDate: date("due_date"),
  status: taskStatusEnum("status").notNull().default("open"),
  assignedTo: uuid("assigned_to").references(() => workspaceMembers.id, { onDelete: "set null" }),
  createdBy: uuid("created_by").references(() => workspaceMembers.id, { onDelete: "set null" }),
  linkedEntityType: linkedEntityTypeEnum("linked_entity_type"),
  linkedEntityId: uuid("linked_entity_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  client: text("client").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  uploadedBy: uuid("uploaded_by").references(() => workspaceMembers.id, { onDelete: "set null" }),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoiceClientPages = pgTable("invoice_client_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ndas = pgTable("ndas", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  recipientName: text("recipient_name").notNull(),
  recipientAddress: text("recipient_address"),
  effectiveDate: date("effective_date"),
  ownerName: text("owner_name").notNull().default("Dean St Co"),
  ownerAddress: text("owner_address"),
  ownerSignatoryName: text("owner_signatory_name"),
  ownerSignatoryPosition: text("owner_signatory_position"),
  disclosingToName: text("disclosing_to_name"),
  signed: boolean("signed").notNull().default(false),
  signedAt: timestamp("signed_at"),
  createdBy: uuid("created_by").references(() => workspaceMembers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ndaFiles = pgTable("nda_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  ndaId: uuid("nda_id").notNull().references(() => ndas.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  contentType: text("content_type"),
  uploadedBy: uuid("uploaded_by").references(() => workspaceMembers.id, { onDelete: "set null" }),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoiceReceipts = pgTable("invoice_receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  contentType: text("content_type"),
  uploadedBy: uuid("uploaded_by").references(() => workspaceMembers.id, { onDelete: "set null" }),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityEvents = pgTable("activity_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  actorMemberId: uuid("actor_member_id").references(() => workspaceMembers.id, { onDelete: "set null" }),
  actorName: text("actor_name"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  entityLabel: text("entity_label"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ─────────── relations (light, only what we query) ─────────── */
export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, { fields: [workspaceMembers.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [workspaceMembers.userId], references: [users.id] }),
}));

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
}));

export const usersRelations = relations(users, ({ many }) => ({
  members: many(workspaceMembers),
}));

/* ─────────── exported types ─────────── */
export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type WorkspaceInvite = typeof workspaceInvites.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type ActivityEvent = typeof activityEvents.$inferSelect;
export type InvoiceClientPage = typeof invoiceClientPages.$inferSelect;
export type InvoiceReceipt = typeof invoiceReceipts.$inferSelect;
export type Nda = typeof ndas.$inferSelect;
export type NdaFile = typeof ndaFiles.$inferSelect;

export type Role = (typeof roleEnum.enumValues)[number];
export type InvoiceType = (typeof invoiceTypeEnum.enumValues)[number];
export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];
export type DealType = (typeof dealTypeEnum.enumValues)[number];
export type DealStatus = (typeof dealStatusEnum.enumValues)[number];
export type TaskPriority = (typeof taskPriorityEnum.enumValues)[number];
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];
