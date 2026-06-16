import { redirect } from "next/navigation";

// The Documents page has been replaced by the Clients section.
export default function DocumentsPage() {
  redirect("/dashboard/clients");
}
