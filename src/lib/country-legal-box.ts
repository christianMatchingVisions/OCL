/**
 * HTML renderer for the standardized per-country legal/RG box.
 *
 * Exists as a plain string renderer (not only an .astro component) because
 * the site's @custom pages build their markup as template-literal `body`
 * strings passed to Shell.astro — interpolate `${renderCountryLegalBox("ar")}`
 * there. CountryLegalBox.astro wraps this for component-style usage.
 *
 * Styling mirrors the inline-style approach of the existing affiliate
 * disclosure boxes on the ranking pages (same tokens: --bg-card, --border,
 * --radius, .78rem muted text).
 */
import { COUNTRIES, type CountryCode, type RegulatorStatus } from "../data/countries";

const STATUS_LABEL: Record<RegulatorStatus, string> = {
  regulated: "Regulado",
  "state-monopoly": "Monopolio estatal",
  unregulated: "Sin regulación específica",
  gray: "Zona gris (sin ley de juego online)",
};

export function renderCountryLegalBox(code: CountryCode): string {
  const c = COUNTRIES[code];
  const rgLinks = c.rgResources
    .map((r) =>
      r.url
        ? `<a href="${r.url}" rel="nofollow noopener" target="_blank">${r.name}</a>`
        : r.name,
    )
    .concat('<a href="/juego-responsable/">Guía de juego responsable</a>')
    .join(" · ");
  return `<aside class="country-legal-box" data-country-legal="${c.code}" style="font-size:.78rem;color:var(--text-muted);background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin:0 0 20px">
    <p style="margin:0 0 6px"><strong style="color:#fff">Situación legal en ${c.name}:</strong> ${STATUS_LABEL[c.regulator.status]} · ${c.regulator.name}</p>
    <p style="margin:0 0 6px">${c.legalDisclaimer}</p>
    <p style="margin:0"><span class="age-gate">+18</span> Juego responsable: ${rgLinks}</p>
  </aside>`;
}
