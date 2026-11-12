import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className = "",
}: SectionHeadingProps) {
  return (
    <div className={["ui-section-heading", className].filter(Boolean).join(" ")}>
      <div className="ui-section-heading__copy">
        {eyebrow ? <p className="ui-eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p className="ui-section-heading__description">{description}</p> : null}
      </div>
      {action ? <div className="ui-section-heading__action">{action}</div> : null}
    </div>
  );
}
