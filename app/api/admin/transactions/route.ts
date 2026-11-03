import { NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { likeTransaction } from '@/lib/db/schema'
import { getAdmin } from '@/lib/admin-auth'
export async function GET() { if (!await getAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); return NextResponse.json(await db.select().from(likeTransaction).orderBy(desc(likeTransaction.createdAt)).limit(200)) }
