import pg from 'pg'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 })
const intervalMs = Math.max(5000, Number(process.env.PAYMENT_VERIFY_INTERVAL_SECONDS || 10) * 1000)

// Only paid_awaiting_fulfillment orders are eligible. This worker NEVER declares a payment paid.
// Gateway verification / signed webhooks must happen separately.
async function fulfillOne() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: [order] } = await client.query(`
      SELECT o.id, o.package_id, o.coupon_id, o.status, p.likes
      FROM payment_order o JOIN package p ON p.id = o.package_id
      WHERE o.status = 'paid_awaiting_fulfillment'
      ORDER BY o.created_at ASC
      FOR UPDATE OF o SKIP LOCKED LIMIT 1`)
    if (!order) { await client.query('COMMIT'); return false }
    if (!Number.isSafeInteger(order.likes) || order.likes <= 0) throw new Error('Invalid package likes')
    let couponId = order.coupon_id
    if (!couponId) {
      couponId = randomUUID()
      const couponCode = `DZ-${randomUUID().replaceAll('-', '').toUpperCase().slice(0, 16)}`
      await client.query(`INSERT INTO coupon (id, code, balance, total_likes, daily_limit, coupon_type, allowed_regions, enabled)
        VALUES ($1, $2, $3, $3, $4, 'normal', '[]'::jsonb, true)`,
        [couponId, couponCode, order.likes, Math.min(order.likes, 100)])
      await client.query('UPDATE payment_order SET coupon_id=$1, updated_at=now() WHERE id=$2', [couponId, order.id])
    }
    await client.query(`INSERT INTO payment_fulfillment_event (id, payment_order_id, coupon_id)
      VALUES ($1,$2,$3) ON CONFLICT (payment_order_id) DO NOTHING`, [randomUUID(), order.id, couponId])
    await client.query("UPDATE payment_order SET status='paid', updated_at=now() WHERE id=$1", [order.id])
    await client.query('COMMIT')
    console.log(`[payment-worker] fulfilled order ${order.id}`)
    return true
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally { client.release() }
}

console.log('[payment-worker] fulfillment worker started; does not verify payments')
while (true) {
  try {
    for (let i = 0; i < 25; i++) if (!(await fulfillOne())) break
  } catch (error) { console.error('[payment-worker] fulfillment error:', error instanceof Error ? error.message : error) }
  await delay(intervalMs)
}
