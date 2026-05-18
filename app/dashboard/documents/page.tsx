import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { DocumentsClient } from "./documents-client";

export default async function DocumentsPage() {
  const session = await requireSession();
  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.workspaceId, session.workspace.id))
    .orderBy(desc(documents.uploadedAt));

  return <DocumentsClient documents={rows} workspaceId={session.workspace.id} />;
}
