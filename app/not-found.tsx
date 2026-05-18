import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="rounded-lg border-hairline border-border bg-surface p-8 text-center max-w-sm">
        <h1 className="text-base font-medium">Page not found</h1>
        <p className="mt-1 text-xs text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-xs underline">Go to dashboard</Link>
      </div>
    </main>
  );
}
