import { defineConfig } from "wxt"

// Ver: https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-svelte"],
  vite: () => ({
    resolve: {
      alias: { "@/": new URL("./src/", import.meta.url).pathname },
    },
    optimizeDeps: {
      exclude: ["@tanstack/svelte-query"],
    },
  }),
  manifest: {
    name: "Mudarg — Buscá propiedades por tiempo de viaje",
    description:
      "Enriquecé tu búsqueda en portales inmobiliarios",
    permissions: ["activeTab", "storage", "tabs"],
    // Incluimos ambos para que dev y prod funcionen sin depender de process.env en config.
    // El código usa import.meta.env.WXT_API_BASE que Vite reemplaza correctamente en build.
    host_permissions: ["http://localhost:3001/*", "https://mudarg.com/*"],
    icons: {
      16: "icon16.png",
      48: "icon48.png",
      128: "icon128.png",
    },
    action: {
      default_icon: {
        16: "icon16.png",
        48: "icon48.png",
        128: "icon128.png",
      },
    },
  },
})
