import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { coupon } from '@/lib/db/schema'
const input = z.object({ code: z.string().trim().min(4).max(64) })
export async function POST(request: Request) { const parsed = input.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: 'Invalid coupon code.' }, { status: 400 }); const row = (await db.select({ totalLikes: coupon.totalLikes, balance: coupon.balance, dailyLimit: coupon.dailyLimit, expiresAt: coupon.expiresAt, enabled: coupon.enabled, couponType: coupon.couponType }).from(coupon).where(eq(coupon.code, parsed.data.code.toUpperCase())).limit(1))[0]; if (!row) return NextResponse.json({ error: 'Coupon not found.' }, { status: 404 }); return NextResponse.json({ totalLikes: row.totalLikes, remainingLikes: row.balance, usedLikes: row.totalLikes - row.balance, dailyLimit: row.dailyLimit, expiresAt: row.expiresAt, active: row.enabled && (!row.expiresAt || row.expiresAt > new Date()), autoLikesEligible: row.couponType === 'autolikes' || row.couponType === 'universal' }) }
