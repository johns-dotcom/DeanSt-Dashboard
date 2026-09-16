import { asc, desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { supplies, supplyPurchases, supplyRequests } from "@/lib/db/schema";
import { SuppliesClient } from "./supplies-client";

export default async function SuppliesPage() {
  const session = await requireSession();
  const wsId = session.workspace.id;

  const [items, purchases, requests] = await Promise.all([
    db.select().from(supplies).where(eq(supplies.workspaceId, wsId)).orderBy(asc(supplies.name)),
    db
      .select()
      .from(supplyPurchases)
      .where(eq(supplyPurchases.workspaceId, wsId))
      .orderBy(desc(supplyPurchases.purchasedOn), desc(supplyPurchases.createdAt)),
    db
      .select()
      .from(supplyRequests)
      .where(eq(supplyRequests.workspaceId, wsId))
      .orderBy(desc(supplyRequests.createdAt)),
  ]);

  return <SuppliesClient supplies={items} purchases={purchases} requests={requests} />;
}
