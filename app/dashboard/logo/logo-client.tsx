"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Eyebrow } from "@/components/brand/eyebrow";

/* ─────────────── Logo variants ───────────────
 * Each variant is a complete <svg> string. The "Sign" lockup is the
 * outlined navy rectangle reading DEAN ST · CO; the "Mark" is the
 * square DS icon used as favicon/profile. Colors are inlined so the
 * downloaded files are portable (no external CSS/vars).
 *
 * Brand palette anchors:
 *   --sign-green (now navy): #1d3c8e
 *   ink:                     #1a1715
 *   cream paper:             #f6efe1
 */

const NAVY = "#1d3c8e";
const INK = "#1a1715";
const CREAM = "#f6efe1";

function streetSignSvg({ bg, panel, ink }: { bg: string | null; panel: string; ink: string }) {
  // Street-sign lockup: navy panel, inset white outline, north marker
  // top-left, EST · 25 top-right, "DEAN" / "ST co" in a 2-line block.
  // 720×520 viewBox gives room for a generous cream margin around the sign.
  const bgRect = bg ? `<rect width="720" height="520" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 520" width="720" height="520">
  ${bgRect}
  <rect x="40" y="60" width="640" height="400" rx="14" fill="${panel}"/>
  <rect x="52" y="72" width="616" height="376" rx="8" fill="none" stroke="${ink}" stroke-width="3"/>
  <g font-family="Arial, Helvetica, sans-serif" fill="${ink}">
    <g transform="translate(78,114)">
      <path d="M0 -3 L0 -22 M-6 -16 L0 -22 L6 -16" stroke="${ink}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="16" y="0" font-size="22" font-weight="500" letter-spacing="2">N</text>
    </g>
    <text x="642" y="114" font-size="22" font-weight="500" letter-spacing="3" text-anchor="end">EST · 25</text>
    <text x="78" y="290" font-size="150" font-weight="900" letter-spacing="-2">DEAN</text>
    <text x="78" y="428" font-size="150" font-weight="900" letter-spacing="-2">ST<tspan dx="10" dy="-34" font-size="36" font-weight="600" letter-spacing="2">co</tspan></text>
  </g>
</svg>`;
}

function signSvg({ fg, stroke, bg }: { fg: string; stroke: string; bg: string | null }) {
  // 460 × 140 viewBox. Generous padding to match the in-app sign-plate.
  // Outer outline (stroke) + inner panel (fg).
  const bgRect = bg ? `<rect width="460" height="140" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 140" width="460" height="140">
  ${bgRect}
  <rect x="14" y="14" width="432" height="112" rx="9" fill="${fg}" stroke="${stroke}" stroke-width="3"/>
  <rect x="20" y="20" width="420" height="100" rx="6" fill="none" stroke="${bg ?? "#ffffff"}" stroke-width="3"/>
  <g font-family="Arial, Helvetica, sans-serif" fill="${stroke}">
    <text x="230" y="92" font-size="56" font-weight="700" text-anchor="middle" letter-spacing="1.5">DEAN ST<tspan font-size="22" font-weight="500" dx="14" dy="-12" letter-spacing="2" opacity="0.85">CO</tspan></text>
  </g>
</svg>`;
}

function markSvg({ bg, fg, border }: { bg: string; fg: string; border: string | null }) {
  // 256×256 square, generous corner radius; "DS" centered.
  const stroke = border
    ? `<rect x="14" y="14" width="228" height="228" rx="28" fill="none" stroke="${border}" stroke-width="8"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <rect width="256" height="256" rx="40" fill="${bg}"/>
  ${stroke}
  <text x="128" y="180" font-family="Arial, Helvetica, sans-serif" font-size="140" font-weight="900" fill="${fg}" text-anchor="middle" letter-spacing="-4">DS</text>
</svg>`;
}

type Variant = {
  id: string;
  title: string;
  description: string;
  svg: string;
  previewBg: string;
  pngWidths: number[];
};

