import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHash, randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { packageTable, paymentOrder, paymentSettings } from '@/lib/db/schema'
import { getPaymentApiKey } from '@/lib/server/payment-secrets'
import { assertSafeProviderUrl } from '@/lib/server/provider-url'

const bodySchema = z.object({ packageId: z.string().min(1), contact: z.string().trim().min(7).max(32) })
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const json = (value: unknown) => { try { return JSON.parse(String(value)) as Record<string, unknown> } catch { return {} } }

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Select a package and enter a valid contact number.' }, { status: 400 })
  const [pkg] = await db.select().from(packageTable).where(eq(packageTable.id, parsed.data.packageId)).limit(1)
  const [settings] = await db.select().from(paymentSettings).where(eq(paymentSettings.id, 'default')).limit(1)
  const apiKey = await getPaymentApiKey(settings?.apiKey)
  if (!pkg?.enabled || !settings?.enabled || !apiKey) return NextResponse.json({ error: 'Payment gateway is not configured yet.' }, { status: 503 })
  await assertSafeProviderUrl(settings.createQrUrl)
  const guestToken = randomUUID() + randomUUID()
  const [order] = await db.insert(paymentOrder).values({ packageId: pkg.id, contact: parsed.data.contact, amountPaise: pkg.pricePaise, guestSessionHash: hash(guestToken) }).returning({ id: paymentOrder.id })
  const url = new URL(settings.createQrUrl); url.searchParams.set('api_key', apiKey); url.searchParams.set('amount', String(Math.round(pkg.pricePaise / 100)))
  const response = await fetch(url, { signal: AbortSignal.timeout(10000), cache: 'no-store', redirect: 'error' }).catch(() => null)
  if (!response?.ok) { await db.update(paymentOrder).set({ status: 'failed', updatedAt: new Date() }).where(eq(paymentOrder.id, order.id)); return NextResponse.json({ error: 'Payment gateway unavailable.' }, { status: 502 }) }
  const data = json(await response.text())
  const gatewayOrderId = typeof data.order_id === 'string' ? data.order_id : typeof data.orderId === 'string' ? data.orderId : typeof data.id === 'string' ? data.id : null
  const qr = typeof data.qr === 'string' ? data.qr : typeof data.qr_code === 'string' ? data.qr_code : typeof data.qrUrl === 'string' ? data.qrUrl : null
  if (!gatewayOrderId || !qr) { await db.update(paymentOrder).set({ status: 'failed', updatedAt: new Date() }).where(eq(paymentOrder.id, order.id)); return NextResponse.json({ error: 'Gateway response needs manual configuration before checkout can be enabled.' }, { status: 502 }) }
  await db.update(paymentOrder).set({ providerReference: gatewayOrderId, qrCode: qr, updatedAt: new Date() }).where(eq(paymentOrder.id, order.id))
  const result = NextResponse.json({ orderId: order.id, amountPaise: pkg.pricePaise, expiresAt: new Date(Date.now() + settings.expirationMinutes * 60000).toISOString() })
  result.cookies.set('dz_payment_guest', guestToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 })
  return result
}
