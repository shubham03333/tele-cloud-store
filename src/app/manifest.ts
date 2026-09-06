import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nimbus Drive",
    short_name: "Nimbus",
    description: "Personal cloud storage on Telegram MTProto",
    start_url: "/",
    display: "standalone",
    background_color: "#05060a",
    theme_color: "#64d2ff",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
