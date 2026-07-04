/**
 * Country data model for the 7 LATAM markets OCL targets.
 *
 * ⚠️ OWNER MUST VERIFY all regulator/legal fields before relying on them for
 * compliance or editorial claims. Entries with `needsVerification: true` are
 * plausible but were NOT verified against primary sources at authoring time
 * (2026-07). Regulatory landscapes in LATAM change fast (e.g. Perú's Ley
 * 31557 came into force in 2024; Chile's online-gambling bill is still in
 * tramitación). Legal status here mirrors what the site's country hub
 * fragments (src/fragments/<pais>/body.html) already state, so the site does
 * not contradict itself — when a fragment is outdated, fix BOTH places.
 *
 * Known tension with existing content:
 *  - src/fragments/peru/body.html still says the online framework is
 *    "en desarrollo"; the Perú listicle (and this file) reference Ley N.º
 *    31557 / MINCETUR as an active regulated regime.
 *  - src/fragments/ecuador/body.html says "sin regulación específica" and
 *    does not mention the 2011 referendum ban on land-based casinos; this
 *    file records both.
 */

export type CountryCode = "ar" | "mx" | "co" | "cl" | "pe" | "ve" | "ec";

export type RegulatorStatus =
  | "regulated"
  | "state-monopoly"
  | "unregulated"
  | "gray";

export interface PaymentMethod {
  name: string;
  type: "wallet" | "bank" | "cash" | "card" | "crypto" | "prepaid";
  popular: boolean;
}

export interface RgResource {
  name: string;
  url?: string;
}

export interface CountryFaq {
  q: string;
  a: string;
}

export interface Country {
  code: CountryCode;
  /** Display name, e.g. "México". */
  name: string;
  /** URL path segment, e.g. "mexico" → /mexico/. */
  pathSegment: string;
  /** BCP 47 lang, mirrors src/lib/locale-map.ts. */
  lang: string;
  currency: { code: string; symbol: string };
  regulator: {
    name: string;
    status: RegulatorStatus;
    note: string;
    needsVerification?: boolean;
  };
  paymentMethods: PaymentMethod[];
  rgResources: RgResource[];
  /** 1–2 sentence Spanish disclaimer rendered on country money pages. */
  legalDisclaimer: string;
  faq: CountryFaq[];
}

