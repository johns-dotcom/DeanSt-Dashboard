import { redirect } from "next/navigation";

// The Clients section is now called Documents. Kept so existing links and
// bookmarks still land in the right place.
export default function ClientsPage() {
  redirect("/dashboard/documents");
}
