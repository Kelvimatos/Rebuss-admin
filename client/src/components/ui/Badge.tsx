import React from "react";
import { cn } from "../../lib/utils.js";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "destructive" | "success" | "warning";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  ...props
}) => {
  const variants = {
    default: "bg-primary/10 text-primary border border-primary/25",
    secondary: "bg-secondary text-secondary-foreground border border-border/80",
    outline: "bg-transparent text-foreground border border-border",
    destructive: "bg-destructive/10 text-destructive border border-destructive/25",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium tracking-tight transition-colors select-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