const VARIANTS: Variant[] = [
  {
    id: "street-sign-on-cream",
    title: "Street Sign — On Cream",
    description: "Hero lockup with North marker and EST · 25. The signature mark.",
    svg: streetSignSvg({ bg: CREAM, panel: NAVY, ink: "#ffffff" }),
    previewBg: CREAM,
    pngWidths: [800, 1600, 3200],
  },
  {
    id: "street-sign-transparent",
    title: "Street Sign — Transparent",
    description: "Same lockup with no surrounding fill. Drops onto any background.",
    svg: streetSignSvg({ bg: null, panel: NAVY, ink: "#ffffff" }),
    previewBg: CREAM,
    pngWidths: [800, 1600, 3200],
  },
  {
    id: "street-sign-mono-black",
    title: "Street Sign — Black & White",
    description: "Monochrome variant for print, fax, single-color reproduction.",
    svg: streetSignSvg({ bg: "#ffffff", panel: INK, ink: "#ffffff" }),
    previewBg: "#ffffff",
    pngWidths: [800, 1600, 3200],
  },
  {
    id: "sign-navy-on-cream",
    title: "Sign — Navy on Cream",
    description: "Primary lockup on paper. Use on cream/light backgrounds.",
    svg: signSvg({ fg: NAVY, stroke: NAVY, bg: CREAM }),
    previewBg: CREAM,
    pngWidths: [800, 1600, 3200],
  },
  {
    id: "sign-navy-transparent",
    title: "Sign — Navy on Transparent",
    description: "Same lockup with no background. Drop onto any light surface.",
    svg: signSvg({ fg: NAVY, stroke: NAVY, bg: null }),
    previewBg: "#ffffff",
    pngWidths: [800, 1600, 3200],
  },
  {
    id: "sign-white-on-navy",
    title: "Sign — White on Navy",
    description: "Reverse lockup for dark headers and covers.",
    svg: signSvg({ fg: NAVY, stroke: "#ffffff", bg: NAVY }),
    previewBg: NAVY,
    pngWidths: [800, 1600, 3200],
  },
  {
    id: "sign-black-on-white",
    title: "Sign — Black on White",
    description: "Monochrome variant for print, fax, BW reproduction.",
    svg: signSvg({ fg: "#ffffff", stroke: INK, bg: "#ffffff" }),
    previewBg: "#ffffff",
    pngWidths: [800, 1600, 3200],
  },
  {
    id: "sign-white-on-black",
    title: "Sign — White on Black",
    description: "Monochrome reverse for dark print and overlays.",
    svg: signSvg({ fg: INK, stroke: "#ffffff", bg: INK }),
    previewBg: INK,
    pngWidths: [800, 1600, 3200],
  },
  {
    id: "mark-navy",
    title: "Mark — Navy Square",
    description: "DS app icon. Use for avatars, favicons, sticker prints.",
    svg: markSvg({ bg: NAVY, fg: "#ffffff", border: "#ffffff" }),
    previewBg: CREAM,
    pngWidths: [256, 512, 1024],
  },
  {
    id: "mark-cream-on-navy",
    title: "Mark — Cream on Navy",
    description: "Warm-toned variant for cream-aligned product surfaces.",
    svg: markSvg({ bg: NAVY, fg: CREAM, border: CREAM }),
    previewBg: CREAM,
    pngWidths: [256, 512, 1024],
  },
  {
    id: "mark-black",
    title: "Mark — Black on White",
    description: "Single-color mark for print, embossing, foil.",
    svg: markSvg({ bg: "#ffffff", fg: INK, border: INK }),
    previewBg: CREAM,
    pngWidths: [256, 512, 1024],
  },
];

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

async function downloadSvg(variant: Variant) {
  const blob = new Blob([variant.svg], { type: "image/svg+xml" });
  downloadBlob(blob, `deanst_${variant.id}.svg`);
}

async function downloadPng(variant: Variant, width: number) {
  // Rasterize via canvas. Reads natural ratio from the SVG header.
  const match = variant.svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  const vw = match ? Number(match[1]) : 460;
  const vh = match ? Number(match[2]) : 140;
  const height = Math.round((width / vw) * vh);

  const blob = new Blob([variant.svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
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
    ctx.drawImage(img, 0, 0, width, height);
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!out) throw new Error("PNG encoding failed");
    downloadBlob(out, `deanst_${variant.id}_${width}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function LogoClient() {
  const variants = useMemo(() => VARIANTS, []);

  async function handlePng(v: Variant, w: number) {
    try {
      await downloadPng(v, w);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export PNG");
    }
  }

  return (
    <div style={{ padding: "32px 48px 60px", display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <Eyebrow size={10} spacing={0.36}>№ 09 · Brand</Eyebrow>
          <h1 style={{ fontFamily: 'Arial, sans-serif', fontSize: 30, fontWeight: 600, letterSpacing: "-0.01em", marginTop: 6 }}>
            Dean St Logo
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 4, maxWidth: 560 }}>
            Download brand-ready SVG or PNG files. SVG scales infinitely and is preferred
            for print and web; PNG is provided at common pixel sizes for documents and decks.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 18,
        }}
      >
        {variants.map((v) => (
          <article
            key={v.id}
            style={{
              background: "var(--paper)",
              border: "1px solid var(--hair)",
              borderRadius: 10,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                background: v.previewBg,
                padding: "32px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 180,
              }}
              // The SVG is generated from a fixed template above — no
              // user-derived input is interpolated.
              dangerouslySetInnerHTML={{ __html: v.svg }}
            />
            <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.01em" }}>
                  {v.title}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 3, lineHeight: 1.4 }}>
                  {v.description}
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button onClick={() => downloadSvg(v)} style={btnPrimary}>
                  <Download className="h-3 w-3" /> SVG
                </button>
                {v.pngWidths.map((w) => (
                  <button key={w} onClick={() => handlePng(v, w)} style={btnGhost}>
                    PNG · {w}px
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 500,
  fontFamily: "Arial, sans-serif",
  background: "var(--sign-green)",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 500,
  fontFamily: "Arial, sans-serif",
  background: "var(--cream-light)",
  color: "var(--ink)",
  border: "1px solid var(--hair)",
  borderRadius: 6,
  cursor: "pointer",
};
