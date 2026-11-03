import pg from 'pg'
import { setTimeout as delay } from 'node:timers/promises'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const appUrl = process.env.WORKER_APP_URL || 'http://127.0.0.1:3000'
const intervalMs = 10_000

function istDate() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) }
function nextFourAmIst() { const now = new Date(); const date = istDate(); const candidate = new Date(`${date}T04:00:00+05:30`); return candidate > now ? candidate : new Date(candidate.getTime() + 86_400_000) }

let lastResetDate = ''

async function tick() {
  const client = await pool.connect()
  try {
    const lock = await client.query("SELECT pg_try_advisory_lock(hashtext('developer-zone-autolikes')) AS locked")
    if (!lock.rows[0].locked) return
    const now = new Date()
    const istTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(now)
    const day = istDate()
    if (istTime === '03:55' && lastResetDate !== day) { await client.query('UPDATE api_rotation_counter SET confirmed_claims=0, reserved_claims=0, updated_at=now()'); await client.query("UPDATE api_rotation_reservation SET status='released', settled_at=now() WHERE status='reserved'"); lastResetDate = day }
    const due = await client.query(`SELECT s.id, s.uid, s.coupon_id, c.code, s.region_code FROM auto_like_subscription s JOIN coupon c ON c.id=s.coupon_id WHERE s.status='active' AND s.next_delivery_at <= now() AND (s.expires_at IS NULL OR s.expires_at > now()) AND NOT EXISTS (SELECT 1 FROM auto_like_execution e WHERE e.subscription_id=s.id AND e.executed_at::date = $1::date) FOR UPDATE OF s SKIP LOCKED LIMIT 50`, [day])
    for (const item of due.rows) {
      let status = 'failed'; let delivered = 0; let errorMessage = null
      try {
        const response = await fetch(`${appUrl}/api/likes/send`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-worker': 'autolikes' }, body: JSON.stringify({ uid: item.uid, coupon: item.code, region: item.region_code, requestId: crypto.randomUUID() }) })
        const body = await response.json().catch(() => ({})); delivered = Number(body.delivered) || 0; status = delivered > 0 ? 'success' : 'failed'; if (!response.ok) errorMessage = body.error || `HTTP ${response.status}`
      } catch (error) { errorMessage = error instanceof Error ? error.message : 'Worker request failed' }
      await client.query('INSERT INTO auto_like_execution (id, subscription_id, status, delivered_likes, error_message) VALUES ($1,$2,$3,$4,$5)', [crypto.randomUUID(), item.id, status, delivered, errorMessage])
      await client.query('UPDATE auto_like_subscription SET last_delivery_at=now(), next_delivery_at=$1, updated_at=now() WHERE id=$2', [nextFourAmIst(), item.id])
    }
    await client.query("SELECT pg_advisory_unlock(hashtext('developer-zone-autolikes'))")
  } finally { client.release() }
}

console.log('[developer-zone] AutoLikes worker started')
while (true) { try { await tick() } catch (error) { console.error('[developer-zone] AutoLikes tick failed:', error instanceof Error ? error.message : error) } await delay(intervalMs) }
