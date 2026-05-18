import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeScript } from "@/components/theme-script";

export const metadata: Metadata = {
  title: "Dean St",
  description: "Dean St — internal operations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="bg-base text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
