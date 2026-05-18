import { asc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { ContactsClient } from "./contacts-client";

export default async function ContactsPage() {
  const session = await requireSession();
  const rows = await db
    .select()
    .from(contacts)
    .where(eq(contacts.workspaceId, session.workspace.id))
    .orderBy(asc(contacts.name));

  return <ContactsClient contacts={rows} />;
}
