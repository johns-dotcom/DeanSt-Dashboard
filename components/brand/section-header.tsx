export function SectionHeader({
  number,
  kicker,
  title,
}: {
  number: string;
  kicker: string;
  title: string;
}) {
  return (
    <div className="mb-3.5">
      <div
        className="mono text-ink-faint"
        style={{ fontSize: 10, letterSpacing: "0.34em" }}
      >
        № {number} · {kicker}
      </div>
      <h2
        style={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.015em",
          marginTop: 4,
          color: "var(--ink)",
        }}
      >
        {title}
      </h2>
    </div>
  );
}
