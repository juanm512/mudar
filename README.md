# Mudar

Buscá propiedades en Argentina por tiempo de viaje con isócronas.

Filtrá listings de ArgenProp y ZonaProp mostrando solo las propiedades accesibles en N minutos caminando, en bici, en auto o en transporte público desde cualquier punto del mapa.

## Stack

| Capa | Tecnología |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Web app | Next.js 16.2 (Turbopack) + React 19 |
| Extensión | WXT + Svelte 5 |
| API | oRPC v1 (tipado end-to-end) |
| ORM | Drizzle ORM + PostgreSQL |
| Auth | better-auth v1 |
| Estilos | Tailwind CSS v4 |
| Isócronas | TravelTime API |
| Geocoding | Nominatim (OpenStreetMap) |

## Estructura

```
mudar/
├── apps/
│   ├── web/          # App Next.js — auth, dashboard, API route
│   └── extension/    # Extensión WXT+Svelte — panel lateral, overlay SVG
├── packages/
│   ├── api/          # Router oRPC con procedimientos tipados
│   ├── auth/         # Configuración better-auth
│   ├── db/           # Schema Drizzle + cliente PostgreSQL
│   └── geo/          # Cliente TravelTime API
└── tooling/
    ├── eslint/
    ├── prettier/
    ├── tailwind/
    └── typescript/
```

## Setup

### 1. Clonar y configurar variables de entorno

```bash
git clone <repo>
cd mudar
cp .env.example .env
# Editar .env con tus credenciales
```

### 2. Levantar PostgreSQL

Con Docker:

```bash
docker run --name mudar-pg -e POSTGRES_DB=mudar -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:16
```

O con Docker Compose si tenés un `compose.yml` propio.

### 3. Instalar dependencias

```bash
pnpm install
```

### 4. Crear tablas en la DB

```bash
pnpm --filter @mudar/db push
```

### 5. Desarrollo

```bash
pnpm dev
```

- Web: [http://localhost:3001](http://localhost:3001)
- Extensión: se compila en `apps/extension/.output/` — cargar en Chrome en `chrome://extensions` con "Modo desarrollador"

## Variables de entorno

Ver `.env.example` para la lista completa.

Las variables viven en un único `.env` en la raíz del monorepo y son cargadas por `dotenv-cli` al correr `pnpm dev`.

## Cómo funciona

1. El usuario se registra en la web app y recibe **10 tokens gratuitos**
2. Instala la extensión y la abre en ArgenProp
3. Escribe una dirección (geocoding via Nominatim) o usa el centro del mapa
4. Elige tiempo (15–60 min) y medio de transporte
5. La extensión llama al servidor via `fetch` con cookies de sesión
6. El servidor llama a TravelTime API y devuelve un polígono GeoJSON
7. La extensión dibuja el polígono como SVG overlay y filtra los markers del mapa
8. **Caminando es gratis**; los demás transportes consumen 1 token por cálculo
