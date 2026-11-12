import type { HTMLAttributes } from "react";

type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  width?: "content" | "wide" | "full";
};

export function Container({ className = "", width = "wide", ...props }: ContainerProps) {
  return (
    <div
      className={["ui-container", `ui-container--${width}`, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
