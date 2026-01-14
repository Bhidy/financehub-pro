"use client";

import { useState } from "react";
import { Mail, Smartphone, Zap, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export default function NotificationsTab() {
    const [toggles, setToggles] = useState({
        email_alerts: true,
        push_notifs: false,
        weekly_report: true,
        security_alert: true,
    });

    const toggle = (key: keyof typeof toggles) => {
        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="max-w-2xl space-y-8">
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Notification Preferences</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Control when and how we contact you.</p>

                <div className="space-y-4">
                    <NotificationItem
                        icon={Mail}
                        title="Email Price Alerts"
                        description="Receive immediate emails when your price targets are hit."
                        isOn={toggles.email_alerts}
                        onToggle={() => toggle('email_alerts')}
                    />
                    <NotificationItem
                        icon={Smartphone}
                        title="Push Notifications"
                        description="Get push notifications on your mobile device."
                        isOn={toggles.push_notifs}
                        onToggle={() => toggle('push_notifs')}
                    />
                    <NotificationItem
                        icon={Zap}
                        title="Weekly Market Report"
                        description="A summary of market performance sent every Sunday."
                        isOn={toggles.weekly_report}
                        onToggle={() => toggle('weekly_report')}
                    />
                    <NotificationItem
                        icon={ShieldAlert}
                        title="Security Alerts"
                        description="Get notified about new sign-ins or suspicious activity."
                        isOn={toggles.security_alert}
                        onToggle={() => toggle('security_alert')}
                    />
                </div>
            </div>
        </div>
    );
}

function NotificationItem({ icon: Icon, title, description, isOn, onToggle }: any) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-4">
                <div className="p-2.5 bg-white dark:bg-white/10 rounded-lg shadow-sm text-slate-600 dark:text-slate-300">
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
                </div>
            </div>

            <button
                onClick={onToggle}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    ${isOn ? 'bg-blue-600' : 'bg-slate-200 dark:bg-white/10'}`}
            >
                <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`inline-block w-5 h-5 transform bg-white rounded-full shadow pointer-events-none mt-0.5 ml-0.5
                        ${isOn ? 'translate-x-5' : 'translate-x-0'}`}
                />
            </button>
        </div>
    );
}
