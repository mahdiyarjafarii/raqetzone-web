import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: false,
      },
      includeAssets: ["logo.png", "pwa-192x192.png", "pwa-512x512.png", "apple-touch-icon.png"],
      manifest: {
        name: "RaqetZone",
        short_name: "RaqetZone",
        description: "RaqetZone web app",
        theme_color: "#111827",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/",
        lang: "fa",
        dir: "rtl",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => {
              if (request.destination === "document") {
                return true;
              }

              const isStaticAsset =
                request.destination === "style" ||
                request.destination === "script" ||
                request.destination === "worker" ||
                request.destination === "font" ||
                request.destination === "image";

              if (url.pathname.startsWith("/api/")) {
                return false;
              }

              return isStaticAsset;
            },
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "raqetzone-static-v1",
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  assetsInclude: ["**/*.lottie"],
  server: {
    allowedHosts: ["ai.raqetzone.ir", "app.raqetzone.com"],
  },
  preview: {
    allowedHosts: ["ai.raqetzone.ir", "app.raqetzone.com"],
  },
});
