import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { packageTable, paymentOrder } from '@/lib/db/schema'

const input = z.object({ packageId: z.string().min(1), contact: z.string().trim().min(7).max(32) })
export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Payments are temporarily unavailable' }, { status: 503 })
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const parsed = input.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid checkout details' }, { status: 400 })
  const [pkg] = await db.select().from(packageTable).where(eq(packageTable.id, parsed.data.packageId)).limit(1)
  if (!pkg || !pkg.enabled) return NextResponse.json({ error: 'Package unavailable' }, { status: 404 })
  const [order] = await db.insert(paymentOrder).values({ packageId: pkg.id, contact: parsed.data.contact, amountPaise: pkg.pricePaise }).returning({ id: paymentOrder.id })
  const origin = request.headers.get('origin') ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
  const session = await stripe.checkout.sessions.create({ mode: 'payment', line_items: [{ price_data: { currency: 'inr', product_data: { name: `${pkg.likes} Free Fire Likes` }, unit_amount: pkg.pricePaise }, quantity: 1 }], metadata: { orderId: order.id }, success_url: `${origin}/buy-coupon?order=${order.id}`, cancel_url: `${origin}/buy-coupon?cancelled=1` })
  await db.update(paymentOrder).set({ providerReference: session.id, updatedAt: new Date() }).where(eq(paymentOrder.id, order.id))
  return NextResponse.json({ orderId: order.id, checkoutUrl: session.url })
}
