# Mudarg — Buscá propiedades por tiempo de viaje

**Mudarg** es una extensión de navegador que enriquece los portales inmobiliarios argentinos (ArgenProp y ZonaProp) con datos de tiempo de viaje. Dibujá sobre el mapa que ya estás usando la zona a la que llegás en N minutos caminando, en bici, en auto o en transporte público, y quedate solo con las propiedades que entran en esa zona.

🌐 Web y dashboard: [mudar-web.vercel.app](https://mudar-web.vercel.app/) · Dominio: [mudarg.com](https://mudarg.com)

> Este repositorio es el **producto en producción**. Es la evolución de [`relocate-app`](https://github.com/juanm512/relocate-app), el MVP en Flask + Leaflet que validó la idea de "mapa de alcance" para CABA. Más abajo se explica la relación entre ambos.

---

## 📸 Así se ve

**Antes vs. después: el mapa de ArgenProp con la isócrona de Mudarg**

![Mapa antes y después de aplicar Mudarg](https://mudar-web.vercel.app/images/mockup.png)

**La extensión en acción (panel lateral + overlay sobre el mapa)**

![Demo animada de la extensión](https://mudar-web.vercel.app/images/muestra-extension.gif)

**Filtrado de propiedades: solo las que están dentro de la zona**

![Panel de Mudarg con 134 propiedades a 10 minutos en auto](https://mudar-web.vercel.app/images/filtro-con-externos.png)

---

## 🧭 El problema y la solución

**El problema.** Buscar departamento no debería ser un trabajo de tiempo completo. Perdés horas abriendo cada propiedad en una pestaña nueva, copiando la dirección y calculando en Google Maps cuánto tardás al trabajo o a la facultad.

**La solución.** Mudarg trae el tiempo de viaje directo al mapa del portal, sin salir de la página. Elegís un punto (tu oficina, tu facultad, la casa de alguien), un tiempo máximo y un medio de transporte, y el mapa se filtra al instante.

## ✨ Funcionalidades

- 🗺️ **Isócronas sobre el mapa real** de ArgenProp y ZonaProp. La zona se dibuja como overlay y se sincroniza con el pan/zoom del mapa original.
- 🔍 **Búsqueda por dirección** con autocompletado (Nominatim / OpenStreetMap) o usando el centro del mapa como origen.
- 🚶🚲🚗🚌 **Cuatro medios de transporte**: caminando, bicicleta, auto y transporte público, con un color de polígono por transporte.
- 🔀 **Multi-transporte**: hasta dos zonas simultáneas para comparar, por ejemplo, "20 min en bici" contra "20 min en colectivo".
- ⏱️ **Tiempo configurable** de 5 a 180 minutos.
- 🎯 **Filtro de marcadores**: ocultá de un clic las propiedades que quedan fuera de cualquier zona activa, y volvé a mostrarlas cuando quieras.
- 💾 **Cache local**: los cálculos se guardan en el navegador y se pueden recargar sin gastar tokens.
- 👤 **Cuenta y dashboard web**: registro con email o Google, historial de cálculos, saldo de tokens y compra de packs.
- 🪙 **Sistema de tokens**: cada cálculo consume 1 token por transporte. Los usuarios nuevos reciben tokens iniciales gratis y pueden comprar packs desde el dashboard.

## 🚀 Cómo se usa

1. Creá tu cuenta en [mudar-web.vercel.app](https://mudar-web.vercel.app/) e instalá la extensión (gratis).
2. Abrí ArgenProp o ZonaProp y navegá como siempre. Aparece el panel de Mudarg sobre el mapa.
3. Escribí una dirección o usá el centro del mapa como origen.
4. Elegí el tiempo máximo y uno o dos medios de transporte.
5. Calculá. La zona se dibuja sobre el mapa y podés dejar visibles solo las propiedades dentro de ella.

---

## 🏗 Arquitectura

Mudarg es un monorepo con **pnpm workspaces + Turborepo** con dos aplicaciones y varios packages compartidos.

```
mudar/
├── apps/
│   ├── web/          # Next.js (App Router): landing, auth, dashboard, API oRPC, webhooks de pago
│   └── extension/    # WXT + Svelte 5: panel lateral, overlay Leaflet, filtro de marcadores, cache
├── packages/
│   ├── api/          # Router oRPC tipado end-to-end (geo, tokens, user)
│   ├── auth/         # better-auth (email + Google OAuth, emails con Resend)
│   ├── db/           # Drizzle ORM + PostgreSQL: schema, cliente, seed de packs
│   ├── geo/          # Clientes de TravelTime (isócronas) y Nominatim (geocoding)
│   ├── polar/        # Checkout y webhooks de Polar (pagos)
│   └── rebill/       # Integración legacy con Rebill (reemplazada por Polar)
└── tooling/          # Configs compartidas de eslint, prettier, tailwind y typescript
```

### Flujo de un cálculo

1. El usuario inicia sesión en la web. La sesión queda en una cookie de `better-auth`.
2. En el portal, el content script de la extensión muestra el panel dentro de un **Shadow DOM** para que los estilos del sitio no lo rompan.
3. El panel geocodifica la dirección con Nominatim y arma el request.
4. La llamada a la API sale por el **background script** de la extensión, que hace de proxy vía `RPCLink` sobre un message port. Así se evitan problemas de CORS y credenciales.
5. El servidor (`@mudar/api`) verifica el saldo de tokens **antes** de llamar a TravelTime. Si la zona no tiene cobertura, no se descuenta nada.
6. TravelTime devuelve un polígono GeoJSON. El servidor guarda solo los metadatos del cálculo en `calculations` y descuenta el token.
7. La extensión dibuja el polígono en un mapa Leaflet espejado sobre el del portal y filtra los marcadores según estén dentro de alguna zona activa (ver [el desafío técnico](#el-desafío-técnico-un-mapa-que-no-se-puede-tocar)).
8. El GeoJSON se cachea en `localStorage` para poder recargarlo sin consumir tokens.

### El desafío técnico: un mapa que no se puede tocar

El mayor obstáculo del proyecto, y el que lo frenó por un tiempo, fue que **no hay forma de acceder al mapa de ArgenProp desde la extensión**. Los content scripts de Chrome corren en un contexto JavaScript aislado, así que no se puede leer la instancia de Leaflet del portal, ni sus coordenadas, ni sus parámetros, ni agregarle capas. El mapa era, en la práctica, una caja negra.

La solución fue **espejar el mapa**:

1. La extensión crea un **segundo mapa Leaflet propio, totalmente invisible**, superpuesto al del portal y con `pointer-events: none` para no interferir con la interacción del usuario.
2. Para saber dónde está el mapa original, lee lo único que sí es visible desde el DOM: los **tiles**. De la URL de un tile se obtienen `z/x/y` y, con su posición en pantalla, se puede calcular a qué latitud y longitud corresponde cada píxel del contenedor.
3. Con esa referencia, el mapa espejo se mantiene **sincronizado en cada pan y zoom** con el original. Sobre él se dibujan las isócronas y el marcador de origen.
4. Los **marcadores de propiedades sí son accesibles** como elementos del DOM. Se les calcula su coordenada con la misma proyección inversa, se evalúa si caen dentro de alguna zona activa y se ocultan o muestran con CSS según corresponda.

Así el usuario ve las zonas "sobre" el mapa de ArgenProp y el filtro de propiedades funciona, sin que la extensión modifique nunca el mapa del portal.

### Tokens y pagos

- La tabla `tokens` es un ledger: cada fila suma o resta y el saldo es la suma de las filas del usuario.
- Los packs se definen en `token_packs` y se cargan con `pnpm db:seed`.
- La compra crea una orden `pending` en `token_orders` y abre un Checkout de **Polar**. El webhook de Polar acredita los tokens al confirmarse el pago. Polar tiene modo sandbox para probar sin cobrar.

## 🛠 Stack

| Capa | Tecnología |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Web app | Next.js 16 (App Router, Turbopack, React Compiler) + React 19 |
| Extensión | WXT + Svelte 5 (runes) + Leaflet |
| API | oRPC v1 (tipado end-to-end) + Zod |
| ORM / DB | Drizzle ORM + PostgreSQL |
| Auth | better-auth (email/password + Google OAuth) |
| Emails | Resend |
| Pagos | Polar |
| Estilos | Tailwind CSS v4 |
| Isócronas | TravelTime API |
| Geocoding | Nominatim (OpenStreetMap) |
| Analytics | Google Tag Manager / GA4 |
| Hosting | Vercel |

---

## 💻 Desarrollo local

### Requisitos

- Node.js 18+ y pnpm 9
- Docker (para PostgreSQL) o una instancia de Postgres propia
- Credenciales de TravelTime, Google OAuth, Resend y Polar (ver `.env.example`)

### 1. Clonar y configurar el entorno

```bash
git clone https://github.com/juanm512/mudar.git
cd mudar
cp .env.example .env
# Completar .env con tus credenciales
```

Las variables viven en un único `.env` en la raíz y las carga `dotenv-cli` al correr los scripts.

### 2. Levantar PostgreSQL

```bash
docker compose up -d
```

El `docker-compose.yml` expone Postgres en el puerto `54321` con usuario, contraseña y base `mudar`/`mudar`/`mudar_dev`. Ajustá `DATABASE_URL` en tu `.env` según eso.

### 3. Instalar dependencias y crear las tablas

```bash
pnpm install
pnpm db:push     # sincroniza el schema de Drizzle con la DB
pnpm db:seed     # carga los packs de tokens
```

### 4. Correr en modo desarrollo

```bash
pnpm dev
```

- Web: [http://localhost:3001](http://localhost:3001)
- Extensión: WXT la compila en `apps/extension/.output/`. Cargala en `chrome://extensions` con el "Modo desarrollador" → "Cargar descomprimida".

### Comandos útiles

```bash
pnpm build                          # build de todos los workspaces
pnpm typecheck                      # verificación de tipos
pnpm lint
pnpm --filter @mudar/db push        # solo la DB
pnpm --filter @mudar/extension zip  # empaquetar la extensión para publicar
```

Las guías de arquitectura y las reglas para asistentes de IA están en [`claude.md`](./claude.md).

---

## 🔬 De Relocate a Mudarg

[`relocate-app`](https://github.com/juanm512/relocate-app) fue el MVP que dio origen a este proyecto: una app en **Python + Flask** con frontend en JavaScript vanilla y Leaflet que mostraba, para un punto de CABA, hasta dónde se podía vivir razonablemente según el medio de transporte.

Lo que se validó ahí y sigue vivo en Mudarg:

- La idea central de elegir **destino + transporte + tiempo máximo** y ver el resultado como una zona en el mapa.
- Los medios de transporte: caminar, bici, auto y transporte público.
- Geocoding con Nominatim y mapa base de OpenStreetMap.

Lo que cambió:

| | Relocate (MVP) | Mudarg (producción) |
|---|---|---|
| Formato | Web app propia | Extensión que se integra al portal inmobiliario |
| Isócronas | Algoritmo propio sobre datos GTFS + OpenRouteService | TravelTime API |
| Cobertura | Solo CABA | Toda la cobertura de TravelTime en Argentina |
| Propiedades | No integraba inmobiliarias | Filtra los listings reales de ArgenProp y ZonaProp |
| Backend | Flask + Shapely | Next.js + oRPC + Drizzle + PostgreSQL |
| Cuentas y pagos | No tenía | Auth, tokens y packs de pago |

La "integración inmobiliaria" que Relocate listaba como trabajo futuro terminó siendo el producto entero.

## 🤝 Contribuir

1. Fork del proyecto.
2. Creá una rama (`git checkout -b feature/nueva-funcionalidad`).
3. Corré `pnpm typecheck` y `pnpm lint` antes de commitear.
4. Abrí un Pull Request.

## 📬 Contacto

Escribinos a [ayuda@mudarg.com](mailto:ayuda@mudarg.com).

## 🙏 Agradecimientos

- OpenStreetMap contributors y Nominatim
- TravelTime
- Leaflet.js, WXT y Svelte

---

**Hecho con ❤️ para que mudarse sea más fácil.**
