import { cookies } from 'next/headers'
import { eq, and, gt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adminSession, admin } from '@/lib/db/schema'

const COOKIE = 'dz_admin_session'
export async function getAdmin() {
  const token = (await cookies()).get(COOKIE)?.value
  if (!token) return null
  const rows = await db.select({ admin: admin }).from(adminSession).innerJoin(admin, eq(adminSession.adminId, admin.id)).where(and(eq(adminSession.id, token), gt(adminSession.expiresAt, new Date()), eq(admin.active, true))).limit(1)
  return rows[0]?.admin ?? null
}
export async function requireAdmin() { const current = await getAdmin(); if (!current) throw new Error('Unauthorized'); return current }
export { COOKIE }
