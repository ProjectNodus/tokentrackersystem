import { z } from "zod"

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  ARENA_BEARER_TOKEN: z.string().min(1),
  DISCORD_WEBHOOK_CHAMPIONS: z.string().url(),
  DISCORD_WEBHOOK_HEAVY_HITTERS: z.string().url(),
  DISCORD_WEBHOOK_GENERAL: z.string().url(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error(
    "Missing or invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  )
  throw new Error("Invalid environment configuration")
}

export const env = parsed.data
