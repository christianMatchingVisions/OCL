/**
 * Author/reviewer profiles for casino review bylines.
 *
 * Scaffolding only: "equipo-ocl" is a placeholder team entity, not a real
 * named person — do not add fabricated credentials, photos, or LinkedIn
 * URLs. When a real reviewer is designated, add their entry here (or
 * replace this one) with real details, and switch the schema on their
 * /autor/ page and on review pages from Organization to Person.
 */

export interface Author {
  slug: string;
  name: string;
  role: string;
  bio: string;
  schemaType: "Organization" | "Person";
  reviewCount: number;
  photo: string | null;
  linkedin: string | null;
}

export const AUTHORS: Record<string, Author> = {
  "equipo-ocl": {
    slug: "equipo-ocl",
    name: "Equipo OCL",
    role: "Equipo editorial",
    bio: "El equipo editorial de Online Casino Latino investiga y actualiza cada reseña siguiendo nuestra metodología de evaluación (bonos y promociones, métodos de pago, velocidad de retiro, catálogo de juegos, soporte y experiencia móvil). Los enlaces de afiliado nunca afectan las puntuaciones.",
    schemaType: "Organization",
    reviewCount: 17,
    photo: null,
    linkedin: null,
  },
};

export const DEFAULT_AUTHOR = AUTHORS["equipo-ocl"];
