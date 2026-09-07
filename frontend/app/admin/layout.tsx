import type { Metadata } from 'next';
import AdminGate from '@/components/admin/AdminGate';
import AdminShell from '@/components/admin/AdminShell';

export const metadata: Metadata = {
    title: 'Admin',
    robots: { index: false, follow: false },
};

// Two concerns, in order, for the whole /admin tree:
//   AdminGate   — WHO may be here (see its header for the two ways the
//                 per-page copies of this check were broken).
//   AdminShell  — WHERE they are: the console's own chrome, deliberately
//                 unlike the public site's.
//
// Gate outside shell, deliberately: someone who is not an admin must never see
// the console's navigation, not even briefly. Rendering the shell first would
// paint the rail — with its section list — behind the access-denied card.
//
// Pages under here must not re-implement either concern.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminGate>
            <AdminShell>{children}</AdminShell>
        </AdminGate>
    );
}
