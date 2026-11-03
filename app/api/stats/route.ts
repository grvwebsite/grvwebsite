import { NextResponse } from 'next/server'
import { and, eq, gte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { autoLikeSubscription, likeTransaction } from '@/lib/db/schema'

export async function GET() {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const [today] = await db.select({ likes: sql<number>`coalesce(sum(${likeTransaction.deliveredLikes}), 0)`, requests: sql<number>`count(*)` }).from(likeTransaction).where(and(gte(likeTransaction.createdAt, start), eq(likeTransaction.status, 'success')))
  const [total] = await db.select({ likes: sql<number>`coalesce(sum(${likeTransaction.deliveredLikes}), 0)`, uids: sql<number>`count(distinct ${likeTransaction.uid})` }).from(likeTransaction).where(eq(likeTransaction.status, 'success'))
  const [active] = await db.select({ count: sql<number>`count(*)` }).from(autoLikeSubscription).where(eq(autoLikeSubscription.status, 'active'))
  return NextResponse.json({ todayLikes: Number(today.likes), todayRequests: Number(today.requests), totalLikes: Number(total.likes), totalUids: Number(total.uids), activeAutoLikes: Number(active.count) })
}
