import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cocoon Journal",
    short_name: "Cocoon",
    description: "A warm, shared journal.",
    start_url: "/",
    display: "standalone",
    background_color: "#1b1411",
    theme_color: "#1b1411",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
