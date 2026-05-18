export function PageFooter() {
  return (
    <div
      className="flex justify-between"
      style={{
        marginTop: 8,
        paddingTop: 16,
        borderTop: "1px solid var(--hair)",
      }}
    >
      <span
        className="mono text-ink-faint"
        style={{ fontSize: 9.5, letterSpacing: "0.32em" }}
      >
        Dean Street Consulting
      </span>
      <span
        className="mono text-ink-faint"
        style={{ fontSize: 9.5, letterSpacing: "0.32em" }}
      >
        Vision → Velocity
      </span>
    </div>
  );
}
