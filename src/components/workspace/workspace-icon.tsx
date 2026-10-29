import React from "react";
import type { WorkspaceApp } from "@/lib/workspace/app-registry";

export function WorkspaceIcon({ icon }: { icon: WorkspaceApp["icon"] | "settings" | "home" | "activity" | "more" | "domains" | "organizations" | "lattice" }) {
  const common = {
    "aria-hidden": true as const,
    viewBox: "0 0 32 32",
    fill: "none",
    width: 28,
    height: 28,
    stroke: "currentColor",
    strokeWidth: 1.7,
  };

  switch (icon) {
    case "lattice":
      return <svg {...common}><rect x="4" y="5" width="24" height="22" rx="5"/><path d="M16 5v22M4 12h24M9 9h.01M12 9h.01" strokeLinecap="round"/><path d="m11 17-3 3 3 3m10-6 3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "settings":
      return <svg {...common}><path d="m13 4-1 4-4 2-4-1-2 5 3 3v4l-2 3 4 4 4-2 4 1 2 3 5-2v-4l3-3 4-1-1-5-4-1-2-3V6l-5-2-2 3h-4Z" transform="translate(2 0) scale(.9)" strokeLinejoin="round"/><circle cx="16" cy="16" r="5"/></svg>;
    case "home":
      return <svg {...common}><path d="m4 15 12-11 12 11M7 13v15h7v-9h5v9h6V13" strokeLinejoin="round" strokeLinecap="round"/></svg>;
    case "activity":
      return <svg {...common}><circle cx="16" cy="16" r="12"/><path d="M16 8v8l6 4" strokeLinecap="round"/></svg>;
    case "more":
      return <svg {...common}><path d="M7 9h18M7 16h18M7 23h18" strokeLinecap="round"/></svg>;
    case "domains":
      return <svg {...common}><circle cx="16" cy="16" r="12"/><ellipse cx="16" cy="16" rx="5" ry="12"/><path d="M4 16h24M7 9h18M7 23h18"/></svg>;
    case "organizations":
      return <svg {...common}><path d="M6 28V6h14v22M20 13h6v15M3 28h26M10 11h6M10 16h6M10 21h6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "overview":
      return <svg {...common}><rect x="5" y="5" width="9" height="9" rx="3" /><rect x="18" y="5" width="9" height="9" rx="3" /><rect x="5" y="18" width="9" height="9" rx="3" /><path d="M22.5 18v9M18 22.5h9" strokeLinecap="round" /></svg>;
    case "website":
      return <svg {...common}><rect x="4" y="6" width="24" height="20" rx="5" /><path d="M4 12h24M9 9h.01M12 9h.01M10 18l4-4 4 4-4 4-4-4Z" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 16h3M21 20h3" strokeLinecap="round" /></svg>;
    case "layouts":
      return <svg {...common}><rect x="5" y="7" width="17" height="17" rx="3" /><path d="M10 12h7M10 16h7M10 20h4M24 11h3v14a3 3 0 0 1-3 3H12v-2" strokeLinecap="round" /></svg>;
    case "loomify-ai":
      return <svg {...common}><path d="M16 4 19.3 12.7 28 16l-8.7 3.3L16 28l-3.3-8.7L4 16l8.7-3.3L16 4Z" strokeLinejoin="round" /><circle cx="16" cy="16" r="3.1" /><path d="M24 4v5M21.5 6.5h5" strokeLinecap="round" /></svg>;
    case "loom":
      return <svg {...common}><circle cx="9" cy="11" r="3.5" /><circle cx="23" cy="11" r="3.5" /><circle cx="16" cy="23" r="3.5" /><path d="m12 13 3 6m5-6-3 6M12.5 11h7" strokeLinecap="round" /></svg>;
    case "store":
      return <svg {...common}><path d="M6 12h20l-2 15H8L6 12Z" strokeLinejoin="round" /><path d="M11 12V9a5 5 0 0 1 10 0v3" strokeLinecap="round" /><path d="m12 19 3 3 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
}

