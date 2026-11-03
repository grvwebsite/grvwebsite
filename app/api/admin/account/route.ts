import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { eq, ne, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { admin, adminSession, adminAuditLog } from '@/lib/db/schema'
import { getAdmin } from '@/lib/admin-auth'

const schema = z.object({ currentPassword: z.string().min(1), newUsername: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/).optional(), newPassword: z.string().min(12).max(128).optional() }).refine((v) => v.newUsername || v.newPassword, 'A new username or password is required')

export async function PATCH(request: Request) {
  const current = await getAdmin()
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid account update' }, { status: 400 })
  if (!(await bcrypt.compare(parsed.data.currentPassword, current.passwordHash))) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 })
  if (parsed.data.newUsername) {
    const taken = await db.select({ id: admin.id }).from(admin).where(and(eq(admin.username, parsed.data.newUsername), ne(admin.id, current.id))).limit(1)
    if (taken.length > 0) return NextResponse.json({ error: 'Username unavailable' }, { status: 409 })
  }
  const updates = { ...(parsed.data.newUsername ? { username: parsed.data.newUsername } : {}), ...(parsed.data.newPassword ? { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) } : {}), updatedAt: new Date() }
  await db.transaction(async (tx) => { await tx.update(admin).set(updates).where(eq(admin.id, current.id)); await tx.delete(adminSession).where(eq(adminSession.adminId, current.id)); await tx.insert(adminAuditLog).values({ adminId: current.id, action: 'credentials_updated', entityType: 'admin', entityId: current.id, details: { usernameChanged: Boolean(parsed.data.newUsername), passwordChanged: Boolean(parsed.data.newPassword) } }) })
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('dz_admin_session')
  return response
}
