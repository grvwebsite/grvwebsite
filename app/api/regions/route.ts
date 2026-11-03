import { NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { region } from '@/lib/db/schema'
import { z } from 'zod'
import { getAdmin } from '@/lib/admin-auth'

const schema = z.object({ name: z.string().trim().min(2).max(80), code: z.string().trim().min(2).max(12).regex(/^[A-Za-z0-9_-]+$/), flag: z.string().max(8).default(''), enabled: z.boolean().default(true) })
export async function GET() { const rows = await db.select({ id: region.id, name: region.name, code: region.code, flag: region.flag }).from(region).where(eq(region.enabled, true)).orderBy(asc(region.name)); return NextResponse.json(rows) }
export async function POST(request: Request) { if (!(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); const body = schema.safeParse(await request.json().catch(() => null)); if (!body.success) return NextResponse.json({ error: 'Invalid region' }, { status: 400 }); const created = await db.insert(region).values({ id: crypto.randomUUID(), ...body.data, code: body.data.code.toUpperCase() }).returning({ id: region.id, name: region.name, code: region.code, flag: region.flag, enabled: region.enabled }); return NextResponse.json(created[0], { status: 201 }) }
