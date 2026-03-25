import { db } from "./client"
import { tokenPacks } from "./schema"

async function seed() {
  await db.insert(tokenPacks).values([
    { name: "Búsqueda básica",  tokens: 5,   priceArs: 900000 },
    { name: "Búsqueda completa",      tokens: 10,  priceArs: 1600000 },
    { name: "Mudanza tranquila", tokens: 22,  priceArs: 3000000 },
  ]).onConflictDoNothing()
  console.log("Token packs seeded ✅")
  process.exit(0)
}

seed()
