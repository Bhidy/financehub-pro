const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('/Users/home/Documents/Info Site/finhub-pro/frontend/app/egx/[symbol]/page.tsx');
let src = fs.readFileSync(targetFile, 'utf8');

// 1. Rename GlassCard to Card globally
src = src.replace(/GlassCard/g, 'Card');

// 2. Replace the old itemVariants and GlassCard definition with the new Minimalist Card
// We will use a split/join to strictly extract the definition block

const oldCardStart = src.indexOf("const itemVariants = {");
const oldCardEnd = src.indexOf("const TabButton =") - 1;

if (oldCardStart !== -1 && oldCardEnd !== -1) {
    const newCardDef = `const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { ease: "circOut", duration: 0.4 } }
};

const Card = ({ children, className = '', noPadding = false, premium = false, ...props }: any) => (
    <motion.section
        variants={itemVariants}
        {...props}
        className={clsx(
            "group/card relative overflow-hidden rounded-xl transition-all duration-200",
            "border border-[#e5e7eb] dark:border-[#27272a]",
            "bg-white dark:bg-[#09090b]",
            "shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none dark:hover:border-[#3f3f46]",
            !noPadding && "p-6",
            className
        )}
    >
        <div className="relative z-10">{children}</div>
    </motion.section>
);

`;
    src = src.substring(0, oldCardStart) + newCardDef + src.substring(oldCardEnd);
}

// 3. Strip massive background orbs
const heroBgRegex = /<div className="pointer-events-none absolute inset-0 overflow-hidden">[\s\S]*?<\/div>\n\s*\{\/\* === HERO HEADER/m;
src = src.replace(heroBgRegex, '{/* === HERO HEADER');

// 4. Strip Header internal orbs and background
const headerRegex = /<header className="relative z-40 w-full overflow-hidden border-b border-white\/20 bg-white\/20 pt-\[5dvh\] pb-8 backdrop-blur-3xl dark:border-white\/\[0\.05\] dark:bg-\[#050B17\]\/40 shadow-sm">\n\s*<div className="pointer-events-none absolute inset-0 overflow-hidden">[\s\S]*?<\/div>/m;
const newHeader = `<header className="relative w-full border-b border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#000000] pt-[6dvh] pb-8">`;
src = src.replace(headerRegex, newHeader);

// 5. Hero Logo flat minimal design
src = src.replace(/bg-gradient-to-br from-\[#14B8A6\] via-\[#0EA5E9\] to-\[#3B82F6\] text-3xl font-black text-white shadow-\[0_20px_40px_rgba\(14,165,233,0\.35\)\] ring-1 ring-white\/50 dark:ring-white\/20/g, 'bg-slate-100 dark:bg-[#18181b] text-3xl font-bold text-slate-800 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800');
src = src.replace(/<span className={clsx\(\n\s*"absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-\[3px\] border-white dark:border-\[#050B17\] shadow-\[0_0_12px_rgba\(0,0,0,0\.4\)\]",\n\s*isPositive \? "bg-emerald-500 shadow-emerald-500\/50" : "bg-rose-500 shadow-rose-500\/50"\n\s*\)} \/>/g, '<span className={clsx("absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-[#0a0a0a]", isPositive ? "bg-emerald-500" : "bg-rose-500")} />');

// 6. Background Color to strictly #fafafa and pure black (#000000)
src = src.replace(/bg-slate-50 dark:bg-\[#050B17\]/g, 'bg-[#fafafa] dark:bg-black');
src = src.replace(/dark:bg-\[#0B1121\]/g, 'dark:bg-black');

// 7. Strip ALL SVG glowing drop shadows
src = src.replace(/style={{ filter: 'drop-shadow\(.*?\)' }}/g, '');

// 8. Recharts Area/Line updates - use thin lines and remove Aurora definition deps
src = src.replace(/<Area[\s\S]*?fill="url\(#priceGradient\)"[\s\S]*?\/>/m, `<Area type="monotone" dataKey="price" stroke={isPositive ? "#10b981" : "#f43f5e"} strokeWidth={1.5} fillOpacity={0} />`);
src = src.replace(/<Bar\n\s*dataKey="volume"\n\s*fill="url\(#volumeGradient\)"/m, '<Bar\n                                                dataKey="volume"\n                                                fill="#cbd5e1"');

// 9. Clean up typography - make text look strict and native
src = src.replace(/text-slate-900 dark:text-white font-mono/g, 'text-slate-900 dark:text-zinc-50 font-mono tracking-tight');
src = src.replace(/text-4xl lg:text-5xl font-black/g, 'text-4xl lg:text-5xl font-semibold tracking-tight');
src = src.replace(/text-\[3\.5rem\] font-black/g, 'text-[3.5rem] font-semibold tracking-tighter');
src = src.replace(/font-black/g, 'font-bold');

// Write out the result
fs.writeFileSync(targetFile, src);
console.log('V3 Minimalist Patch applied successfully.');
