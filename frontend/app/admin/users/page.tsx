"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
    Users, Search, Download, RefreshCw, Mail, Phone, Calendar,
    Shield, ChevronLeft, ChevronRight, Loader2, AlertCircle
} from "lucide-react";

interface User {
    id: number;
    email: string;
    full_name: string | null;
    phone: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
    last_login: string | null;
}

interface UsersResponse {
    users: User[];
    total: number;
    skip: number;
    limit: number;
}

export default function AdminUsersPage() {
    const router = useRouter();
    const { user, isAuthenticated, getToken } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const limit = 20;

    // Check admin access
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        if (user?.role !== 'admin') {
            setError('Admin access required');
            return;
        }
    }, [isAuthenticated, user, router]);

    // Fetch users
    const fetchUsers = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const token = getToken();
            const params = new URLSearchParams({
                skip: String(page * limit),
                limit: String(limit),
            });
            if (search) params.append('search', search);

            const response = await fetch(`/api/v1/auth/users?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('Admin access required');
                }
                throw new Error('Failed to fetch users');
            }

            const data: UsersResponse = await response.json();
            setUsers(data.users);
            setTotal(data.total);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated && user?.role === 'admin') {
            fetchUsers();
        }
    }, [isAuthenticated, user, page, search]);

    // Export to CSV
    const exportCSV = () => {
        const headers = ['ID', 'Full Name', 'Email', 'Phone', 'Role', 'Active', 'Created At', 'Last Login'];
        const rows = users.map(u => [
            u.id,
            u.full_name || '',
            u.email,
            u.phone || '',
            u.role,
            u.is_active ? 'Yes' : 'No',
            new Date(u.created_at).toLocaleDateString(),
            u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Never';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const totalPages = Math.ceil(total / limit);

    if (error === 'Admin access required') {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                    <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
                    <p className="text-slate-500 mb-4">You don't have permission to view this page.</p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] transition-colors duration-300 relative">
            {/* Background Ambient Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-20%] left-[-15%] w-[60%] h-[60%] bg-[#14B8A6]/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-20%] right-[-15%] w-[60%] h-[60%] bg-[#3B82F6]/5 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/80 dark:bg-[#0B1121]/80 border-b border-slate-200 dark:border-white/[0.08]">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#0F172A] to-[#1E293B] dark:from-[#1E293B] dark:to-[#0F172A] rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/10">
                                <Users className="w-5 h-5 text-[#3B82F6]" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Registered Users
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{total} users in database</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 relative z-10">
                            {/* Search */}
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#3B82F6] transition-colors" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search users..."
                                    className="pl-9 pr-4 py-2 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6]/50 outline-none w-64 shadow-sm"
                                />
                            </div>

                            {/* Refresh */}
                            <button
                                onClick={fetchUsers}
                                disabled={isLoading}
                                className="p-2.5 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-white/[0.02] rounded-xl transition-colors border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 shadow-sm disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#3B82F6]' : ''}`} />
                            </button>

                            {/* Export */}
                            <button
                                onClick={exportCSV}
                                disabled={users.length === 0}
                                className="px-4 py-2.5 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-white/[0.02] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm font-bold flex items-center gap-2 hover:text-[#3B82F6] dark:hover:text-[#3B82F6] transition-all disabled:opacity-50 shadow-sm"
                            >
                                <Download className="w-4 h-4" />
                                Export CSV
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <p className="text-red-500">{error}</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-white/[0.08] shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden relative group transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#3B82F6]/5 via-transparent to-[#14B8A6]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0" />
                        <div className="overflow-x-auto relative z-10 w-full">
                            <table className="w-full">
                                <thead className="bg-slate-50/50 dark:bg-[#0B1121]/50 border-b border-slate-100 dark:border-white/[0.08]">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">User</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contact</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Role</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Registered</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Last Login</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                                    {users.map((u) => (
                                        <motion.tr
                                            key={u.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-100 dark:bg-[#0B1121] rounded-full flex items-center justify-center text-[#3B82F6] font-bold border border-slate-200 dark:border-white/[0.08] shadow-sm">
                                                        {(u.full_name || u.email).charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900 dark:text-white">{u.full_name || 'No name'}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">ID: #{u.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-l border-transparent">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                        {u.email}
                                                    </div>
                                                    {u.phone && (
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                            <Phone className="w-3 h-3 text-slate-400" />
                                                            {u.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest ${u.role === 'admin'
                                                    ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30'
                                                    : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {formatDate(u.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                {formatDate(u.last_login)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${u.is_active
                                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                                                    : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
                                                    }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                    <span className="text-xs font-bold">{u.is_active ? 'Active' : 'Inactive'}</span>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 bg-slate-50/50 dark:bg-[#0B1121]/50 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between relative z-10 w-full">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of <span className="font-bold text-slate-900 dark:text-white">{total}</span>
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                        className="p-1.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.1] rounded-lg disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors text-slate-600 dark:text-slate-400"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="px-3 py-1 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.1] rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {page + 1} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                        disabled={page >= totalPages - 1}
                                        className="p-1.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.1] rounded-lg disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors text-slate-600 dark:text-slate-400"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
