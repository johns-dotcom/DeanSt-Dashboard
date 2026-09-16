"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { supplies, supplyPurchases, supplyRequests } from "@/lib/db/schema";
import { editorMutation } from "@/lib/auth/action";
import { logActivity } from "@/lib/activity";
import { effectiveUnitCost } from "@/lib/supplies";

const supplyInput = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  reorder_url: z.string().optional().nullable(),
  unit_label: z.string().optional().nullable(),
  unit_cost: z.coerce.number().min(0).optional().nullable(),
  quantity_on_hand: z.coerce.number().int().min(0).default(0),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

function refresh() {
  revalidatePath("/dashboard/supplies");
  revalidatePath("/dashboard");
}

export async function createSupply(input: z.infer<typeof supplyInput>) {
  const parsed = supplyInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  return editorMutation("createSupply", async (session) => {
    const [row] = await db
      .insert(supplies)
      .values({
        workspaceId: session.workspace.id,
        name: d.name.trim(),
        category: clean(d.category),
        vendor: clean(d.vendor),
        reorderUrl: clean(d.reorder_url),
        unitLabel: clean(d.unit_label) ?? "ea",
        unitCost: d.unit_cost === null || d.unit_cost === undefined ? null : d.unit_cost.toFixed(2),
        quantityOnHand: d.quantity_on_hand,
        location: clean(d.location),
        notes: clean(d.notes),
        createdBy: session.member.id,
      })
      .returning({ id: supplies.id });

    await logActivity({
      action: "supply.created",
      workspaceId: session.workspace.id,
      actorUserId: session.user.id,
      actorMemberId: session.member.id,
      actorName: session.member.displayName,
      entityType: "supply",
      entityId: row.id,
      entityLabel: d.name.trim(),
    });

    refresh();
    return { ok: true as const, id: row.id };
  });
}

export async function updateSupply(id: string, input: z.infer<typeof supplyInput>) {
  const parsed = supplyInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  return editorMutation("updateSupply", async (session) => {
    const [row] = await db
      .update(supplies)
      .set({
        name: d.name.trim(),
        category: clean(d.category),
        vendor: clean(d.vendor),
        reorderUrl: clean(d.reorder_url),
        unitLabel: clean(d.unit_label) ?? "ea",
        unitCost: d.unit_cost === null || d.unit_cost === undefined ? null : d.unit_cost.toFixed(2),
        quantityOnHand: d.quantity_on_hand,
        location: clean(d.location),
        notes: clean(d.notes),
        updatedAt: new Date(),
      })
      .where(and(eq(supplies.id, id), eq(supplies.workspaceId, session.workspace.id)))
      .returning({ name: supplies.name });
    if (!row) return { error: "Supply not found" };

    await logActivity({
      action: "supply.updated",
      workspaceId: session.workspace.id,
      actorUserId: session.user.id,
      actorMemberId: session.member.id,
      actorName: session.member.displayName,
      entityType: "supply",
      entityId: id,
      entityLabel: row.name,
    });

    refresh();
    return { ok: true as const };
  });
}

export async function deleteSupply(id: string) {
  return editorMutation("deleteSupply", async (session) => {
    const [row] = await db
      .delete(supplies)
      .where(and(eq(supplies.id, id), eq(supplies.workspaceId, session.workspace.id)))
      .returning({ name: supplies.name });
    if (!row) return { error: "Supply not found" };

    await logActivity({
      action: "supply.deleted",
      workspaceId: session.workspace.id,
      actorUserId: session.user.id,
      actorMemberId: session.member.id,
      actorName: session.member.displayName,
      entityType: "supply",
      entityId: id,
      entityLabel: row.name,
    });

    refresh();
    return { ok: true as const };
  });
}

/** Inline stock edit — what's on the shelf right now, as counted. */
export async function setSupplyQuantity(id: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 0) return { error: "Quantity must be a whole number" };
  return editorMutation("setSupplyQuantity", async (session) => {
    const [row] = await db
      .update(supplies)
      .set({ quantityOnHand: quantity, updatedAt: new Date() })
      .where(and(eq(supplies.id, id), eq(supplies.workspaceId, session.workspace.id)))
      .returning({ name: supplies.name });
    if (!row) return { error: "Supply not found" };
    refresh();
    return { ok: true as const };
  });
}

/** The manual "needs reordering" flag. */
export async function setSupplyReorderFlag(id: string, needsReorder: boolean) {
  return editorMutation("setSupplyReorderFlag", async (session) => {
    const [row] = await db
      .update(supplies)
      .set({ needsReorder, updatedAt: new Date() })
      .where(and(eq(supplies.id, id), eq(supplies.workspaceId, session.workspace.id)))
      .returning({ name: supplies.name });
    if (!row) return { error: "Supply not found" };
    refresh();
    return { ok: true as const };
  });
}

