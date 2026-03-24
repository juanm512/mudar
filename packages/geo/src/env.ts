import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  server: {
    TRAVELTIME_APP_ID: z.string().default(""),
    TRAVELTIME_API_KEY: z.string().default(""),
  },
  runtimeEnv: process.env,
})
