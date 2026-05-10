/**
 * Environment variables validation using Zod.
 * Throws descriptive errors at runtime when required variables are missing.
 */
import { z } from "zod"

const ServerSchema = z.object({
  COVALENT_API_KEY: z.string().min(1, "COVALENT_API_KEY is required."),
  NEXT_PUBLIC_PROJECT_ID: z.string().min(1, "NEXT_PUBLIC_PROJECT_ID is required."), // also checked client-side
  NEXT_PUBLIC_METADATA_URL: z.string().url("NEXT_PUBLIC_METADATA_URL must be a valid URL."),
})

const ClientSchema = z.object({
  NEXT_PUBLIC_PROJECT_ID: z.string().min(1, "NEXT_PUBLIC_PROJECT_ID is required."),
  NEXT_PUBLIC_METADATA_URL: z.string().url("NEXT_PUBLIC_METADATA_URL must be a valid URL."),
})

export function getServerEnv() {
  const parsed = ServerSchema.safeParse({
    COVALENT_API_KEY: process.env.COVALENT_API_KEY,
    NEXT_PUBLIC_PROJECT_ID: process.env.NEXT_PUBLIC_PROJECT_ID,
    NEXT_PUBLIC_METADATA_URL: process.env.NEXT_PUBLIC_METADATA_URL,
  })
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")
    throw new Error(`Environment validation failed: ${msg}`)
  }
  return parsed.data
}

export function getClientEnv() {
  const parsed = ClientSchema.safeParse({
    NEXT_PUBLIC_PROJECT_ID: process.env.NEXT_PUBLIC_PROJECT_ID,
    NEXT_PUBLIC_METADATA_URL: process.env.NEXT_PUBLIC_METADATA_URL,
  })
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")
    throw new Error(`Environment validation failed: ${msg}`)
  }
  return parsed.data
}
