import JSZip from "jszip";
import { VARIANTS, PALETTE, WHITE, type Variant, type RasterFormat } from "./logo-art";

/* ─────────────── Download helpers ─────────────── */

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

async function svgToRasterBlob(svg: string, width: number, format: RasterFormat): Promise<Blob> {
  const match = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  const vw = match ? Number(match[1]) : 720;
  const vh = match ? Number(match[2]) : 520;
  const height = Math.round((width / vw) * vh);

  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load SVG"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    // JPEG has no alpha channel — paint white first so transparent marks (and
    // any letterboxing around the SVG) come out white instead of black. Opaque
    // variants embed their own full-canvas background, which covers this.
    if (format === "jpeg") {
      ctx.fillStyle = WHITE;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);
    const mime = format === "jpeg" ? "image/jpeg" : "image/png";
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mime, format === "jpeg" ? 0.92 : undefined)
    );
    if (!out) throw new Error(`${format.toUpperCase()} encoding failed`);
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadRaster(variant: Variant, width: number, format: RasterFormat) {
  const blob = await svgToRasterBlob(variant.svg, width, format);
  const ext = format === "jpeg" ? "jpg" : "png";
  downloadBlob(blob, `deanst_${variant.id}_${width}.${ext}`);
}

export async function downloadBrandKit() {
  const zip = new JSZip();
  const pngDir = zip.folder("png");
  const jpgDir = zip.folder("jpg");
  if (!pngDir || !jpgDir) throw new Error("Could not initialize archive");

  for (const v of VARIANTS) {
    const widthPick = v.pngWidths[Math.max(0, v.pngWidths.length - 2)];
    try {
      const png = await svgToRasterBlob(v.svg, widthPick, "png");
      pngDir.file(`${v.id}_${widthPick}.png`, png);
    } catch {
      // skip a single failure rather than abort the whole bundle
    }
    try {
      const jpg = await svgToRasterBlob(v.svg, widthPick, "jpeg");
      jpgDir.file(`${v.id}_${widthPick}.jpg`, jpg);
    } catch {
      // skip a single failure rather than abort the whole bundle
    }
  }

  const readme = [
    "DEAN ST · BRAND KIT",
    "===================",
    "",
    "PNG: rasterized at standard widths, transparent where noted.",
    "JPG: same widths on a white background (no transparency).",
    "",
    "PALETTE",
    ...PALETTE.map((p) => `  ${p.name.padEnd(12)} ${p.hex}   ${p.usage}`),
    "",
    "TYPOGRAPHY",
    "  Arial / Helvetica (system grotesque)",
    "",
    "QUESTIONS",
    "  john@deanst.co",
  ].join("\n");
  zip.file("README.txt", readme);

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `deanst_brand_kit.zip`);
}
