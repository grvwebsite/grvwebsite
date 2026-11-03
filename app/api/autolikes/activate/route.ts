import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { autoLikeSubscription, coupon, region } from '@/lib/db/schema'
import { nextFourAmIst } from '@/lib/ist-schedule'

const input = z.object({ uid: z.string().regex(/^\d{6,15}$/), coupon: z.string().trim().min(6).max(64), region: z.string().trim().min(2).max(12) })

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { uid, coupon: code, region: regionCode } = parsed.data
  const now = new Date()
  const result = await db.transaction(async tx => {
    const [selectedRegion] = await tx.select().from(region).where(and(eq(region.code, regionCode.toUpperCase()), eq(region.enabled, true))).limit(1)
    if (!selectedRegion) throw new Error('UNSUPPORTED_REGION')
    const [selectedCoupon] = await tx.select().from(coupon).where(and(eq(coupon.code, code.toUpperCase()), eq(coupon.enabled, true))).limit(1)
    if (!selectedCoupon || selectedCoupon.balance <= 0 || (selectedCoupon.expiresAt && selectedCoupon.expiresAt <= now)) throw new Error('INVALID_COUPON')
    if (selectedCoupon.allowedRegions.length && !selectedCoupon.allowedRegions.includes(regionCode.toUpperCase())) throw new Error('REGION_RESTRICTED')
    const [existing] = await tx.select().from(autoLikeSubscription).where(and(eq(autoLikeSubscription.uid, uid), eq(autoLikeSubscription.status, 'active'))).limit(1)
    if (existing) throw new Error('ALREADY_ACTIVE')
    const [created] = await tx.insert(autoLikeSubscription).values({ uid, couponId: selectedCoupon.id, regionCode: regionCode.toUpperCase(), dailyLimit: selectedCoupon.dailyLimit, nextDeliveryAt: nextFourAmIst(now) }).returning({ id: autoLikeSubscription.id })
    return created
  }).catch(error => ({ error: error instanceof Error ? error.message : 'ACTIVATION_FAILED' }))
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.error === 'ALREADY_ACTIVE' ? 409 : 400 })
  return NextResponse.json({ ok: true, subscriptionId: result.id, nextDeliveryAt: nextFourAmIst(now).toISOString() })
}
