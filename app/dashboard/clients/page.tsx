import { asc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { clients, documents, documentFolders } from "@/lib/db/schema";
import { ClientsIndex } from "./clients-index";

export default async function ClientsPage() {
  const session = await requireSession();
  const wsId = session.workspace.id;

  const [clientRows, folderRows, docRows] = await Promise.all([
    db.select().from(clients).where(eq(clients.workspaceId, wsId)).orderBy(asc(clients.sortOrder), asc(clients.name)),
    db.select({ clientId: documentFolders.clientId }).from(documentFolders).where(eq(documentFolders.workspaceId, wsId)),
    db.select({ clientId: documents.clientId }).from(documents).where(eq(documents.workspaceId, wsId)),
  ]);

  // Item count per client = top-level folders + root files. Mirrors the
  // explorer's "items" at the client root.
  const counts: Record<string, number> = {};
  for (const r of [...folderRows, ...docRows]) {
    counts[r.clientId] = (counts[r.clientId] ?? 0) + 1;
  }

  return <ClientsIndex clients={clientRows} counts={counts} />;
}
