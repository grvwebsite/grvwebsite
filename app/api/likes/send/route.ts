import { NextResponse } from 'next/server'
import { z } from 'zod'
import { deliverLikes, DeliveryError } from '@/lib/likes-delivery'
import { db } from '@/lib/db'
import { likeTransaction } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const input = z.object({ uid: z.string().trim(), coupon: z.string().trim(), region: z.string().trim(), requestId: z.string().uuid().optional() })

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ code: 'INVALID_REQUEST', error: 'UID, coupon and region are required.' }, { status: 400 })
  const requestId = parsed.data.requestId ?? crypto.randomUUID()
  const existing = await db.select({ id: likeTransaction.id, status: likeTransaction.status, delivered: likeTransaction.deliveredLikes }).from(likeTransaction).where(eq(likeTransaction.requestId, requestId)).limit(1)
  if (existing[0]) return NextResponse.json({ ...existing[0], idempotent: true }, { status: existing[0].status === 'success' ? 200 : 409 })
  try {
    return NextResponse.json({ requestId, ...(await deliverLikes({ uid: parsed.data.uid, couponCode: parsed.data.coupon, regionCode: parsed.data.region, requestId })) })
  } catch (error) {
    if (error instanceof DeliveryError) return NextResponse.json({ code: error.code, error: error.message, requestId }, { status: error.status })
    return NextResponse.json({ code: 'DELIVERY_FAILED', error: 'Likes delivery could not be completed.', requestId }, { status: 502 })
  }
}
