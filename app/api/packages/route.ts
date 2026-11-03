import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { packageTable } from '@/lib/db/schema'

export async function GET() {
  const rows = await db.select({ id: packageTable.id, likes: packageTable.likes, pricePaise: packageTable.pricePaise }).from(packageTable).where(eq(packageTable.enabled, true))
  return NextResponse.json({ packages: rows })
}
