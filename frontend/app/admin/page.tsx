import { redirect } from "next/navigation";

// The admin area has no standalone index dashboard — its console lives at
// /admin/analytics (with /admin/users alongside). Sending bare /admin there
// so the URL "just works" instead of 404ing.
export default function AdminIndexPage() {
    redirect("/admin/analytics");
}
