import { TrendingUp, PieChart, Newspaper, LucideIcon } from "lucide-react";
import clsx from "clsx";

interface EvidenceCardProps {
    title: string;
    icon: LucideIcon;
    children: React.ReactNode;
    color: "emerald" | "blue" | "amber";
}

export function EvidenceCard({ title, icon: Icon, children, color }: EvidenceCardProps) {
    const colorStyles = {
        emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
        blue: "bg-blue-50 text-blue-700 border-blue-100",
        amber: "bg-amber-50 text-amber-700 border-amber-100",
    };

    const style = colorStyles[color] || colorStyles.blue;

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className={`px-3 py-2 flex items-center gap-2 border-b ${style.replace("bg-", "border-").split(" ")[2]} ${style}`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs font-bold uppercase tracking-wide">{title}</span>
            </div>
            <div className="p-3">
                {children}
            </div>
        </div>
    );
}
