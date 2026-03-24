import { defineConfig } from "wxt"

// Ver: https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-svelte"],
  manifest: {
    name: "Mudar — Isócronas para inmobiliarias",
    description:
      "Filtrá propiedades por tiempo de viaje en ArgenProp y ZonaProp",
    permissions: ["activeTab", "storage", "tabs"],
  },
})
