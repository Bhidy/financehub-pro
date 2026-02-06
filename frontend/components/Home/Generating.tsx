import { loading } from "./assets";

const Generating = ({ className, type }: { className?: string, type?: string }) => {
    return (
        <div
            className={`flex items-center h-[3.5rem] px-6 bg-n-6/80 rounded-[1.7rem] ${className || ""
                } text-base`}
        >
            {/* Replaced loading image with Teal CSS Spinner for better color control */}
            <div className="w-5 h-5 mr-4 rounded-full border-2 border-slate-200 dark:border-white/10 border-t-[#13b8a6] dark:border-t-[#13b8a6] animate-spin" />
            {type || "AI is generating"}
        </div>
    );
};

export default Generating;
