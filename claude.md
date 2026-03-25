# Directivas de Desarrollo Mudar (Mudar AI Guidelines)

Este documento resume la arquitectura, decisiones técnicas y buenas prácticas específicas del proyecto **Mudar** para guiar a asistentes de IA (Claude, GitHub Copilot, Gemini, Cursor, etc.).

## 🏗 Arquitectura y Stack

Mudar es un monorepo gestionado con **pnpm workspaces** y **Turborepo**.

### Frontend / Web (`apps/web`)
- **Framework:** Next.js 15+ (App Router).
- **Styling:** Tailwind CSS v4 (importado vía `@import "tailwindcss"`).
- **Tooling:** React Compiler, Turbopack.

### Extensión de Navegador (`apps/extension`)
- **Framework:** WXT (Next-gen framework para extensiones).
- **UI:** Svelte 5 (usando Runes: `$state`, `$derived`, `$effect`, `onclick`).
- **Comunicación:** El content script llama a la API vía oRPC con `RPCLink` sobre `browser.runtime.connect()` (message-port). El background hace de proxy para evitar CORS.

### Packages Compartidos (`packages/*`)
- **`@mudar/api`:** oRPC v1 para tRPC-like Type Safety E2E.
- **`@mudar/db`:** Drizzle ORM + PostgreSQL. Tablas en `schema.ts`.
- **`@mudar/auth`:** `better-auth` con Drizzle Adapter persistiendo sesiones en BD.
- **`@mudar/geo`:** Clientes para Nominatim y TravelTime API.

---

## 🚦 Reglas OBLIGATORIAS para IA

### 1. Sistema de Tipos (TypeScript Strict)
- Siempre ejecutar `pnpm typecheck` o `pnpm --filter @<package> typecheck` después de realizar cambios.
- No usar `any`. Usar genéricos de TypeScript, `zod` pre-existentes, o tipos inferidos de oRPC/Drizzle.
- En Svelte y React respetar fuertemente la inferencia de props.

### 2. Cambios en Base de Datos (Drizzle)
- Modificaciones a tablas se hacen en `packages/db/src/schema.ts`.
- Durante iteración rápida se sincroniza con:
  ```bash
  pnpm --filter @mudar/db push
  ```
- Los drops de columna requieren confirmación interactiva en la terminal (drizzle-kit push la pide).
- **La tabla `calculations` NO guarda el GeoJSON** — solo metadatos (lat, lng, timeSeconds, transport, address, createdAt). El GeoJSON se retorna al cliente pero no se persiste en la DB.

### 3. Svelte 5 (UI de Extensión)
- **RUNES EXCLUSIVAMENTE**: `$state`, `$derived`, `$effect`. No usar sintaxis de Svelte 4.
- **Event handlers**: nombres todo en minúscula (`onclick`, `oninput`, `onmousedown`). No usar `on:click`.
- **Set reactivity**: mutar un Set no dispara reactividad. Siempre reasignar:
  ```ts
  set.add(value)
  set = new Set(set) // necesario para trigger reactivity
  ```
- **tick() para renders síncronos**: si necesitás que un estado se refleje en el DOM antes de ejecutar código síncrono pesado, usar `await tick()` de svelte:
  ```ts
  import { tick } from "svelte"
  isLoading = true
  await tick() // DOM actualizado → overlay visible
  // ... operaciones síncronas
  isLoading = false
  ```

### 4. Extensión — CSS e Inyección de UI
- **SIEMPRE usar `createShadowRootUi`** para inyectar UI en páginas de terceros. Nunca `createIntegratedUi` — los estilos de la página host (ej. ArgenProp) sobreescriben todo.
- **Requiere `cssInjectionMode: "ui"`** en `defineContentScript` para que WXT inyecte el CSS compilado dentro del Shadow Root en vez del `<head>` de la página.
- **`createShadowRootUi` es async** — usar `await`.
- **`position: "inline"`** con `anchor: "body"` para UI flotante. `position: "overlay"` crea un elemento fixed que cubre toda la pantalla y oculta el mapa de la página.

