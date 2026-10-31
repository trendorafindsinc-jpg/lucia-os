"use client";

import { useRouter } from "next/navigation";
import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";
import type { PremiumLayout } from "@/lib/layout-blueprint/premium-composition";

export function CandidateReviewSurface({
  blueprint, id, pagePath,
}: {
  blueprint: PremiumLayout;
  id: string;
  pagePath: string;
}) {
  const router = useRouter();
  return (
    <div data-phase14-review={id}>
      <aside
        role="note"
        className="phase14-review-banner"
        style={{
          padding: "10px 16px", fontFamily: "system-ui,sans-serif",
          background: "#151A24", color: "#FFFFFF", fontSize: 12,
          borderBottom: "1px solid #777",
        }}
      >
        PHASE 14 ENGINEERING PREVIEW — fictional candidate, not accepted or published
      </aside>
      <LayoutRenderer
        blueprint={blueprint}
        preview
        pagePath={pagePath}
        idPrefix="phase14-"
        onNavigate={(path) =>
          router.push("/phase14-review/" + id + (path === "/" ? "" : path))
        }
      />
    </div>
  );
}
