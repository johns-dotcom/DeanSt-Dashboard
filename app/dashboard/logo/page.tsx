import { requireSession } from "@/lib/auth/workspace";
import { LogoClient } from "./logo-client";

export default async function LogoPage() {
  await requireSession();
  return <LogoClient />;
}
