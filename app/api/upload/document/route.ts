import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { putObject } from "@/lib/r2";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session.member.role === "view_only") {
    return NextResponse.json({ error: "View-only members cannot upload" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const client = form.get("client");
  const category = form.get("category");
  const subcategory = form.get("subcategory");

  if (!(file instanceof Blob) || typeof client !== "string" || typeof category !== "string") {
    return NextResponse.json({ error: "Missing file, client, or category" }, { status: 400 });
  }
  const fileName = file instanceof File ? file.name : "file";
  const contentType = file.type || "application/octet-stream";

  const safeName = fileName.replace(/[^\w.\-]+/g, "_");
  const key = `${session.workspace.id}/${client}/${category}/${Date.now()}-${safeName}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  await putObject(key, bytes, contentType);

  const [doc] = await db
    .insert(documents)
    .values({
      workspaceId: session.workspace.id,
      client,
      category,
      subcategory: typeof subcategory === "string" && subcategory.trim() ? subcategory.trim() : null,
      fileName,
      filePath: key,
      fileSize: bytes.length,
      uploadedBy: session.member.id,
      uploadedAt: new Date(),
    })
    .returning();

  await logActivity({
    action: "document.uploaded",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "document",
    entityId: doc.id,
    entityLabel: `${fileName} · ${client}/${category}`,
  });

  return NextResponse.json({ ok: true, document: doc });
}
