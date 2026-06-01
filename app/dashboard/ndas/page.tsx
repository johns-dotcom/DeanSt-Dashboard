import { desc, eq, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { ndas, ndaFiles } from "@/lib/db/schema";
import { NdasClient } from "./ndas-client";

export const metadata = { title: "NDAs · Dean St" };

export default async function NdasPage() {
  const session = await requireSession();
  const wsId = session.workspace.id;

  const [rows, fileCountRows] = await Promise.all([
    db.select().from(ndas).where(eq(ndas.workspaceId, wsId)).orderBy(desc(ndas.createdAt)),
    db
      .select({ ndaId: ndaFiles.ndaId, count: sql<number>`count(*)::int` })
      .from(ndaFiles)
      .where(eq(ndaFiles.workspaceId, wsId))
      .groupBy(ndaFiles.ndaId),
  ]);

  const fileCounts: Record<string, number> = {};
  for (const r of fileCountRows) fileCounts[r.ndaId] = r.count;

  return (
    <NdasClient
      ndas={rows}
      defaultOwner={{
        name: "Dean St Co",
        signatoryName: session.member.displayName,
        signatoryPosition: "",
      }}
      fileCounts={fileCounts}
    />
  );
}