export const COUNTRIES: Record<CountryCode, Country> = {
  ar: {
    code: "ar",
    name: "Argentina",
    pathSegment: "argentina",
    lang: "es-AR",
    currency: { code: "ARS", symbol: "$" },
    regulator: {
      name: "LOTBA (Ciudad de Buenos Aires) y organismos provinciales",
      status: "regulated",
      note: "El juego online se regula por jurisdicción: LOTBA licencia y supervisa el juego online en CABA; la Provincia de Buenos Aires y otras provincias tienen sus propios organismos. Los jugadores también acceden a plataformas con licencias internacionales (Curaçao, MGA).",
    },
    paymentMethods: [
      { name: "Mercado Pago", type: "wallet", popular: true },
      { name: "Transferencia CBU/CVU", type: "bank", popular: true },
      { name: "AstroPay", type: "prepaid", popular: false },
      { name: "Criptomonedas (USDT, BTC)", type: "crypto", popular: false },
    ],
    rgResources: [
      { name: "Saber Jugar Argentina", url: "https://www.saberjogar.com.ar" },
      { name: "LOTBA Buenos Aires", url: "https://www.lotba.gob.ar" },
    ],
    legalDisclaimer:
      "En Argentina el juego online se regula por jurisdicción; verificá que el operador esté autorizado en tu provincia o cuente con una licencia internacional verificable antes de depositar. Solo para mayores de 18 años.",
    faq: [
      {
        q: "¿Es legal el casino online en Argentina?",
        a: "Sí, con regulación provincial: en la Ciudad de Buenos Aires LOTBA licencia el juego online y otras provincias tienen sus propios organismos. Los jugadores también acceden a casinos con licencias internacionales verificables sin restricciones activas para el usuario individual.",
      },
      {
        q: "¿Puedo depositar con Mercado Pago en un casino online?",
        a: "Sí. Mercado Pago es el método preferido en Argentina: permite depositar pesos al instante y, en los casinos que lo soportan, recibir retiros en la misma cuenta en 1 a 3 días hábiles.",
      },
    ],
  },
  mx: {
    code: "mx",
    name: "México",
    pathSegment: "mexico",
    lang: "es-MX",
    currency: { code: "MXN", symbol: "$" },
    regulator: {
      name: "DGJS / SEGOB",
      status: "regulated",
      note: "La Dirección General de Juegos y Sorteos (DGJS), dependiente de la Secretaría de Gobernación (SEGOB), otorga los permisos federales para operar juegos con apuesta. Muchos jugadores usan además plataformas con licencias internacionales (Curaçao, MGA).",
    },
    paymentMethods: [
      { name: "OXXO", type: "cash", popular: true },
      { name: "SPEI", type: "bank", popular: true },
      { name: "PayPal", type: "wallet", popular: false },
      { name: "Tarjetas Visa/Mastercard", type: "card", popular: false },
      { name: "Criptomonedas (USDT, BTC)", type: "crypto", popular: false },
    ],
    rgResources: [{ name: "DGJS México", url: "https://www.dgjs.gob.mx" }],
    legalDisclaimer:
      "En México los juegos con apuesta en línea operan bajo permisos federales de la SEGOB/DGJS; verifica que el operador cuente con permiso o licencia verificable antes de depositar. Solo para mayores de 18 años.",
    faq: [
      {
        q: "¿Es legal el casino online en México?",
        a: "Sí. México regula el juego online a través de la Dirección General de Juegos y Sorteos (DGJS), dependiente de la SEGOB; los operadores necesitan un permiso federal. Los jugadores mexicanos también acceden a plataformas con licencias internacionales verificables.",
      },
      {
        q: "¿Puedo depositar en efectivo con OXXO?",
        a: "Sí. OXXO es uno de los métodos más usados en México: generas una referencia de pago en el casino y depositas en efectivo en cualquier tienda OXXO, sin necesidad de tarjeta ni cuenta bancaria.",
      },
      {
        q: "¿Qué es SPEI y cómo se usa en casinos online?",
        a: "SPEI es el sistema de transferencias interbancarias de Banco de México. En los casinos que lo aceptan permite depositar y retirar pesos mexicanos directamente desde tu cuenta bancaria, normalmente sin comisiones del operador.",
      },
    ],
  },
  co: {
    code: "co",
    name: "Colombia",
    pathSegment: "colombia",
    lang: "es-CO",
    currency: { code: "COP", symbol: "$" },
    regulator: {
      name: "Coljuegos",
      status: "regulated",
      note: "Colombia fue pionera en regular el juego online en América Latina: Coljuegos otorga las licencias de juegos operados por internet y mantiene un listado público de operadores autorizados.",
    },
    paymentMethods: [
      { name: "PSE", type: "bank", popular: true },
      { name: "Nequi", type: "wallet", popular: true },
      { name: "Daviplata", type: "wallet", popular: false },
      { name: "Tarjetas Visa/Mastercard", type: "card", popular: false },
    ],
    rgResources: [{ name: "Coljuegos Colombia", url: "https://www.coljuegos.gov.co" }],
    legalDisclaimer:
      "En Colombia solo los operadores autorizados por Coljuegos pueden ofrecer juegos de suerte y azar en línea; verifica la licencia del operador antes de depositar. Solo para mayores de 18 años.",
    faq: [
      {
        q: "¿Es legal el casino online en Colombia?",
        a: "Sí. Colombia tiene el mercado de casino online más regulado de América Latina: Coljuegos otorga las licencias y supervisa a los operadores autorizados. Verifica siempre la licencia del operador antes de registrarte.",
      },
      {
        q: "¿Puedo depositar con Nequi o PSE en un casino online?",
        a: "Sí. PSE permite pagar directamente desde tu cuenta bancaria y Nequi es la billetera móvil de Bancolombia; ambos son los métodos más usados por los jugadores colombianos para depositar pesos sin tarjeta de crédito.",
      },
    ],
  },
  cl: {
    code: "cl",
    name: "Chile",
    pathSegment: "chile",
    lang: "es-CL",
    currency: { code: "CLP", symbol: "$" },
    regulator: {
      name: "SCJ (Superintendencia de Casinos de Juego)",
      status: "gray",
      note: "La SCJ regula los casinos físicos; no existe una ley específica que regule el casino online ni que prohíba jugar a usuarios individuales. Un proyecto de ley de plataformas de apuestas en línea sigue en tramitación.",
      needsVerification: true,
    },
    paymentMethods: [
      { name: "Webpay", type: "card", popular: true },
      { name: "Cuenta RUT / Redcompra", type: "bank", popular: true },
      { name: "Transferencia bancaria", type: "bank", popular: false },
      { name: "Criptomonedas (USDT, BTC)", type: "crypto", popular: false },
    ],
    rgResources: [{ name: "SCJ Chile", url: "https://www.scj.cl" }],
    legalDisclaimer:
      "En Chile no existe una ley que regule el casino online; los jugadores acceden a plataformas con licencias internacionales bajo su propia responsabilidad. Solo para mayores de 18 años.",
    faq: [
      {
        q: "¿Es legal jugar en casinos online desde Chile?",
        a: "Chile regula los casinos físicos a través de la SCJ, pero no existe una ley específica que prohíba el juego online a usuarios individuales. Los jugadores chilenos acceden a casinos con licencias internacionales (Curaçao, MGA) bajo su propia responsabilidad.",
      },
      {
        q: "¿Puedo depositar con Webpay en un casino online?",
        a: "Sí, en los casinos que integran Webpay puedes depositar pesos chilenos con tarjetas de débito o crédito locales, incluida la Cuenta RUT de BancoEstado a través de Redcompra.",
      },
    ],
  },
  pe: {
    code: "pe",
    name: "Perú",
    pathSegment: "peru",
    lang: "es-PE",
    currency: { code: "PEN", symbol: "S/" },
    regulator: {
      name: "MINCETUR",
      status: "regulated",
      note: "La Ley N.º 31557 regula los juegos y apuestas deportivas a distancia bajo supervisión del MINCETUR; el régimen entró en vigencia en 2024 y los operadores obtienen autorizaciones locales. También se accede a plataformas con licencias internacionales.",
    },
    paymentMethods: [
      { name: "Yape", type: "wallet", popular: true },
      { name: "Plin", type: "wallet", popular: true },
      { name: "PagoEfectivo", type: "cash", popular: false },
      { name: "AstroPay", type: "prepaid", popular: false },
    ],
    rgResources: [{ name: "JuegoResponsable.pe", url: "https://www.juegoresponsable.pe" }],
    legalDisclaimer:
      "Perú regula los juegos a distancia mediante la Ley N.º 31557, supervisada por el MINCETUR; verifica que la plataforma esté autorizada o cuente con una licencia internacional verificable. Solo para mayores de 18 años.",
    faq: [
      {
        q: "¿Es legal el casino online en Perú?",
        a: "Sí. Perú regula los juegos y apuestas deportivas a distancia mediante la Ley N.º 31557, supervisada por el MINCETUR, con un mercado regulado de operadores autorizados. La edad mínima para jugar es 18 años.",
      },
      {
        q: "¿Puedo depositar con Yape o Plin en un casino online?",
        a: "Sí. Yape (BCP) y Plin son los métodos de pago móvil más populares en Perú y permiten depositar soles desde el celular sin tarjeta de crédito, en los casinos que los aceptan.",
      },
    ],
  },
  ve: {
    code: "ve",
    name: "Venezuela",
    pathSegment: "venezuela",
    lang: "es-VE",
    currency: { code: "VES", symbol: "Bs." },
    regulator: {
      name: "CNC (Comisión Nacional de Casinos, Salas de Bingo y Máquinas Traganíqueles)",
      status: "gray",
      note: "La CNC, creada por la ley de casinos de 1997, ha retomado la concesión de autorizaciones tras años de paralización del sector. Por la inestabilidad del bolívar, la mayoría de los jugadores usa plataformas internacionales en dólares (USD) o criptomonedas.",
      needsVerification: true,
    },
    paymentMethods: [
      { name: "USDT (Tether)", type: "crypto", popular: true },
      { name: "Bitcoin", type: "crypto", popular: true },
      { name: "Pago Móvil (para convertir bolívares)", type: "bank", popular: false },
      { name: "AstroPay", type: "prepaid", popular: false },
    ],
    rgResources: [{ name: "Gambling Therapy (en español)", url: "https://www.gamblingtherapy.org/" }],
    legalDisclaimer:
      "En Venezuela la CNC es el organismo competente en materia de casinos; la mayoría de los jugadores usa plataformas internacionales en dólares o criptomonedas bajo su propia responsabilidad. Solo para mayores de 18 años.",
    faq: [
      {
        q: "¿Es legal el casino online en Venezuela?",
        a: "La Comisión Nacional de Casinos (CNC) es el organismo competente y ha retomado la concesión de autorizaciones a algunos operadores. En la práctica, la mayoría de los jugadores venezolanos usa plataformas internacionales con licencia (Curaçao, MGA) que operan en dólares o criptomonedas.",
      },
      {
        q: "¿Por qué conviene jugar en dólares o USDT desde Venezuela?",
        a: "Por la inestabilidad del bolívar: al depositar en USD o USDT el saldo no pierde valor entre el depósito y el retiro. USDT es la opción más usada porque está vinculado al dólar y los retiros en cripto suelen acreditarse en minutos.",
      },
    ],
  },
  ec: {
    code: "ec",
    name: "Ecuador",
    pathSegment: "ecuador",
    lang: "es-EC",
    currency: { code: "USD", symbol: "$" },
    regulator: {
      name: "Sin regulador de juego online",
      status: "gray",
      note: "Los casinos y salas de juego físicos están prohibidos desde el referéndum de 2011 y no existe una regulación específica del casino online. Los jugadores acceden a plataformas internacionales (Curaçao, MGA) en una zona gris, con la ventaja de que el país usa el dólar (USD) desde el año 2000.",
      needsVerification: true,
    },
    paymentMethods: [
      { name: "AstroPay", type: "prepaid", popular: true },
      { name: "Transferencia bancaria", type: "bank", popular: true },
      { name: "Tarjetas Visa/Mastercard", type: "card", popular: false },
      { name: "Criptomonedas (USDT, BTC)", type: "crypto", popular: false },
    ],
    rgResources: [{ name: "Gambling Therapy (en español)", url: "https://www.gamblingtherapy.org/" }],
    legalDisclaimer:
      "En Ecuador los casinos físicos están prohibidos desde el referéndum de 2011 y no existe una regulación específica del juego online; el acceso a plataformas internacionales queda bajo responsabilidad del jugador. Solo para mayores de 18 años.",
    faq: [
      {
        q: "¿Es legal el casino online en Ecuador?",
        a: "No existe una regulación específica para casinos online en Ecuador; los casinos físicos están prohibidos desde el referéndum de 2011. Los jugadores acceden a plataformas con licencias internacionales verificables bajo su propia responsabilidad.",
      },
      {
        q: "¿Qué ventaja tiene Ecuador al usar el dólar?",
        a: "Ecuador usa el dólar estadounidense como moneda oficial desde el año 2000, por lo que puedes depositar y retirar en USD sin conversión de divisas ni pérdida por tipo de cambio en los casinos internacionales.",
      },
    ],
  },
};

/** Convenience lookup by path segment ("mexico" → Country). */
export function getCountryByPath(pathSegment: string): Country | undefined {
  return Object.values(COUNTRIES).find((c) => c.pathSegment === pathSegment);
}
