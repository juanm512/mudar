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
    name: "Mudarg — Isócronas para inmobiliarias",
    description:
      "Filtrá propiedades por tiempo de viaje en ArgenProp y ZonaProp",
    permissions: ["activeTab", "storage", "tabs"],
    host_permissions: ["http://localhost:3001/*"],
    icons: {
      16: "icon-16.png",
      48: "icon-48.png",
      128: "icon-128.png",
    },
    action: {
      default_icon: {
        16: "icon-16.png",
        48: "icon-48.png",
        128: "icon-128.png",
      },
    },
  },
})
