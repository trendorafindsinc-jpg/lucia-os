import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className = "",
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={["ui-button", `ui-button--${variant}`, `ui-button--${size}`, className]
        .filter(Boolean)
        .join(" ")}
      type={type}
      {...props}
    />
  );
}
