import { defineCollection, z } from "astro:content";
import { contentEngineLoader } from "./lib/content-engine-loader";

export const collections = {
  articles: defineCollection({
    loader: contentEngineLoader({
      apiUrl: import.meta.env.CE_API_URL,
      apiKey: import.meta.env.CE_API_KEY,
    }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      language: z.string(),
      publishedAt: z.string().nullable(),
      heroImage: z.string().nullable(),
    }),
  }),
};
