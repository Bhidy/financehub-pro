import ButtonSvg from "./svg/ButtonSvg";

type ButtonProps = {
    className?: string;
    href?: string;
    onClick?: () => void;
    children: React.ReactNode;
    px?: string;
    white?: boolean;
    disabled?: boolean;
};

const Button = ({ className, href, onClick, children, px, white, disabled }: ButtonProps) => {
    const classes = `button relative inline-flex items-center justify-center h-11 transition-colors hover:text-color-1 ${px || "px-7"
        } ${white ? "text-slate-900" : "text-n-1"} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className || ""}`;
    const spanClasses = "relative z-10";

    const renderButton = () => (
        <button className={classes} onClick={onClick} disabled={disabled}>
            <span className={spanClasses}>{children}</span>
            {ButtonSvg(white || false)}
        </button>
    );

    const renderLink = () => (
        <a href={href} className={classes}>
            <span className={spanClasses}>{children}</span>
            {ButtonSvg(white || false)}
        </a>
    );

    return href ? renderLink() : renderButton();
};

export default Button;
