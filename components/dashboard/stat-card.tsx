import { SignPlate } from "@/components/brand/sign-plate";
import { Eyebrow } from "@/components/brand/eyebrow";

export function StatCard({
  label,
  value,
  prefix,
  sub,
  plate,
}: {
  label: string;
  value: React.ReactNode;
  prefix?: string;
  sub?: React.ReactNode;
  plate?: { label: string; sub: string };
}) {
  return (
    <section
      style={{
        background: "var(--paper)",
        border: "1px solid var(--hair)",
        borderRadius: 10,
        padding: "22px 24px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <Eyebrow size={10.5}>{label}</Eyebrow>
        {plate ? <SignPlate size={0.55} label={plate.label} sub={plate.sub} /> : null}
      </div>

      <div
        style={{
          marginTop: 18,
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          lineHeight: 1,
          fontFamily: 'Arial, sans-serif',
          letterSpacing: "-0.03em",
          color: "var(--ink)",
        }}
      >
        {prefix ? (
          <span style={{ fontSize: 26, fontWeight: 500, color: "var(--ink-soft)" }}>{prefix}</span>
        ) : null}
        <span style={{ fontSize: 48, fontWeight: 700 }}>{value}</span>
      </div>

      {sub ? (
        <div
          className="serif"
          style={{ fontSize: 18, color: "var(--ink-soft)", marginTop: 10, fontStyle: "italic" }}
        >
          {sub}
        </div>
      ) : null}
    </section>
  );
}
