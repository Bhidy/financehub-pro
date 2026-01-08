"use client";

import { useState, useEffect } from "react";
import { fetchUsers } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, Shield, AlertCircle, CheckCircle, Mail, Calendar, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function UsersTab() {
    const [page, setPage] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const limit = 50;

    // Fetch users with React Query
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ["admin-users", page, searchTerm],
        queryFn: () => fetchUsers(page * limit, limit, searchTerm || undefined),
        keepPreviousData: true,
    });

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            refetch();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, refetch]);

    const users = data?.users || [];
    const total = data?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        User Management
                    </h3>
                    <p className="text-sm text-slate-500">View and manage all registered users.</p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(0); // Reset to first page on search
                        }}
                        placeholder="Search by email or name..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold">User Info</th>
                                <th className="px-6 py-4 font-semibold">Role</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold">Joined At</th>
                                <th className="px-6 py-4 font-semibold">Last Login</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                            <span>Loading users...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : isError ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-red-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <AlertCircle className="w-6 h-6" />
                                            <span>Failed to load users: {error instanceof Error ? error.message : "Unknown error"}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user: any) => (
                                    <motion.tr
                                        key={user.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="hover:bg-slate-50/50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm">
                                                    {user.full_name ? user.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">{user.full_name || "No Name"}</div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize
                                                ${user.role === 'admin'
                                                    ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                                    : 'bg-blue-50 text-blue-700 border border-blue-100'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold capitalize
                                                ${user.is_active
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                    : 'bg-red-50 text-red-700 border border-red-100'
                                                }`}>
                                                {user.is_active ? (
                                                    <><CheckCircle className="w-3 h-3" /> Active</>
                                                ) : (
                                                    <><AlertCircle className="w-3 h-3" /> Inactive</>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium text-slate-500">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium text-slate-500">
                                            {user.last_login ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    {new Date(user.last_login).toLocaleDateString()}
                                                </div>
                                            ) : (
                                                "Never"
                                            )}
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            className="text-sm font-medium text-slate-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-xs font-medium text-slate-400">
                            Page {page + 1} of {totalPages}
                        </span>
                        <button
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                            className="text-sm font-medium text-slate-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                    <div className="text-2xl font-bold text-blue-700">{total}</div>
                    <div className="text-xs font-medium text-blue-600/80">Total Users</div>
                </div>
                <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
                    <div className="text-2xl font-bold text-emerald-700">
                        {users ? users.filter((u: any) => u.is_active).length : '-'}
                    </div>
                    <div className="text-xs font-medium text-emerald-600/80">Active Now</div>
                </div>
                <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100">
                    <div className="text-2xl font-bold text-purple-700">
                        {users ? users.filter((u: any) => u.role === 'admin').length : '-'}
                    </div>
                    <div className="text-xs font-medium text-purple-600/80">Admins</div>
                </div>
            </div>
        </div>
    );
}
