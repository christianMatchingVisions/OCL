/**
 * Locale + hreflang configuration for country-targeted routes.
 *
 * Maps a route path (always with trailing slash, exactly as served) to:
 *  - `lang`: the <html lang> value (BCP 47, es-XX per country)
 *  - `hreflangCluster`: the alternate-language cluster the page belongs to.
 *    Every member of a cluster emits the SAME self-inclusive set of
 *    <link rel="alternate" hreflang> tags — hreflang annotations must be
 *    bidirectional and identical across all members or Google ignores them.
 *
 * Pages NOT in this map keep the site default (lang="es") and emit no
 * hreflang tags. That is correct for the shared country-agnostic pages
 * (casino reviews, /pagos/, /bonos/, /noticias/): hreflang is only for
 * pages that exist as per-country alternates of each other.
 *
 * Canonicals are untouched by all of this — each page stays self-canonical
 * (canonicals live in the preserved head fragments).
 */

export const SITE_ORIGIN = "https://onlinecasinolatino.com";

export type CountryLang =
  | "es"
  | "es-AR"
  | "es-MX"
  | "es-CO"
  | "es-CL"
  | "es-PE"
  | "es-VE"
  | "es-EC";

export type HreflangCluster = "country-hubs" | "country-listicles";

export interface LocaleEntry {
  lang: CountryLang;
  hreflangCluster?: HreflangCluster;
}

export const LOCALE_MAP: Record<string, LocaleEntry> = {
  // Cluster "country-hubs": home is the generic-es member and the x-default.
  "/": { lang: "es", hreflangCluster: "country-hubs" },
  "/argentina/": { lang: "es-AR", hreflangCluster: "country-hubs" },
  "/mexico/": { lang: "es-MX", hreflangCluster: "country-hubs" },
  "/colombia/": { lang: "es-CO", hreflangCluster: "country-hubs" },
  "/chile/": { lang: "es-CL", hreflangCluster: "country-hubs" },
  "/peru/": { lang: "es-PE", hreflangCluster: "country-hubs" },
  "/venezuela/": { lang: "es-VE", hreflangCluster: "country-hubs" },
  "/ecuador/": { lang: "es-EC", hreflangCluster: "country-hubs" },

  // Cluster "country-listicles": no x-default yet — clusters do not require
  // one. When a generic /mejores-casinos-online/ page exists, add it here as
  // the x-default (mirror the "country-hubs" pattern in getHreflangLinks).
  "/argentina/mejores-casinos-online/": { lang: "es-AR", hreflangCluster: "country-listicles" },
  "/chile/mejores-casinos-online/": { lang: "es-CL", hreflangCluster: "country-listicles" },
  "/ecuador/mejores-casinos-online/": { lang: "es-EC", hreflangCluster: "country-listicles" },
  "/peru/mejores-casinos-online/": { lang: "es-PE", hreflangCluster: "country-listicles" },
};

export interface HreflangLink {
  hreflang: string;
  href: string;
}

/** <html lang> for a path; site default "es" for unmapped pages. */
export function getLang(path: string): string {
  return LOCALE_MAP[path]?.lang ?? "es";
}

/**
 * All <link rel="alternate"> entries for the given path, or [] when the page
 * is not part of a cluster. Includes the page itself (self-reference is
 * required) and, for the hub cluster, x-default pointing at the home page.
 * Object key order makes the emitted list identical on every member page.
 */
export function getHreflangLinks(path: string): HreflangLink[] {
  const cluster = LOCALE_MAP[path]?.hreflangCluster;
  if (!cluster) return [];
  const links: HreflangLink[] = Object.entries(LOCALE_MAP)
    .filter(([, entry]) => entry.hreflangCluster === cluster)
    .map(([memberPath, entry]) => ({ hreflang: entry.lang, href: `${SITE_ORIGIN}${memberPath}` }));
  if (cluster === "country-hubs") {
    links.push({ hreflang: "x-default", href: `${SITE_ORIGIN}/` });
  }
  return links;
}
