import { asc, desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { documents, documentFolders } from "@/lib/db/schema";
import { DocumentsClient } from "./documents-client";

export default async function DocumentsPage() {
  const session = await requireSession();

  const [docs, folders] = await Promise.all([
    db
      .select()
      .from(documents)
      .where(eq(documents.workspaceId, session.workspace.id))
      .orderBy(desc(documents.uploadedAt)),
    db
      .select()
      .from(documentFolders)
      .where(eq(documentFolders.workspaceId, session.workspace.id))
      .orderBy(asc(documentFolders.client), asc(documentFolders.sortOrder), asc(documentFolders.name)),
  ]);

  return <DocumentsClient documents={docs} folders={folders} workspaceId={session.workspace.id} />;
}