const purchaseInput = z.object({
  supply_id: z.string().uuid(),
  purchased_on: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  total_cost: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * Logs a buy: records the purchase, adds its quantity to the shelf, refreshes
 * the last-paid unit cost, and clears the reorder flag — all in one
 * transaction, so stock can never drift from the purchase history.
 */
export async function logSupplyPurchase(input: z.infer<typeof purchaseInput>) {
  const parsed = purchaseInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  const today = new Date().toISOString().slice(0, 10);

  return editorMutation("logSupplyPurchase", async (session) => {
    const wsId = session.workspace.id;
    const [supply] = await db
      .select({ name: supplies.name, vendor: supplies.vendor })
      .from(supplies)
      .where(and(eq(supplies.id, d.supply_id), eq(supplies.workspaceId, wsId)));
    if (!supply) return { error: "Supply not found" };

    const totalCost = d.total_cost === null || d.total_cost === undefined ? null : d.total_cost;
    const perUnit = effectiveUnitCost(totalCost, d.quantity);

    await db.transaction(async (tx) => {
      await tx.insert(supplyPurchases).values({
        workspaceId: wsId,
        supplyId: d.supply_id,
        purchasedOn: d.purchased_on || today,
        vendor: clean(d.vendor) ?? supply.vendor,
        quantity: d.quantity,
        totalCost: totalCost === null ? null : totalCost.toFixed(2),
        notes: clean(d.notes),
        createdBy: session.member.id,
      });

      await tx
        .update(supplies)
        .set({
          quantityOnHand: sql`${supplies.quantityOnHand} + ${d.quantity}`,
          ...(perUnit === null ? {} : { unitCost: perUnit.toFixed(2) }),
          needsReorder: false,
          updatedAt: new Date(),
        })
        .where(and(eq(supplies.id, d.supply_id), eq(supplies.workspaceId, wsId)));
    });

    await logActivity({
      action: "supply.purchased",
      workspaceId: wsId,
      actorUserId: session.user.id,
      actorMemberId: session.member.id,
      actorName: session.member.displayName,
      entityType: "supply",
      entityId: d.supply_id,
      entityLabel: supply.name,
      metadata: { quantity: d.quantity, total: totalCost },
    });

    refresh();
    return { ok: true as const };
  });
}

/** Removes a purchase and takes its quantity back off the shelf. */
export async function deleteSupplyPurchase(id: string) {
  return editorMutation("deleteSupplyPurchase", async (session) => {
    const wsId = session.workspace.id;
    await db.transaction(async (tx) => {
      const [row] = await tx
        .delete(supplyPurchases)
        .where(and(eq(supplyPurchases.id, id), eq(supplyPurchases.workspaceId, wsId)))
        .returning({ supplyId: supplyPurchases.supplyId, quantity: supplyPurchases.quantity });
      if (!row) return;
      // GREATEST keeps the shelf from going negative if the count was already
      // corrected by hand after the purchase was logged.
      await tx
        .update(supplies)
        .set({
          quantityOnHand: sql`GREATEST(${supplies.quantityOnHand} - ${row.quantity}, 0)`,
          updatedAt: new Date(),
        })
        .where(and(eq(supplies.id, row.supplyId), eq(supplies.workspaceId, wsId)));
    });
    refresh();
    return { ok: true as const };
  });
}

const requestInput = z.object({
  item: z.string().min(1, "Item is required"),
  supply_id: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().int().min(1).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function createSupplyRequest(input: z.infer<typeof requestInput>) {
  const parsed = requestInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  return editorMutation("createSupplyRequest", async (session) => {
    const [row] = await db
      .insert(supplyRequests)
      .values({
        workspaceId: session.workspace.id,
        item: d.item.trim(),
        supplyId: d.supply_id || null,
        quantity: d.quantity ?? null,
        notes: clean(d.notes),
        requestedBy: session.member.id,
        // Snapshot the name so a request still reads correctly after the member
        // is removed from the workspace.
        requestedByName: session.member.displayName,
      })
      .returning({ id: supplyRequests.id });

    await logActivity({
      action: "supply.requested",
      workspaceId: session.workspace.id,
      actorUserId: session.user.id,
      actorMemberId: session.member.id,
      actorName: session.member.displayName,
      entityType: "supply_request",
      entityId: row.id,
      entityLabel: d.item.trim(),
    });

    refresh();
    return { ok: true as const };
  });
}

export async function setSupplyRequestStatus(id: string, status: "requested" | "ordered" | "received") {
  return editorMutation("setSupplyRequestStatus", async (session) => {
    const [row] = await db
      .update(supplyRequests)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(supplyRequests.id, id), eq(supplyRequests.workspaceId, session.workspace.id)))
      .returning({ item: supplyRequests.item });
    if (!row) return { error: "Request not found" };
    refresh();
    return { ok: true as const };
  });
}

export async function deleteSupplyRequest(id: string) {
  return editorMutation("deleteSupplyRequest", async (session) => {
    const [row] = await db
      .delete(supplyRequests)
      .where(and(eq(supplyRequests.id, id), eq(supplyRequests.workspaceId, session.workspace.id)))
      .returning({ item: supplyRequests.item });
    if (!row) return { error: "Request not found" };
    refresh();
    return { ok: true as const };
  });
}
