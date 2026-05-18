import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Dean St" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirectedFrom?: string; error?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-base px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium">
            D
          </div>
          <h1 className="text-lg font-medium">Dean St</h1>
          <p className="mt-1 text-xs text-muted-foreground">Internal operations dashboard</p>
        </div>
        <LoginForm
          redirectedFrom={searchParams.redirectedFrom}
          initialError={searchParams.error}
        />
      </div>
    </main>
  );
}
