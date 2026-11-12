import type { HTMLAttributes } from "react";

type SurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: "section" | "article" | "div";
  padding?: "sm" | "md" | "lg";
  tone?: "default" | "subtle" | "raised";
};

export function Surface({
  as: Element = "section",
  className = "",
  padding = "md",
  tone = "default",
  ...props
}: SurfaceProps) {
  return (
    <Element
      className={["ui-surface", `ui-surface--${padding}`, `ui-surface--${tone}`, className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
