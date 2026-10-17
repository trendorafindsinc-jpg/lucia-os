# Phase 6 — Template and design system

## Goal
Establish the reusable visual foundation for the Website Portal before building the template catalogue and visual editor.

## Design principles
- Clear hierarchy, generous spacing, restrained color, accessible contrast, and responsive layouts.
- Reusable primitives instead of copying one-off styles into every screen.
- Semantic HTML and visible keyboard focus.
- Motion is subtle and respects reduced-motion preferences.
- Components expose real native behavior; no decorative controls pretending to work.
- Website templates are content/design starting points, not separate deployments or separate applications.

## Foundations
Global CSS custom properties define color, typography, spacing, radius, shadow, and layout tokens. The initial primitives are:
- `Button`: primary, secondary, and quiet variants with three sizes.
- `Surface`: semantic section/article/div surface with tone and padding options.
- `Badge`: neutral, success, warning, and accent status treatments.
- `SectionHeading`: optional eyebrow, title, description, and action slot.
- `Container`: content, wide, and full-width layout constraints.

## Scope
This phase creates the system foundations only. It does not claim to deliver the 30+ templates, drag-and-drop editor, publishing, domains, or customer-ready onboarding. Those remain later roadmap phases. No production deployment or database change is part of this phase.
