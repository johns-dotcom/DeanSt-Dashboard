export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px 28px",
        gap: 14,
        textAlign: "center",
      }}
    >
      {icon ? (
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "var(--cream-deep)",
            color: "var(--sign-green)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
      ) : null}
      <div
        className="serif"
        style={{ fontSize: 24, lineHeight: 1.1, color: "var(--ink)", fontStyle: "italic" }}
      >
        {title}
      </div>
      {description ? (
        <div style={{ fontSize: 14, color: "var(--ink-soft)", maxWidth: 320, lineHeight: 1.5 }}>
          {description}
        </div>
      ) : null}
      {action ? <div style={{ marginTop: 4 }}>{action}</div> : null}
    </div>
  );
}
