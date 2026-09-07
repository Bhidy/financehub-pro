import { redirect } from "next/navigation";

// The admin area has no standalone index dashboard, so bare /admin lands on the
// first console in the rail rather than 404ing. That is /admin/users: Analytics
// and Guest sessions are both `hidden: true` in lib/admin-nav.ts, and sending
// people to a page the navigation deliberately stopped offering left them
// somewhere with no way back to the console they actually came for.
export default function AdminIndexPage() {
    redirect("/admin/users");
}
