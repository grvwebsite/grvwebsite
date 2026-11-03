import { redirect } from 'next/navigation'
import { asc } from 'drizzle-orm'
import { getAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { region } from '@/lib/db/schema'
import RegionsManager from './regions-manager'

export default async function RegionsPage() { if (!await getAdmin()) redirect('/admin/login'); const rows = await db.select().from(region).orderBy(asc(region.name)); return <RegionsManager initialRegions={rows.map(({ id, name, code, flag, enabled }) => ({ id, name, code, flag, enabled }))} /> }
