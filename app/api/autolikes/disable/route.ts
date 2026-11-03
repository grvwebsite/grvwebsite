import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { autoLikeSubscription, coupon } from '@/lib/db/schema'

const input = z.object({ uid: z.string().regex(/^\d{6,15}$/), coupon: z.string().min(6).max(64) })
export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const rows = await db.select({ id: autoLikeSubscription.id }).from(autoLikeSubscription).innerJoin(coupon, eq(autoLikeSubscription.couponId, coupon.id)).where(and(eq(autoLikeSubscription.uid, parsed.data.uid), eq(coupon.code, parsed.data.coupon.toUpperCase()), eq(autoLikeSubscription.status, 'active'))).limit(1)
  if (!rows[0]) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  await db.update(autoLikeSubscription).set({ status: 'disabled', updatedAt: new Date() }).where(eq(autoLikeSubscription.id, rows[0].id))
  return NextResponse.json({ ok: true })
}
