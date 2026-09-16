import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { clients, documents, documentFolders } from "@/lib/db/schema";
import { ClientExplorer } from "../client-explorer";

export default async function ClientPage({ params }: { params: { slug: string } }) {
  const session = await requireSession();
  const wsId = session.workspace.id;

  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.slug, params.slug), eq(clients.workspaceId, wsId)))
    .limit(1);
  if (!client) notFound();

  const [folders, docs] = await Promise.all([
    db
      .select()
      .from(documentFolders)
      .where(and(eq(documentFolders.workspaceId, wsId), eq(documentFolders.clientId, client.id)))
      .orderBy(asc(documentFolders.sortOrder), asc(documentFolders.name)),
    db
      .select()
      .from(documents)
      .where(and(eq(documents.workspaceId, wsId), eq(documents.clientId, client.id)))
      .orderBy(desc(documents.uploadedAt)),
  ]);

  return <ClientExplorer client={client} folders={folders} documents={docs} />;
}
