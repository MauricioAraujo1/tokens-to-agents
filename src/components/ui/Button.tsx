import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "primary" | "secondary" | "tab" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Só na variante `tab`: marca a aba atual com destaque e `aria-current="page"`. */
  active?: boolean;
}

/** Sombra dura do design system: só em elemento clicável ou em destaque, e some ao pressionar. */
const HARD_SHADOW = "shadow-press active:translate-x-px active:translate-y-px active:shadow-none";

const variantClasses: Record<ButtonVariant, string> = {
  primary: cn("border-line-strong bg-brand font-bold text-on-brand hover:brightness-95", HARD_SHADOW),
  secondary: cn("border-line-strong bg-surface font-medium text-ink hover:bg-sunken", HARD_SHADOW),
  tab: "border-transparent bg-transparent font-medium text-ink hover:bg-sunken",
  ghost: "border-transparent bg-transparent font-medium text-ink hover:bg-sunken",
};

const activeTabClasses = cn("border-line-strong bg-brand-soft font-semibold text-ink hover:bg-brand-soft", HARD_SHADOW);

const sizeClasses: Record<ButtonSize, string> = {
  sm: "rounded-[5px] px-2.5 py-1.5 text-xs",
  md: "rounded-md px-3.5 py-2.5 text-[13px]",
  lg: "rounded-md px-[18px] py-3 text-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  active = false,
  disabled,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const isActiveTab = variant === "tab" && active;

  return (
    <button
      type={type}
      disabled={disabled}
      aria-disabled={disabled ? true : undefined}
      aria-current={isActiveTab ? "page" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 border-[1.5px] leading-[18px] transition-[background-color,filter,transform,box-shadow]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong",
        isActiveTab ? activeTabClasses : variantClasses[variant],
        sizeClasses[size],
        "disabled:cursor-not-allowed disabled:translate-none disabled:border-line disabled:bg-sunken disabled:text-subtle disabled:shadow-none disabled:brightness-100",
        className,
      )}
      {...props}
    />
  );
}
