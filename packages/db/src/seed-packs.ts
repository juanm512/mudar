import { db } from "./client"
import { tokenPacks } from "./schema"

async function seed() {
  await db.insert(tokenPacks).values([
    { name: "Starter",  tokens: 25,   priceArs: 99900 },
    { name: "Pro",      tokens: 100,  priceArs: 299900 },
    { name: "Business", tokens: 500,  priceArs: 999900 },
  ]).onConflictDoNothing()
  console.log("Token packs seeded ✅")
  process.exit(0)
}

seed()
