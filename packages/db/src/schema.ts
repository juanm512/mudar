// Tablas de negocio propias de Mudar
import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  real,
  jsonb,
} from "drizzle-orm/pg-core"

import { user } from "./auth-schema"

// Tokens del usuario (sistema freemium)
export const tokens = pgTable("tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Historial de cálculos de isócronas
export const calculations = pgTable("calculations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  timeSeconds: integer("time_seconds").notNull(),
  transport: text("transport").notNull(),
  geojson: jsonb("geojson").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
