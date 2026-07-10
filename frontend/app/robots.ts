import type { MetadataRoute } from "next";

const BASE_URL = "https://trademx.lat";

// Permite indexar las páginas públicas y bloquea las áreas privadas
// (datos de cada usuario detrás de login).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/alumno/",
        "/maestro/",
        "/admin/",
        "/sponsor/",
        "/dashboard",
        "/perfil",
        "/verify-email",
        "/reset-password",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
