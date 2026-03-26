import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  server: {
    POLAR_ACCESS_TOKEN: z.string().min(1),
    POLAR_SANDBOX: z.enum(["true", "false"]).default("false"),
    APP_URL: z.string().url().default("http://localhost:3001"),
  },
  runtimeEnv: process.env,
})
