"use client";

import { useState } from "react";
import { Download, Copy, Check, Archive } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { Eyebrow } from "@/components/brand/eyebrow";

/* ─────────────── Brand color tokens ───────────────
 * Centralized so the page's logos always render with the same palette
 * as the rest of the app. Colors are inlined into the SVG output so
 * downloaded files are portable (no external CSS / vars).
 */
const NAVY = "#1d3c8e";
const NAVY_SOFT = "#2a4d9d";
const CREAM = "#f6efe1";
const CREAM_DEEP = "#f0e6d2";
const INK = "#1a1715";
const INK_SOFT = "#6b5e54";

/* ─────────────── SVG generators ─────────────── */

function streetSignSvg({ bg, panel, ink }: { bg: string | null; panel: string; ink: string }) {
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

function wordmarkStackedSvg({ bg, ink }: { bg: string | null; ink: string }) {
  const bgRect = bg ? `<rect width="480" height="420" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 420" width="480" height="420">
  ${bgRect}
  <g font-family="Arial, Helvetica, sans-serif" fill="${ink}">
    <text x="240" y="200" font-size="148" font-weight="900" text-anchor="middle" letter-spacing="-3">DEAN</text>
    <text x="240" y="346" font-size="148" font-weight="900" text-anchor="middle" letter-spacing="-3">ST<tspan dx="8" dy="-34" font-size="38" font-weight="600" letter-spacing="2">co</tspan></text>
  </g>
</svg>`;
}

function wordmarkHorizontalSvg({ bg, ink }: { bg: string | null; ink: string }) {
  const bgRect = bg ? `<rect width="720" height="200" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 200" width="720" height="200">
  ${bgRect}
  <text x="360" y="140" font-family="Arial, Helvetica, sans-serif" font-size="120" font-weight="900" fill="${ink}" text-anchor="middle" letter-spacing="-2">DEAN ST<tspan dx="12" dy="-32" font-size="32" font-weight="600" letter-spacing="2">co</tspan></text>
</svg>`;
}

function markSquareSvg({ bg, fg, border }: { bg: string; fg: string; border: string | null }) {
  const stroke = border
    ? `<rect x="14" y="14" width="228" height="228" rx="28" fill="none" stroke="${border}" stroke-width="6"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <rect width="256" height="256" rx="40" fill="${bg}"/>
  ${stroke}
  <text x="128" y="178" font-family="Arial, Helvetica, sans-serif" font-size="140" font-weight="900" fill="${fg}" text-anchor="middle" letter-spacing="-4">DS</text>
</svg>`;
}

function markCircleSvg({ bg, fg, border }: { bg: string; fg: string; border: string | null }) {
  const stroke = border
    ? `<circle cx="128" cy="128" r="116" fill="none" stroke="${border}" stroke-width="6"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <circle cx="128" cy="128" r="124" fill="${bg}"/>
  ${stroke}
  <text x="128" y="178" font-family="Arial, Helvetica, sans-serif" font-size="140" font-weight="900" fill="${fg}" text-anchor="middle" letter-spacing="-4">DS</text>
</svg>`;
}

function roundStampSvg({ bg, panel, ink }: { bg: string | null; panel: string; ink: string }) {
  const bgRect = bg ? `<rect width="400" height="400" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  ${bgRect}
  <circle cx="200" cy="200" r="180" fill="${panel}"/>
  <circle cx="200" cy="200" r="168" fill="none" stroke="${ink}" stroke-width="2"/>
  <g fill="${ink}" font-family="Arial, Helvetica, sans-serif">
    <g transform="translate(200,76)">
      <path d="M0 4 L0 -16 M-7 -10 L0 -16 L7 -10" stroke="${ink}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="0" y="32" font-size="20" font-weight="500" text-anchor="middle" letter-spacing="3">N</text>
    </g>
    <text x="200" y="246" font-size="120" font-weight="900" text-anchor="middle" letter-spacing="-4">DS</text>
    <text x="200" y="320" font-size="18" font-weight="600" text-anchor="middle" letter-spacing="5">EST · 25</text>
    <line x1="135" y1="290" x2="265" y2="290" stroke="${ink}" stroke-width="1" />
  </g>
</svg>`;
}

function northMarkerSvg({ bg, panel, ink }: { bg: string | null; panel: string; ink: string }) {
  const bgRect = bg ? `<rect width="240" height="240" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  ${bgRect}
  <rect x="20" y="20" width="200" height="200" rx="100" fill="${panel}"/>
  <rect x="32" y="32" width="176" height="176" rx="88" fill="none" stroke="${ink}" stroke-width="3"/>
  <g fill="${ink}" font-family="Arial, Helvetica, sans-serif">
    <g transform="translate(120,100)">
      <path d="M0 12 L0 -32 M-14 -18 L0 -32 L14 -18" stroke="${ink}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <text x="120" y="172" font-size="42" font-weight="700" text-anchor="middle" letter-spacing="3">N</text>
  </g>
</svg>`;
}

/* ─────────────── Variant catalog ─────────────── */

type Category = "lockup" | "wordmark" | "mark" | "stamp";

type Variant = {
  id: string;
  title: string;
  description: string;
  category: Category;
  svg: string;
  previewBg: string;
  transparent?: boolean;
  pngWidths: number[];
};

const VARIANTS: Variant[] = [
  // ── Primary Lockups ──
  {
    id: "lockup-street-cream",
    title: "Street Sign · On Cream",
    description: "Hero lockup. The signature mark — use everywhere unless constrained.",
    category: "lockup",
    svg: streetSignSvg({ bg: CREAM, panel: NAVY, ink: "#ffffff" }),
    previewBg: CREAM,
    pngWidths: [800, 1600, 3200],
  },
  {
    id: "lockup-street-navy",
    title: "Street Sign · Reversed",
    description: "Cream panel on navy. Use over dark photos or as a hero on dark covers.",
    category: "lockup",
    svg: streetSignSvg({ bg: NAVY, panel: CREAM, ink: NAVY }),
    previewBg: NAVY,
    pngWidths: [800, 1600, 3200],
  },
  {
    id: "lockup-street-transparent",
    title: "Street Sign · Transparent",
    description: "No background. Drop onto any light surface.",
    category: "lockup",
    svg: streetSignSvg({ bg: null, panel: NAVY, ink: "#ffffff" }),
    previewBg: "#ffffff",
    transparent: true,
    pngWidths: [800, 1600, 3200],
  },
  {
    id: "lockup-street-mono-black",
    title: "Street Sign · Black",
    description: "Monochrome for print, fax, foil, embossing.",
    category: "lockup",
    svg: streetSignSvg({ bg: "#ffffff", panel: INK, ink: "#ffffff" }),
    previewBg: "#ffffff",
    pngWidths: [800, 1600, 3200],
  },
  {
    id: "lockup-street-mono-white",
    title: "Street Sign · White on Black",
    description: "Monochrome reverse. Use on overlays or dark print.",
    category: "lockup",
    svg: streetSignSvg({ bg: INK, panel: "#ffffff", ink: INK }),
    previewBg: INK,
    pngWidths: [800, 1600, 3200],
  },

  // ── Wordmarks ──
  {
    id: "wordmark-stacked-navy",
    title: "Wordmark · Stacked",
    description: "Two-line wordmark in navy. Great for letterhead, deck covers.",
    category: "wordmark",
    svg: wordmarkStackedSvg({ bg: CREAM, ink: NAVY }),
    previewBg: CREAM,
    pngWidths: [600, 1200, 2400],
  },
  {
    id: "wordmark-stacked-cream",
    title: "Wordmark · Stacked · Reversed",
    description: "Cream wordmark on navy. For dark backgrounds.",
    category: "wordmark",
    svg: wordmarkStackedSvg({ bg: NAVY, ink: CREAM }),
    previewBg: NAVY,
    pngWidths: [600, 1200, 2400],
  },
  {
    id: "wordmark-horizontal-navy",
    title: "Wordmark · Horizontal",
    description: "Single-line wordmark for tight horizontal spaces and signatures.",
    category: "wordmark",
    svg: wordmarkHorizontalSvg({ bg: CREAM, ink: NAVY }),
    previewBg: CREAM,
    pngWidths: [800, 1600, 3200],
  },
  {
    id: "wordmark-horizontal-transparent",
    title: "Wordmark · Horizontal · Transparent",
    description: "Single-line wordmark with no fill. Drop onto any surface.",
    category: "wordmark",
    svg: wordmarkHorizontalSvg({ bg: null, ink: NAVY }),
    previewBg: "#ffffff",
    transparent: true,
    pngWidths: [800, 1600, 3200],
  },

  // ── Marks / Monograms ──
  {
    id: "mark-square-navy",
    title: "DS Square · Navy",
    description: "App icon, favicon, avatar. The default mark.",
    category: "mark",
    svg: markSquareSvg({ bg: NAVY, fg: "#ffffff", border: "#ffffff" }),
    previewBg: CREAM,
    pngWidths: [256, 512, 1024],
  },
  {
    id: "mark-square-cream",
    title: "DS Square · Cream on Navy",
    description: "Warm-toned mark — pairs with the cream sign lockup.",
    category: "mark",
    svg: markSquareSvg({ bg: NAVY, fg: CREAM, border: CREAM }),
    previewBg: CREAM,
    pngWidths: [256, 512, 1024],
  },
  {
    id: "mark-square-black",
    title: "DS Square · Black",
    description: "Mono mark for print, embossing, foil.",
    category: "mark",
    svg: markSquareSvg({ bg: "#ffffff", fg: INK, border: INK }),
    previewBg: CREAM,
    pngWidths: [256, 512, 1024],
  },
  {
    id: "mark-circle-navy",
    title: "DS Circle · Navy",
    description: "Circular mark for social avatars, profile shots, badges.",
    category: "mark",
    svg: markCircleSvg({ bg: NAVY, fg: "#ffffff", border: "#ffffff" }),
    previewBg: CREAM,
    pngWidths: [256, 512, 1024],
  },
  {
    id: "mark-circle-cream",
    title: "DS Circle · Reversed",
    description: "Cream-on-navy circular mark.",
    category: "mark",
    svg: markCircleSvg({ bg: CREAM, fg: NAVY, border: NAVY }),
    previewBg: NAVY,
    pngWidths: [256, 512, 1024],
  },

  // ── Stamps / Badges ──
  {
    id: "stamp-round-navy",
    title: "Round Stamp · Navy",
    description: "Decorative seal with the street-sign elements. Use sparingly.",
    category: "stamp",
    svg: roundStampSvg({ bg: CREAM, panel: NAVY, ink: "#ffffff" }),
    previewBg: CREAM,
    pngWidths: [400, 800, 1600],
  },
  {
    id: "stamp-round-cream",
    title: "Round Stamp · Cream",
    description: "Cream seal on navy for reverse contexts.",
    category: "stamp",
    svg: roundStampSvg({ bg: NAVY, panel: CREAM, ink: NAVY }),
    previewBg: NAVY,
    pngWidths: [400, 800, 1600],
  },
  {
    id: "stamp-north-marker",
    title: "North Marker · Navy",
    description: "Standalone ↑ N badge — for footers, watermarks, end marks.",
    category: "stamp",
    svg: northMarkerSvg({ bg: CREAM, panel: NAVY, ink: "#ffffff" }),
    previewBg: CREAM,
    pngWidths: [240, 480, 960],
  },
];

/* ─────────────── Brand palette ─────────────── */

const PALETTE: { name: string; hex: string; usage: string; fg: string }[] = [
  { name: "Navy", hex: NAVY, usage: "Primary brand color · sign panel · accents", fg: "#ffffff" },
  { name: "Navy Soft", hex: NAVY_SOFT, usage: "Hover · secondary chrome", fg: "#ffffff" },
  { name: "Cream", hex: CREAM, usage: "Paper · page background", fg: INK },
  { name: "Cream Deep", hex: CREAM_DEEP, usage: "Card lifts · section dividers", fg: INK },
  { name: "Ink", hex: INK, usage: "Body text · mono prints", fg: "#ffffff" },
  { name: "Ink Soft", hex: INK_SOFT, usage: "Secondary text · captions", fg: "#ffffff" },
];

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

function downloadSvg(variant: Variant) {
  const blob = new Blob([variant.svg], { type: "image/svg+xml" });
  downloadBlob(blob, `deanst_${variant.id}.svg`);
}

async function svgToPngBlob(svg: string, width: number): Promise<Blob> {
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
    ctx.drawImage(img, 0, 0, width, height);
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!out) throw new Error("PNG encoding failed");
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function downloadPng(variant: Variant, width: number) {
  const blob = await svgToPngBlob(variant.svg, width);
  downloadBlob(blob, `deanst_${variant.id}_${width}.png`);
}

async function downloadBrandKit() {
  const zip = new JSZip();
  const svgDir = zip.folder("svg");
  const pngDir = zip.folder("png_1600");
  if (!svgDir || !pngDir) throw new Error("Could not initialize archive");

  for (const v of VARIANTS) {
    svgDir.file(`${v.id}.svg`, v.svg);
    // Pick a reasonable PNG size per variant — second-largest where
    // available. Avoids huge files while still being high-quality.
    const widthPick = v.pngWidths[Math.max(0, v.pngWidths.length - 2)];
    try {
      const png = await svgToPngBlob(v.svg, widthPick);
      pngDir.file(`${v.id}_${widthPick}.png`, png);
    } catch {
      // If a particular PNG fails we still want the rest of the bundle
    }
  }

  const readme = [
    "Dean St — Brand assets",
    "",
    "SVG: scalable, preferred for web and print.",
    "PNG: rasterized at standard widths for documents and decks.",
    "",
    "Palette:",
    ...PALETTE.map((p) => `  ${p.name.padEnd(12)} ${p.hex}   ${p.usage}`),
    "",
    "Typography: Arial / Helvetica (system grotesque).",
    "",
    "Questions: john@deanst.co",
  ].join("\n");
  zip.file("README.txt", readme);

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `deanst_brand_kit.zip`);
}

