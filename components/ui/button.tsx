"use client";

import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 disabled:pointer-events-none disabled:opacity-50 active:scale-97 cursor-pointer";
    
    const variants = {
      primary: "bg-brand-primary text-white shadow-md shadow-brand-primary/10 hover:bg-brand-primary/90 hover:shadow-lg hover:shadow-brand-primary/20",
      secondary: "bg-brand-secondary text-white shadow-md shadow-brand-secondary/10 hover:bg-brand-secondary/90 hover:shadow-lg hover:shadow-brand-secondary/20",
      outline: "border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-800 dark:text-zinc-250 hover:bg-zinc-50 dark:hover:bg-zinc-900",
      ghost: "bg-transparent text-zinc-650 dark:text-zinc-350 hover:bg-zinc-100 dark:hover:bg-zinc-900",
      danger: "bg-red-500 text-white shadow-md shadow-red-500/10 hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/20",
      success: "bg-emerald-500 text-white shadow-md shadow-emerald-500/10 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20",
    };

    const sizes = {
      sm: "h-9 px-3 text-sm",
      md: "h-11 px-5 text-base",
      lg: "h-13 px-7 text-lg rounded-2xl",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
