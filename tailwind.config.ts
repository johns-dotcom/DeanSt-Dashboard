import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: {
        cream: "var(--cream)",
        "cream-light": "var(--cream-light)",
        "cream-deep": "var(--cream-deep)",
        paper: "var(--paper)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        "ink-faint": "var(--ink-faint)",
        hair: "var(--hair)",
        sign: "var(--sign-green)",
        "sign-soft": "var(--sign-green-soft)",
        accent: "var(--accent)",
        // Legacy compatibility — many existing components reference these
        base: "var(--cream)",
        surface: "var(--paper)",
        hover: "var(--cream-deep)",
        border: "var(--hair)",
        foreground: "var(--ink)",
        muted: {
          DEFAULT: "var(--cream-deep)",
          foreground: "var(--ink-soft)",
        },
        primary: {
          DEFAULT: "var(--sign-green)",
          foreground: "#ffffff",
        },
        success: { DEFAULT: "var(--sign-green)", foreground: "#ffffff" },
        warning: { DEFAULT: "rgba(201,100,66,0.18)", foreground: "var(--accent)" },
        danger: { DEFAULT: "rgba(160,30,30,0.12)", foreground: "#a01e1e" },
        info: { DEFAULT: "rgba(10,58,28,0.10)", foreground: "var(--sign-green)" },
      },
      fontFamily: {
        sans: ["Arial", "Helvetica", "sans-serif"],
        serif: ["Arial", "Helvetica", "sans-serif"],
        mono: ["Arial", "Helvetica", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "8px",
        lg: "10px",
      },
      fontWeight: { normal: "400", medium: "500", semibold: "600", bold: "700" },
      borderWidth: { hairline: "1px" },
      transitionDuration: { DEFAULT: "150ms" },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
