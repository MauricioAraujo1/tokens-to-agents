import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-[1.5px] border-line-strong bg-brand font-bold text-on-brand shadow-press hover:brightness-95 active:translate-x-px active:translate-y-px active:shadow-none",
  secondary:
    "border-[1.5px] border-line-strong bg-surface font-medium text-ink shadow-press hover:bg-sunken active:translate-x-px active:translate-y-px active:shadow-none",
  ghost: "border border-transparent bg-transparent font-medium text-ink hover:bg-sunken",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "rounded-[5px] px-2.5 py-1.5 text-xs",
  md: "rounded-md px-3.5 py-2.5 text-[13px]",
  lg: "rounded-md px-[18px] py-3 text-sm",
};

export function Button({ variant = "secondary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 transition-[background-color,filter,transform,box-shadow] disabled:cursor-not-allowed disabled:border-line disabled:bg-sunken disabled:text-subtle disabled:shadow-none disabled:brightness-100",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
