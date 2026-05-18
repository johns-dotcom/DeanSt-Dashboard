export function SignPlate({
  size = 1,
  label = "DEAN ST",
  sub = "CO",
}: {
  size?: number;
  label?: string;
  sub?: string;
}) {
  const px = (n: number) => `${n * size}px`;
  return (
    <span
      style={{
        background: "var(--sign-green)",
        color: "#fff",
        padding: `${8 * size}px ${16 * size}px ${10 * size}px`,
        borderRadius: 3 * size,
        border: `${1.5 * size}px solid #fff`,
        outline: `${1.5 * size}px solid var(--sign-green)`,
        display: "inline-block",
        flex: "none",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          fontFamily: '"DM Sans", sans-serif',
          fontWeight: 700,
          fontSize: px(20),
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}
      >
        {label}
        <span
          style={{
            fontSize: px(9),
            fontWeight: 500,
            marginLeft: px(5),
            verticalAlign: "middle",
            opacity: 0.85,
            letterSpacing: "0.06em",
          }}
        >
          {sub}
        </span>
      </span>
    </span>
  );
}
