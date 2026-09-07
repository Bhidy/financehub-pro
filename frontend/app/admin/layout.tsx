import type { Metadata } from 'next';
import AdminGate from '@/components/admin/AdminGate';

export const metadata: Metadata = {
    title: 'Admin',
    robots: { index: false, follow: false },
};

// Authorization for the whole /admin tree lives in ONE place. Pages under here
// must not re-implement it — see the header of AdminGate for the two ways the
// per-page copies were broken.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <AdminGate>{children}</AdminGate>;
}
