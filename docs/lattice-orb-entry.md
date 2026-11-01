# Lattice — Orb and Home entry

2026-10-29. Founder-approved public name for the Phase 5 split-workspace feature: **Lattice**.

- Preserve `/workspace/desktop`, its tab identity and saved session state for compatibility; customer-facing name, metadata and tab label become Lattice.
- Orb includes a compact Lattice control. Clicking expands a supported-app list sourced from implemented native pane adapters: Layout Studio and Layouts. Selection opens the existing authenticated workspace with the chosen initial app. Existing API permissions and narrow-screen fallback remain in force.
- Home uses the same picker in a restrained, narrow control with an original vector mark and app glyphs, replacing the broad promotional desktop banner. The workspace heading is also compact and functional.
- Picker supports expanded state, stable labelled region, keyboard traversal, Escape dismissal/focus return and real link destinations. Orb dragging/glow and loomifyAI entry remain connected.
- No new apps, auth origins, Core configuration, database, DNS, secret or publishing changes. Phase 5 acceptance remains separate from this naming/entry change.

Verification: local TypeScript, unit suite, lint, production build and compiled HTTP checks; final-head CI must pass before main merge. Authenticated GUI checks use the main deployment because Core does not accept preview origins.
