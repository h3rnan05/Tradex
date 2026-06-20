import type { MetadataRoute } from "next";

const BASE_URL = "https://trademx.lat";

// Solo se listan las páginas públicas. Las páginas detrás de login
// (alumno, maestro, admin, sponsor, perfil) no se indexan a propósito.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: BASE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
