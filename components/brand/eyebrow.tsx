export function Eyebrow({
  children,
  size = 10,
  spacing = 0.34,
  className,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  spacing?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`mono text-ink-faint ${className ?? ""}`}
      style={{ fontSize: size, letterSpacing: `${spacing}em`, ...style }}
    >
      {children}
    </span>
  );
}
