import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { eq, and, gt } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { admin, adminSession } from '@/lib/db/schema'
import { COOKIE } from '@/lib/admin-auth'

const input = z.object({ username: z.string().trim().min(1).max(100), password: z.string().min(1).max(200) })
export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const rows = await db.select().from(admin).where(and(eq(admin.username, parsed.data.username), eq(admin.active, true))).limit(1)
  const record = rows[0]; if (!record || !(await bcrypt.compare(parsed.data.password, record.passwordHash))) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  const id = crypto.randomUUID(); await db.insert(adminSession).values({ id, adminId: record.id, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 12) })
  const jar = await cookies(); jar.set(COOKIE, id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 12 })
  return NextResponse.json({ ok: true })
}

export async function DELETE() { const jar = await cookies(); const token = jar.get(COOKIE)?.value; if (token) await db.delete(adminSession).where(eq(adminSession.id, token)); jar.delete(COOKIE); return NextResponse.json({ ok: true }) }
