import { cn } from "@/lib/utils";
import { forwardRef, ButtonHTMLAttributes } from "react";

export interface CircleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost";
  ripple?: boolean;
  pulsing?: boolean;
  icon?: React.ReactNode;
}

const CircleButton = forwardRef<HTMLButtonElement, CircleButtonProps>(
  ({ className, size = "lg", variant = "primary", ripple = false, pulsing = false, icon, children, ...props }, ref) => {
    const sizeClasses = {
      sm: "w-12 h-12",
      md: "w-24 h-24",
      lg: "w-32 h-32 sm:w-48 sm:h-48",
      xl: "w-48 h-48 sm:w-64 sm:h-64",
    };
    
    const variantClasses = {
      primary: "bg-primary text-white",
      secondary: "bg-secondary text-white",
      accent: "bg-accent text-accent-foreground",
      outline: "bg-transparent border-2 border-primary text-primary",
      ghost: "bg-transparent hover:bg-neutral-200/50 text-primary",
    };
    
    const baseClasses = "rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2";
    
    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          sizeClasses[size],
          variantClasses[variant],
          ripple && "circle-ripple",
          pulsing && "animate-pulse-slow",
          className
        )}
        {...props}
      >
        {icon || children}
      </button>
    );
  }
);

CircleButton.displayName = "CircleButton";

export { CircleButton };
