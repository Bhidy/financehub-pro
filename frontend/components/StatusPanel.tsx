import React from 'react';

const StatusCard = ({ title, value, subtext, color }: { title: string, value: string, subtext: string, color: string }) => (
  <div className={`p-6 bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-xl hover:bg-gray-800/50 transition-all duration-300 group`}>
    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">{title}</h3>
    <div className={`text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${color}`}>
      {value}
    </div>
    <div className="text-xs text-gray-500 mt-2 group-hover:text-gray-300 transition-colors">
      {subtext}
    </div>
  </div>
);

export default function StatusPanel() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatusCard 
        title="Active Threads" 
        value="0" 
        subtext="Concurrent connections" 
        color="from-blue-400 to-cyan-300" 
      />
      <StatusCard 
        title="Bypass Success" 
        value="100%" 
        subtext="WAF Evasion Rate" 
        color="from-emerald-400 to-green-300" 
      />
      <StatusCard 
        title="Data Thoughput" 
        value="0 KB/s" 
        subtext="Inbound JSON Stream" 
        color="from-purple-400 to-indigo-300" 
      />
      <StatusCard 
        title="Total Records" 
        value="0" 
        subtext="Rows in Database" 
        color="from-orange-400 to-amber-300" 
      />
    </div>
  );
}
