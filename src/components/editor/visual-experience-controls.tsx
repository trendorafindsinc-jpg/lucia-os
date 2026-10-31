"use client";
import { expressionOptions, supportedExpressions, visualPreset, type VisualExperience, type ExperienceExpression } from "@/lib/layout-blueprint/visual-experience";
const labels: Record<string, string> = { motion: "Motion intensity", reveal: "Section reveals", transition: "Page entrance", interaction: "Card interaction", background: "Background treatment", typography: "Typography treatment", image: "Image presentation", depth: "Visual depth", lighting: "Lighting" };
export function VisualExperienceControls({ layoutId, value, locked, onChange }: { layoutId: string; value?: VisualExperience; locked: boolean; onChange: (value: VisualExperience) => void }) {
  const current = value ?? { ...visualPreset("elegant"), motion: "none" as const, reveal: "none" as const, transition: "none" as const, interaction: "none" as const, typography: "classic" as const };
  const supported = supportedExpressions(layoutId);
  return <fieldset className="composition-controls studio-panel" disabled={locked || !supported.length} aria-label="Visual Experience">
    <legend>Visual Experience · LUCIA is Light</legend>
    <p>Elegant is editorial and restrained. Dynamic brings a bold composition and responsive detail. Cinematic creates an atmospheric first impression. Changes are previewed now; save before publishing.</p>
    {locked && <p>This Layout locks visual-experience changes.</p>}
    <label>Experience expression<select value={current.expression} onChange={(event) => onChange(visualPreset(event.target.value as ExperienceExpression))}>
      {(["elegant", "dynamic", "cinematic"] as const).map((expression) => <option key={expression} value={expression} disabled={!supported.includes(expression)}>{expression[0].toUpperCase() + expression.slice(1)}{!supported.includes(expression) ? " — not supported by this Layout" : ""}</option>)}
    </select></label>
    {!value && <p>Existing website treatment is preserved until you choose and save visual settings.</p>}
    {Object.entries(expressionOptions(current.expression)).map(([key, options]) => <label key={key}>{labels[key]}<select value={current[key as keyof VisualExperience] as string} onChange={(event) => onChange({ ...current, [key]: event.target.value })}>
      {options.map((option) => <option value={option} key={option}>{option[0].toUpperCase() + option.slice(1)}</option>)}
    </select></label>)}
    <label><input type="checkbox" checked={current.reducedMotion} onChange={(event) => onChange({ ...current, reducedMotion: event.target.checked })} />Always reduce motion (also previews the static experience)</label>
    <p>Operating-system reduced-motion preferences are always respected. No audio, continuous animation or external animation scripts.</p>
  </fieldset>;
}