### 5. Extensión — Overlay Leaflet sobre ArgenProp/ZonaProp
- Content scripts en Chrome MV3 corren en contexto V8 aislado → **no tienen acceso a `window.L`** de la página. Se debe bundlear Leaflet propio (`import L from "leaflet"`).
- Se crea un segundo `L.map()` encima del mapa de la página (sincronizado con MutationObserver).
- El `overlayDiv` tiene `pointerEvents: "none"` para no bloquear interacciones con el mapa original.
- **`argenContainer.style.position = "relative"` y `zIndex` en overlayDiv están comentados intencionalmente — NO restaurarlos**, alteran el layout de la página de forma que rompe el overlay.
- Las capas de polígonos se manejan con `Map<transportKey, L.GeoJSON>` (no una variable única), para soportar múltiples zonas simultáneas.

### 6. Extensión — Filtrado de Marcadores
- `filterMarkersAll` usa la unión de todos los rings activos (`allPolyRings: Map<string, number[][][]>`). Un marcador es visible si está dentro de CUALQUIER zona.
- **`getBoundingClientRect()` retorna `{0,0}` en elementos con `display: none`**. Siempre mostrar todos los marcadores antes de filtrar:
  ```ts
  markers.forEach(m => m.style.display = "")  // show all first
  // luego filtrar con getBoundingClientRect()
  ```
- El `syncCallback` de pan/zoom también debe respetar esta lógica y el estado de `markersVisible`.
- **Al iniciar un nuevo cálculo**, llamar `onClear()` + `onSetOrigin(lat, lng)` para limpiar zonas previas y restaurar el marcador de origen. Sin esto, rings de cálculos anteriores quedan acumulados en el filtro.

### 7. Extensión — Multi-transporte
- Cada transporte tiene su propio color de polígono:
  ```ts
  const TRANSPORT_COLORS = {
    walking: "#16a34a", cycling: "#f59e0b",
    driving: "#dc2626", public_transport: "#7c3aed",
  }
  ```
- Los cálculos multi-transporte se hacen en paralelo con `Promise.all` y luego se llama `onCalculate` por cada resultado.
- El costo en tokens = cantidad de transportes seleccionados que no son `"walking"`.

### 8. Extensión — Cache Local (localStorage)
- El cache (`cache.ts`) guarda el GeoJSON completo localmente para recargar cálculos sin consumir tokens.
- Formato actual:
  ```ts
  interface CacheEntry {
    params: { lat, lng, time, address? }
    layers: { transport: string; geojson: GeoJSON }[]
    timestamp: string
  }
  ```
- Si hay entradas con formato viejo (`params.transport`), se limpia automáticamente.
- La web **no necesita** el GeoJSON del historial — solo metadata. No volver a agregar la columna `geojson` a la DB.

### 9. API / oRPC (`@mudar/api`)
- Al agregar rutas al router, modificar `packages/api/src/router.ts`.
- Todos los inputs se validan con `zod`.
- Para procedimientos autenticados usar `authedProcedure`.
- **Para invalidar queries de tokens**, usar la queryKey de oRPC, no strings hardcodeados:
  ```ts
  queryClient.invalidateQueries({ queryKey: orpc.tokens.balance.queryOptions().queryKey })
  ```

### 10. Sistema de Tokens
- `tokens` guarda ledger del usuario. `amount` puede ser positivo (grant/compra) o negativo (consumo).
- Balance = `sum(tokens.amount)` con Drizzle.
- `walking` es el único transporte gratuito (`FREE_TRANSPORTS = new Set(["walking"])`).
- El servidor verifica saldo ANTES de llamar a TravelTime. Si no hay cobertura (`NoCoverageError`) no se descuenta token.

### 11. CORS e Integración Extensión ↔ Web
- Las requests desde la extensión pasan por el background como proxy usando `RPCLink` con `browser.runtime.connect()`.
- La extensión no llama directamente a la API web — evita problemas de CORS y credenciales.

### 12. Comandos Frecuentes
```bash
pnpm dev                              # levanta WXT + Next.js a la vez
pnpm --filter @mudar/db push          # sync schema → DB (interactivo si hay drops)
pnpm --filter @<pkg> typecheck        # verificar tipos de un package
pnpm --filter @mudar/web remove <pkg> # eliminar dependencia de un workspace
```

### 13. Estilo de Código
- Archivos pequeños. Separar lógica de utilidades de componentes UI.
- No dejar `console.log` sueltos en commits finales (salvo errores críticos).
- Evitar mutaciones side-effects en Svelte y React. Funciones puras cuando sea posible.
- En el panel de la extensión, siempre agregar `font-family: inherit` a botones para heredar la tipografía del panel y no la del host.
