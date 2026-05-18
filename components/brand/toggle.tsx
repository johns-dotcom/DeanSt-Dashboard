"use client";

export function Toggle({
  checked,
  onCheckedChange,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      style={{
        position: "relative",
        width: 44,
        height: 24,
        borderRadius: 999,
        background: checked ? "var(--sign-green)" : "var(--cream-deep)",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 160ms ease",
        flex: "none",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
          transition: "left 160ms ease",
          display: "block",
        }}
      />
    </button>
  );
}
