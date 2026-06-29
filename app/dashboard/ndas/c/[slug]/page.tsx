import { notFound } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { ndas, ndaFiles } from "@/lib/db/schema";
import { getNdaClient, NDA_CLIENTS, DEFAULT_NDA_CLIENT_SLUG } from "@/lib/nda-clients";
import { NdasClient } from "../../ndas-client";

export default async function ClientNdasPage({ params }: { params: { slug: string } }) {
  const session = await requireSession();
  const wsId = session.workspace.id;

  // The default client lives at /dashboard/ndas; only the others route here.
  const known = NDA_CLIENTS.some((c) => c.slug === params.slug);
  if (!known || params.slug === DEFAULT_NDA_CLIENT_SLUG) notFound();
  const client = getNdaClient(params.slug);

  const [rows, fileCountRows] = await Promise.all([
    db
      .select()
      .from(ndas)
      .where(and(eq(ndas.workspaceId, wsId), eq(ndas.clientSlug, client.slug)))
      .orderBy(desc(ndas.createdAt)),
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
      clientSlug={client.slug}
      defaultOwner={{
        name: "Dean St Co",
        signatoryName: session.member.displayName,
        signatoryPosition: "",
      }}
      fileCounts={fileCounts}
    />
  );
}
