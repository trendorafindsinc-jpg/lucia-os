import type { HTMLAttributes } from "react";

type BadgeTone = "neutral" | "success" | "warning" | "accent";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ className = "", tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={["ui-badge", `ui-badge--${tone}`, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
