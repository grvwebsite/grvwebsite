import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { paymentOrder } from '@/lib/db/schema'

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Payments are unavailable' }, { status: 503 })
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const signature = request.headers.get('stripe-signature')
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 })
  let event: Stripe.Event
  try { event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET) } catch { return NextResponse.json({ error: 'Invalid signature' }, { status: 400 }) }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const orderId = session.metadata?.orderId
    if (orderId && session.payment_status === 'paid') {
      const [order] = await db.select().from(paymentOrder).where(eq(paymentOrder.id, orderId)).limit(1)
      if (order && order.providerReference === session.id && order.amountPaise === session.amount_total && session.currency?.toLowerCase() === 'inr' && order.status !== 'paid') {
        await db.update(paymentOrder).set({ status: 'paid_awaiting_fulfillment', updatedAt: new Date() }).where(eq(paymentOrder.id, orderId))
      }
    }
  }
  return NextResponse.json({ received: true })
}
