import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ndaFiles } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { getObject } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();

  const [file] = await db
    .select()
    .from(ndaFiles)
    .where(and(eq(ndaFiles.id, params.id), eq(ndaFiles.workspaceId, session.workspace.id)))
    .limit(1);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { body, contentType } = await getObject(file.filePath);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "content-type": contentType || file.contentType || "application/octet-stream",
        "content-disposition": `attachment; filename="${file.fileName.replace(/"/g, "")}"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[files/nda] failed", { message, id: params.id });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
