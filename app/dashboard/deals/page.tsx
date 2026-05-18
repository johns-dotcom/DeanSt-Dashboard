import { eq, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { DealsClient } from "./deals-client";

export default async function DealsPage() {
  const session = await requireSession();
  const rows = await db
    .select()
    .from(deals)
    .where(eq(deals.workspaceId, session.workspace.id))
    .orderBy(sql`${deals.startDate} desc nulls last`);

  return <DealsClient deals={rows} />;
}
