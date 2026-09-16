import { redirect } from "next/navigation";

// Per-client pages moved under /dashboard/documents; forward the old links.
export default function ClientPage({ params }: { params: { slug: string } }) {
  redirect(`/dashboard/documents/${params.slug}`);
}