/* ─────────────── UI ─────────────── */

const CHECKER_BG: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, rgba(0,0,0,0.06) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,0.06) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.06) 75%), linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.06) 75%)",
  backgroundSize: "18px 18px",
  backgroundPosition: "0 0, 0 9px, 9px -9px, -9px 0",
};

const SECTIONS: { key: Category; title: string; subtitle: string; minWidth: number }[] = [
  { key: "lockup", title: "Primary Lockups", subtitle: "The full street-sign mark. The default whenever space allows.", minWidth: 340 },
  { key: "wordmark", title: "Wordmarks", subtitle: "Type-only versions of the mark. For when the box would be too heavy.", minWidth: 320 },
  { key: "mark", title: "Marks & Monograms", subtitle: "DS reductions — for avatars, favicons, and tight spaces.", minWidth: 240 },
  { key: "stamp", title: "Stamps & Badges", subtitle: "Decorative seals. Use sparingly, never as the primary identity.", minWidth: 240 },
];

export function LogoClient() {
  const [zipBusy, setZipBusy] = useState(false);
  const hero = VARIANTS.find((v) => v.id === "lockup-street-cream")!;

  async function handleZip() {
    if (zipBusy) return;
    setZipBusy(true);
    try {
      await downloadBrandKit();
      toast.success("Brand kit downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build archive");
    } finally {
      setZipBusy(false);
    }
  }

  return (
    <div style={{ padding: "32px 48px 60px", display: "flex", flexDirection: "column", gap: 36 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 28, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 540 }}>
          <Eyebrow size={10} spacing={0.36}>№ 09 · Brand</Eyebrow>
          <h1 style={{ fontFamily: "Arial, sans-serif", fontSize: 34, fontWeight: 600, letterSpacing: "-0.015em", marginTop: 6 }}>
            Dean St Brand Kit
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 6, lineHeight: 1.55 }}>
            Every variant of the mark, plus the color palette. SVGs scale infinitely
            and are preferred for web and print; PNGs are pre-rasterized at standard
            widths for documents and decks.
          </p>
        </div>
        <button onClick={handleZip} disabled={zipBusy} style={btnHero}>
          {zipBusy ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span className="dot-pulse" /> Building…
            </span>
          ) : (
            <>
              <Archive className="h-4 w-4" />
              Download brand kit (.zip)
            </>
          )}
        </button>
      </header>

      {/* Hero showcase */}
      <section
        style={{
          background: hero.previewBg,
          border: "1px solid var(--hair)",
          borderRadius: 12,
          padding: "44px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 360,
        }}
      >
        <div style={{ maxWidth: 720, width: "100%" }} dangerouslySetInnerHTML={{ __html: hero.svg }} />
      </section>

      {/* Sections */}
      {SECTIONS.map((section) => {
        const variants = VARIANTS.filter((v) => v.category === section.key);
        return (
          <section key={section.key} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SectionHeader title={section.title} subtitle={section.subtitle} count={variants.length} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(auto-fill, minmax(${section.minWidth}px, 1fr))`,
                gap: 16,
              }}
            >
              {variants.map((v) => <LogoCard key={v.id} variant={v} />)}
            </div>
          </section>
        );
      })}

      {/* Color palette */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SectionHeader
          title="Color Palette"
          subtitle="The full brand palette. Click any swatch to copy the hex."
          count={PALETTE.length}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {PALETTE.map((p) => <ColorSwatch key={p.hex} swatch={p} />)}
        </div>
      </section>

      <footer style={{ borderTop: "1px solid var(--hair)", paddingTop: 18, fontSize: 12, color: "var(--ink-faint)" }}>
        Typography: Arial / Helvetica · Questions: john@deanst.co
      </footer>

      {/* Local styles for the loading dot */}
      <style jsx>{`
        .dot-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          animation: pulse 1s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function SectionHeader({ title, subtitle, count }: { title: string; subtitle: string; count: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "1px solid var(--hair)", paddingBottom: 12 }}>
      <div>
        <Eyebrow size={10} spacing={0.32}>{title}</Eyebrow>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4, maxWidth: 520 }}>{subtitle}</div>
      </div>
      <div className="mono" style={{ fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-faint)" }}>
        {count.toString().padStart(2, "0")} VARIANT{count === 1 ? "" : "S"}
      </div>
    </div>
  );
}

function LogoCard({ variant }: { variant: Variant }) {
  const [pngBusy, setPngBusy] = useState<number | null>(null);

  async function handlePng(w: number) {
    setPngBusy(w);
    try {
      await downloadPng(variant, w);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export PNG");
    } finally {
      setPngBusy(null);
    }
  }

  const previewStyle: React.CSSProperties = {
    padding: "28px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
    borderBottom: "1px solid var(--hair)",
    ...(variant.transparent ? CHECKER_BG : { background: variant.previewBg }),
  };

  return (
    <article
      style={{
        background: "var(--paper)",
        border: "1px solid var(--hair)",
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "transform 160ms ease, box-shadow 160ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(29,60,142,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      <div style={previewStyle}>
        <div style={{ maxWidth: "100%", display: "flex" }} dangerouslySetInnerHTML={{ __html: variant.svg }} />
      </div>
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontFamily: "Arial, sans-serif", fontSize: 14, fontWeight: 600, letterSpacing: "-0.005em" }}>
              {variant.title}
            </div>
            {variant.transparent ? <TransparentBadge /> : null}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 3, lineHeight: 1.45 }}>
            {variant.description}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button onClick={() => downloadSvg(variant)} style={btnPrimary}>
            <Download className="h-3 w-3" /> SVG
          </button>
          {variant.pngWidths.map((w) => (
            <button
              key={w}
              onClick={() => handlePng(w)}
              disabled={pngBusy === w}
              style={{ ...btnGhost, opacity: pngBusy === w ? 0.5 : 1 }}
            >
              {pngBusy === w ? "…" : `${w}px`}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}

function TransparentBadge() {
  return (
    <span
      className="mono"
      style={{
        fontSize: 9,
        letterSpacing: "0.18em",
        padding: "2px 6px",
        borderRadius: 3,
        background: "var(--cream-deep)",
        color: "var(--ink-soft)",
        border: "1px solid var(--hair)",
      }}
    >
      TRANSPARENT
    </span>
  );
}

function ColorSwatch({ swatch }: { swatch: typeof PALETTE[number] }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(swatch.hex);
      setCopied(true);
      toast.success(`${swatch.hex} copied`);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <button
      onClick={copy}
      style={{
        background: "var(--paper)",
        border: "1px solid var(--hair)",
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: 0,
        textAlign: "left",
        cursor: "pointer",
        transition: "transform 160ms ease, box-shadow 160ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(29,60,142,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      <div
        style={{
          background: swatch.hex,
          color: swatch.fg,
          padding: "26px 16px",
          minHeight: 140,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div className="mono" style={{ fontSize: 11, letterSpacing: "0.2em", opacity: 0.8 }}>
          {copied ? "COPIED" : "CLICK TO COPY"}
        </div>
        <div style={{ fontFamily: "Arial, sans-serif", fontSize: 18, fontWeight: 600 }}>
          {swatch.name}
        </div>
      </div>
      <div style={{ padding: "12px 16px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div>
          <div className="mono" style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 600, letterSpacing: "0.04em" }}>
            {swatch.hex.toUpperCase()}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2, lineHeight: 1.4 }}>
            {swatch.usage}
          </div>
        </div>
        <span style={{ color: "var(--ink-faint)" }}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-3.5 w-3.5" />}
        </span>
      </div>
    </button>
  );
}

const btnHero: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 18px",
  fontSize: 13.5,
  fontWeight: 600,
  fontFamily: "Arial, sans-serif",
  background: "var(--ink)",
  color: "var(--paper)",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  transition: "background 120ms",
};

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 600,
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
  gap: 4,
  padding: "6px 10px",
  fontSize: 11.5,
  fontWeight: 500,
  fontFamily: "Arial, sans-serif",
  background: "var(--cream-light)",
  color: "var(--ink)",
  border: "1px solid var(--hair)",
  borderRadius: 6,
  cursor: "pointer",
};
