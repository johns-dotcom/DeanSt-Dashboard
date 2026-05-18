import Link from "next/link";
import { Eyebrow } from "@/components/brand/eyebrow";
import { ArrowIcon } from "@/components/brand/icons";

export function ListCard({
  kicker,
  title,
  href,
  children,
}: {
  kicker: string;
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "var(--paper)",
        border: "1px solid var(--hair)",
        borderRadius: 10,
        padding: "24px 26px 26px",
        display: "flex",
        flexDirection: "column",
        minHeight: 360,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          paddingBottom: 14,
          borderBottom: "1px solid var(--hair)",
          marginBottom: 18,
          gap: 12,
        }}
      >
        <div>
          <Eyebrow size={10}>{kicker}</Eyebrow>
          <h3
            style={{
              fontFamily: 'Arial, sans-serif',
              fontSize: 19,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              marginTop: 4,
              color: "var(--ink)",
            }}
          >
            {title}
          </h3>
        </div>
        {href ? (
          <Link
            href={href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--sign-green)",
              textDecoration: "none",
            }}
          >
            View all
            <ArrowIcon />
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  );
}
