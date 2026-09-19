import type { MetadataRoute } from "next";
import { PUBLIC_SITEMAP_PATHS, SITE_URL } from "@/lib/calculators/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_SITEMAP_PATHS.map((path) => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified: "2026-09-19",
    changeFrequency: path.startsWith("/calculadoras") ? "monthly" : "weekly",
    priority: path === "/calculadoras" || path === "/" ? 0.9 : 0.7,
  }));
}
