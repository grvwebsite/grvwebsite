import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adminSession } from '@/lib/db/schema'
import { COOKIE } from '@/lib/admin-auth'

export async function GET(request: Request) { const jar = await cookies(); const token = jar.get(COOKIE)?.value; if (token) await db.delete(adminSession).where(eq(adminSession.id, token)); jar.delete(COOKIE); return NextResponse.redirect(new URL('/admin/login', request.url)) }
