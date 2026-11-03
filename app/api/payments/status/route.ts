import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { coupon, packageTable, paymentOrder } from '@/lib/db/schema'
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
export async function GET(request: Request) { const id = new URL(request.url).searchParams.get('orderId'); const token = (await cookies()).get('dz_payment_guest')?.value; if (!id || !token) return NextResponse.json({ error: 'Payment session expired.' }, { status: 401 }); const [row] = await db.select({ id: paymentOrder.id, status: paymentOrder.status, couponId: paymentOrder.couponId, qrCode: paymentOrder.qrCode, amountPaise: paymentOrder.amountPaise, packageId: paymentOrder.packageId }).from(paymentOrder).where(eq(paymentOrder.id, id)).limit(1); if (!row) return NextResponse.json({ error: 'Order not found.' }, { status: 404 }); const [owned] = await db.select({ id: paymentOrder.id, guestSessionHash: paymentOrder.guestSessionHash }).from(paymentOrder).where(eq(paymentOrder.id, id)).limit(1); if (owned?.id !== id || owned.guestSessionHash !== hash(token)) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 }); const [pkg] = await db.select({ likes: packageTable.likes }).from(packageTable).where(eq(packageTable.id, row.packageId)).limit(1); const [issued] = row.couponId ? await db.select({ code: coupon.code }).from(coupon).where(eq(coupon.id, row.couponId)).limit(1) : []
  return NextResponse.json({ ...row, likes: pkg?.likes ?? 0, couponCode: row.status === 'paid' ? issued?.code ?? null : null }) }
