"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import SettingsLayout from "@/components/settings/SettingsLayout";
import ProfileTab from "@/components/settings/ProfileTab";
import AppearanceTab from "@/components/settings/AppearanceTab";
import NotificationsTab from "@/components/settings/NotificationsTab";
import UsersTab from "@/components/settings/UsersTab";
import GeneralTab from "@/components/settings/GeneralTab";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
    const { user, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("general");

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#0B1121]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-500" />
            </div>
        );
    }

    if (!user) return null; // Should redirect via effect

    const isAdmin = user.role === "admin";

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage your account preferences and system settings.</p>
            </div>

            <SettingsLayout
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isAdmin={isAdmin}
            >
                {activeTab === "general" && <GeneralTab />}
                {activeTab === "profile" && <ProfileTab />}
                {activeTab === "appearance" && <AppearanceTab />}
                {activeTab === "notifications" && <NotificationsTab />}
                {activeTab === "users" && isAdmin && <UsersTab />}
            </SettingsLayout>
        </div>
    );
}
