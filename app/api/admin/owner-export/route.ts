import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { admin, apiProvider, apiRegion, region, adminAuditLog } from '@/lib/db/schema'
import { getAdmin } from '@/lib/admin-auth'

export const runtime = 'nodejs'
const requestSchema = z.object({ currentPassword: z.string().min(1).max(256) })
export async function POST(request: Request) {
  const current = await getAdmin()
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // The oldest active admin is the bootstrap owner; other admins cannot export secrets.
  const [owner] = await db.select({ id: admin.id }).from(admin).where(eq(admin.active, true)).orderBy(asc(admin.createdAt), asc(admin.id)).limit(1)
  if (!owner || current.id !== owner.id) return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Password required' }, { status: 400 })
  if (!await bcrypt.compare(parsed.data.currentPassword, current.passwordHash)) return NextResponse.json({ error: 'Invalid password' }, { status: 403 })
  const [providers, mappings, regions] = await Promise.all([db.select().from(apiProvider), db.select().from(apiRegion), db.select().from(region)])
  await db.insert(adminAuditLog).values({ adminId: current.id, action: 'owner_provider_export', entityType: 'api_provider', details: { providerCount: providers.length } })
  const data = JSON.stringify({ format: 'developer-zone-owner-api-backup-v1', createdAt: new Date().toISOString(), providers, mappings, regions }, null, 2)
  return new Response(data, { headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': 'attachment; filename="developer-zone-owner-api-backup.json"', 'cache-control': 'no-store, private', 'x-content-type-options': 'nosniff' } })
}
