import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  real,
  jsonb,
} from "drizzle-orm/pg-core"

// Tabla de usuarios — manejada por better-auth
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Tokens del usuario (sistema freemium)
export const tokens = pgTable("tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Historial de cálculos de isócronas
export const calculations = pgTable("calculations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  timeSeconds: integer("time_seconds").notNull(),
  transport: text("transport").notNull(),
  geojson: jsonb("geojson").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
