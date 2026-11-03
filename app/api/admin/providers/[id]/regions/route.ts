import { NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { apiProvider, apiRegion, region } from '@/lib/db/schema'
import { getAdmin } from '@/lib/admin-auth'

const input = z.object({ regionIds: z.array(z.string().min(1)).max(100) })
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const rows = await db.select({ id: region.id, code: region.code, name: region.name, enabled: region.enabled }).from(region).innerJoin(apiRegion, eq(apiRegion.regionId, region.id)).where(eq(apiRegion.apiId, id))
  return NextResponse.json(rows)
}
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const parsed = input.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid region assignments' }, { status: 400 })
  const uniqueIds = [...new Set(parsed.data.regionIds)]
  const result = await db.transaction(async (tx) => {
    const [provider] = await tx.select({ id: apiProvider.id }).from(apiProvider).where(eq(apiProvider.id, id)).limit(1)
    if (!provider) return null
    const valid = uniqueIds.length ? await tx.select({ id: region.id }).from(region).where(inArray(region.id, uniqueIds)) : []
    if (valid.length !== uniqueIds.length) throw new Error('One or more regions do not exist')
    await tx.delete(apiRegion).where(eq(apiRegion.apiId, id))
    if (uniqueIds.length) await tx.insert(apiRegion).values(uniqueIds.map((regionId) => ({ apiId: id, regionId }))).onConflictDoNothing()
    return valid.length
  }).catch((error) => ({ error: error instanceof Error ? error.message : 'Could not save assignments' }))
  if (typeof result === 'object' && result && 'error' in result) return NextResponse.json(result, { status: 400 })
  if (result === null) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  return NextResponse.json({ ok: true, assigned: result })
}
