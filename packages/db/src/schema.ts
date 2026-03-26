// Tablas de negocio propias de Mudar
import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  real,
  boolean,
} from "drizzle-orm/pg-core"

import { user } from "./auth-schema"

// ── Token packs (catálogo de packs disponibles) ──────────────────────────────
export const tokenPacks = pgTable("token_packs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  tokens: integer("tokens").notNull(),
  priceArs: integer("price_ars").notNull(),
  active: boolean("active").default(true).notNull(),
  polarProductId: text("polar_product_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ── Token orders (registro de cada compra) ───────────────────────────────────
export const tokenOrders = pgTable("token_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  packId: uuid("pack_id")
    .notNull()
    .references(() => tokenPacks.id),
  tokensGranted: integer("tokens_granted").notNull(),
  pricePaid: integer("price_paid").notNull(),
  status: text("status").notNull().default("completed"),
  externalId: text("external_id"),
  paymentProvider: text("payment_provider"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ── Tokens del usuario (sistema freemium — ledger) ───────────────────────────
export const tokens = pgTable("tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(), // "initial_grant" | "purchase" | "isochrone" | "bonus" | "refund"
  orderId: uuid("order_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ── Historial de cálculos de isócronas ───────────────────────────────────────
export const calculations = pgTable("calculations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  timeSeconds: integer("time_seconds").notNull(),
  transport: text("transport").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
