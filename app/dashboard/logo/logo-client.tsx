"use client";

import { useState } from "react";
import { Copy, Check, Archive } from "lucide-react";
import { toast } from "sonner";
import { Eyebrow } from "@/components/brand/eyebrow";
import { flexSvg, VARIANTS, SECTIONS, PALETTE, type Variant, type RasterFormat } from "./logo-art";
import { downloadRaster, downloadBrandKit } from "./logo-download";

/* ─────────────── UI ─────────────── */

const CHECKER_BG: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,0.05) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.05) 75%), linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.05) 75%)",
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0",
  background: "#fbfaf6",
};

export function LogoClient() {
  const [zipBusy, setZipBusy] = useState(false);
  const siteHero = VARIANTS.find((v) => v.id === "site-logo-navy")!;
  const streetHero = VARIANTS.find((v) => v.id === "lockup-street-cream")!;

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
    <div style={{ padding: "32px 40px 64px", display: "flex", flexDirection: "column", gap: 44 }}>
      {/* ─── Header ─── */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 600 }}>
          <Eyebrow size={10} spacing={0.36}>№ 09 · Brand</Eyebrow>
          <h1 style={{ fontFamily: "Arial, sans-serif", fontSize: 32, fontWeight: 600, letterSpacing: "-0.015em", marginTop: 8, marginBottom: 0, lineHeight: 1.1 }}>
            Brand Kit
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 10, lineHeight: 1.55, marginBottom: 0 }}>
            Every variant of the Dean St mark, plus the color palette. SVGs scale
            infinitely; PNGs are pre-rasterized at standard widths for documents
            and decks.
          </p>
        </div>
        <button onClick={handleZip} disabled={zipBusy} style={btnHero}>
          {zipBusy ? "Building archive…" : (<><Archive className="h-4 w-4" /> Download brand kit (.zip)</>)}
        </button>
      </header>

      {/* ─── Hero showcase: site logo + street sign side-by-side ─── */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 1fr) minmax(360px, 1.4fr)",
          gap: 16,
        }}
      >
        <HeroPanel
          label="Used in the app chrome"
          variant={siteHero}
          aspect="2.5/1"
        />
        <HeroPanel
          label="Hero lockup"
          variant={streetHero}
          aspect="1.3/1"
        />
      </section>

      {/* ─── Sections ─── */}
      {SECTIONS.map((section) => {
        const variants = VARIANTS.filter((v) => v.category === section.key);
        return (
          <section key={section.key} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <SectionHeader numeral={section.numeral} title={section.title} subtitle={section.subtitle} count={variants.length} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(auto-fill, minmax(${section.minWidth}px, 1fr))`,
                gap: 14,
              }}
            >
              {variants.map((v) => <LogoCard key={v.id} variant={v} />)}
            </div>
          </section>
        );
      })}

      {/* ─── Palette ─── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <SectionHeader
          numeral="VI"
          title="Color Palette"
          subtitle="The full brand palette. Click a swatch to copy the hex."
          count={PALETTE.length}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          {PALETTE.map((p) => <ColorSwatch key={p.hex} swatch={p} />)}
        </div>
      </section>

      <footer style={{ borderTop: "1px solid var(--hair)", paddingTop: 18, fontSize: 12, color: "var(--ink-faint)", display: "flex", justifyContent: "space-between" }}>
        <span>Typography · Arial / Helvetica</span>
        <span>Questions · john@deanst.co</span>
      </footer>
    </div>
  );
}

function HeroPanel({ variant, label, aspect }: { variant: Variant; label: string; aspect: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.32em", color: "var(--ink-faint)" }}>
        {label.toUpperCase()}
      </div>
      <div
        style={{
          background: variant.previewBg,
          border: "1px solid var(--hair)",
          borderRadius: 12,
          aspectRatio: aspect,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          overflow: "hidden",
        }}
      >
        <div
          style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
          dangerouslySetInnerHTML={{ __html: flexSvg(variant.svg) }}
        />
      </div>
    </div>
  );
}

function SectionHeader({ numeral, title, subtitle, count }: { numeral: string; title: string; subtitle: string; count: number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        borderTop: "1px solid var(--hair)",
        paddingTop: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            color: "var(--ink-faint)",
            minWidth: 28,
          }}
        >
          {numeral}
        </span>
        <div>
          <div style={{ fontFamily: "Arial, sans-serif", fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {title}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-faint)", paddingBottom: 2 }}>
        {count.toString().padStart(2, "0")} VARIANT{count === 1 ? "" : "S"}
      </div>
    </div>
  );
}

function LogoCard({ variant }: { variant: Variant }) {
  const [hovered, setHovered] = useState(false);
  const [format, setFormat] = useState<RasterFormat>("png");
  const [busy, setBusy] = useState<number | null>(null);

  async function handleRaster(w: number) {
    setBusy(w);
    try {
      await downloadRaster(variant, w, format);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export image");
    } finally {
      setBusy(null);
    }
  }

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--paper)",
        border: `1px solid ${hovered ? "var(--ink-faint)" : "var(--hair)"}`,
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "border-color 120ms ease",
      }}
    >
      {/* Preview area — fixed height so cards line up across the grid */}
      <div
        style={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px 22px",
          borderBottom: "1px solid var(--hair)",
          overflow: "hidden",
          ...(variant.transparent ? CHECKER_BG : { background: variant.previewBg }),
        }}
      >
        <div
          style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
          dangerouslySetInnerHTML={{ __html: flexSvg(variant.svg) }}
        />
      </div>
      {/* Meta + downloads */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontFamily: "Arial, sans-serif", fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.005em" }}>
              {variant.title}
            </div>
            {variant.transparent ? <TransparentBadge /> : null}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4, lineHeight: 1.45 }}>
            {variant.description}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5 }}>
          <FormatToggle value={format} onChange={setFormat} />
          {variant.pngWidths.map((w) => (
            <button
              key={w}
              onClick={() => handleRaster(w)}
              disabled={busy === w}
              style={{ ...chip, opacity: busy === w ? 0.5 : 1 }}
              title={`Download ${format === "jpeg" ? "JPG" : "PNG"} · ${w}px wide`}
            >
              {busy === w ? "…" : `${w}`}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}

function FormatToggle({ value, onChange }: { value: RasterFormat; onChange: (f: RasterFormat) => void }) {
  const opts: { v: RasterFormat; label: string }[] = [
    { v: "png", label: "PNG" },
    { v: "jpeg", label: "JPG" },
  ];
  return (
    <span style={{ display: "inline-flex", border: "1px solid var(--hair)", borderRadius: 5, overflow: "hidden" }}>
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          title={`Export as ${o.label}`}
          style={{
            padding: "5px 8px",
            fontSize: 10.5,
            fontWeight: 600,
            fontFamily: "Arial, sans-serif",
            letterSpacing: "0.04em",
            border: "none",
            cursor: "pointer",
            background: value === o.v ? "var(--cream-deep)" : "var(--paper)",
            color: value === o.v ? "var(--ink)" : "var(--ink-faint)",
          }}
        >
          {o.label}
        </button>
      ))}
    </span>
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
  const [hovered, setHovered] = useState(false);

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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--paper)",
        border: `1px solid ${hovered ? "var(--ink-faint)" : "var(--hair)"}`,
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: 0,
        textAlign: "left",
        cursor: "pointer",
        transition: "border-color 120ms ease",
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
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.22em", opacity: 0.8 }}>
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
};

const chip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 9px",
  fontSize: 11.5,
  fontWeight: 500,
  fontFamily: "Arial, sans-serif",
  background: "var(--cream-light)",
  color: "var(--ink)",
  border: "1px solid var(--hair)",
  borderRadius: 5,
  cursor: "pointer",
  minWidth: 38,
  justifyContent: "center",
};

