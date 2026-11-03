import { readFile } from 'node:fs/promises'

const path = process.env.PAYMENT_API_KEY_FILE ?? '/etc/developer-zone/secrets/payment-api-key'

export async function getPaymentApiKey(fallback?: string | null) {
  try {
    const value = (await readFile(path, 'utf8')).trim()
    if (value) return value
  } catch {}
  return process.env.ANUJBOTS_API_KEY ?? fallback ?? null
}
