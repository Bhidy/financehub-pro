import React from "react";
import clsx from "clsx";
import { ArrowUpRight, ArrowDownRight, Trophy, Medal, Award } from "lucide-react";
import { useRouter } from "next/navigation";

interface Peer {
    ranking: number;
    fund_id: string;
    peer_name: string;
    one_year_return: number | null;
    three_year_return: number | null;
    five_year_return: number | null;
}

interface PeersTableProps {
    peers: Peer[];
    currentFundId: string;
}

const safeNumber = (val: any) => {
    const num = Number(val);
    return isFinite(num) ? num : null;
};

export default function PeersTable({ peers, currentFundId }: PeersTableProps) {
    const router = useRouter();

    if (!peers || peers.length === 0) {
        return (
            <div className="text-center py-8 text-slate-400 text-sm font-medium italic">
                No peer comparison data available.
            </div>
        );
    }

    // Sort by rank just in case
    const sortedPeers = [...peers].sort((a, b) => a.ranking - b.ranking);

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Trophy className="w-4 h-4 text-amber-400" fill="currentColor" />;
        if (rank === 2) return <Medal className="w-4 h-4 text-slate-400" fill="currentColor" />;
        if (rank === 3) return <Award className="w-4 h-4 text-orange-400" fill="currentColor" />;
        return <span className="text-slate-500 font-bold text-xs">#{rank}</span>;
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider font-bold text-slate-400 text-left">
                        <th className="py-3 pl-4">Rank</th>
                        <th className="py-3">Fund Name</th>
                        <th className="py-3 text-right">1 Year</th>
                        <th className="py-3 text-right">3 Years</th>
                        <th className="py-3 text-right pr-4">5 Years</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {sortedPeers.map((peer) => {
                        const isCurrent = peer.fund_id === currentFundId;
                        const ret1 = safeNumber(peer.one_year_return);
                        const ret3 = safeNumber(peer.three_year_return);
                        const ret5 = safeNumber(peer.five_year_return);

                        return (
                            <tr
                                key={peer.fund_id}
                                onClick={() => router.push(`/funds/${peer.fund_id}`)}
                                className={clsx(
                                    "border-b border-slate-50 last:border-0 transition-colors cursor-pointer group",
                                    isCurrent ? "bg-blue-50/60 hover:bg-blue-50" : "hover:bg-slate-50"
                                )}
                            >
                                <td className="py-3 pl-4">
                                    <div className={clsx(
                                        "w-8 h-8 rounded-full flex items-center justify-center",
                                        isCurrent ? "bg-blue-100 shadow-inner" : "bg-slate-50"
                                    )}>
                                        {getRankIcon(peer.ranking)}
                                    </div>
                                </td>
                                <td className="py-3">
                                    <div className={clsx(
                                        "font-bold leading-tight max-w-[200px] line-clamp-2",
                                        isCurrent ? "text-blue-700" : "text-slate-700 group-hover:text-blue-600"
                                    )}>
                                        {peer.peer_name}
                                    </div>
                                    {isCurrent && <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Current Fund</span>}
                                </td>

                                <td className="py-3 text-right font-mono font-medium">
                                    {ret1 !== null ? (
                                        <span className={ret1 >= 0 ? "text-emerald-600" : "text-red-500"}>
                                            {ret1 > 0 ? "+" : ""}{ret1.toFixed(1)}%
                                        </span>
                                    ) : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="py-3 text-right font-mono font-medium">
                                    {ret3 !== null ? (
                                        <span className={ret3 >= 0 ? "text-emerald-600" : "text-red-500"}>
                                            {ret3 > 0 ? "+" : ""}{ret3.toFixed(1)}%
                                        </span>
                                    ) : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="py-3 text-right pr-4 font-mono font-medium">
                                    {ret5 !== null ? (
                                        <span className={ret5 >= 0 ? "text-emerald-600" : "text-red-500"}>
                                            {ret5 > 0 ? "+" : ""}{ret5.toFixed(1)}%
                                        </span>
                                    ) : <span className="text-slate-300">—</span>}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
