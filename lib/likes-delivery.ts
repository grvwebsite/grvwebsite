import { and, eq, gte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { apiProvider, apiRotationReservation, coupon, dailyUidUsage, likeTransaction, region } from '@/lib/db/schema'
import { reserveProviderSlotInTransaction, settleProviderSlotInTransaction } from '@/lib/api-rotation'
import { assertSafeProviderUrl } from '@/lib/server/provider-url'

const UID_PATTERN = /^\d{6,12}$/
const DEFAULT_MAPPING = { deliveredLikes: 'LikesGivenByAPI', likesBefore: 'LikesbeforeCommand', likesAfter: 'LikesafterCommand', playerName: 'PlayerNickname', playerUid: 'UID' }

export type DeliveryErrorCode = 'INVALID_UID' | 'INVALID_REGION' | 'INVALID_COUPON' | 'EXPIRED_COUPON' | 'EXHAUSTED_COUPON' | 'DAILY_LIMIT_REACHED' | 'NO_AVAILABLE_PROVIDER' | 'PROVIDER_TIMEOUT' | 'PROVIDER_ERROR' | 'UNCERTAIN_DELIVERY'
export class DeliveryError extends Error { constructor(public code: DeliveryErrorCode, message: string, public status = 400) { super(message) } }

function istDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return new Date(`${value.year}-${value.month}-${value.day}T00:00:00+05:30`)
}
function mapped(body: Record<string, unknown>, mapping: Record<string, string>, key: keyof typeof DEFAULT_MAPPING) { return body[mapping[key] || DEFAULT_MAPPING[key]] }
function positiveInteger(value: unknown) { const n = typeof value === 'number' ? value : Number(value); return Number.isInteger(n) && n > 0 ? n : 0 }

export async function deliverLikes(input: { uid: string; couponCode: string; regionCode: string; requestId: string }) {
  if (!UID_PATTERN.test(input.uid)) throw new DeliveryError('INVALID_UID', 'UID must contain 6–12 digits.')
  const regionCode = input.regionCode.trim().toUpperCase()
  let reservation: { id: string; provider: typeof apiProvider.$inferSelect } | undefined
  let couponId = ''
  let reservedLikes = 0
  const today = istDate()
  const existing = await db.select({ id: likeTransaction.id, status: likeTransaction.status, deliveredLikes: likeTransaction.deliveredLikes }).from(likeTransaction).where(eq(likeTransaction.requestId, input.requestId)).limit(1)
  if (existing[0]) return { delivered: existing[0].deliveredLikes, providerId: null, status: existing[0].status === 'success' ? 'success' as const : 'pending' as const }
  const started = Date.now()
  const prepared = await db.transaction(async (tx) => {
    const selectedRegion = (await tx.select().from(region).where(and(eq(region.code, regionCode), eq(region.enabled, true))).limit(1))[0]
    if (!selectedRegion) throw new DeliveryError('INVALID_REGION', 'Selected region is unavailable.')
    const selectedCoupon = (await tx.select().from(coupon).where(and(eq(coupon.code, input.couponCode.trim().toUpperCase()), eq(coupon.enabled, true))).limit(1).for('update'))[0]
    if (!selectedCoupon) throw new DeliveryError('INVALID_COUPON', 'Coupon is invalid or disabled.')
    if (selectedCoupon.expiresAt && selectedCoupon.expiresAt < new Date()) throw new DeliveryError('EXPIRED_COUPON', 'Coupon has expired.')
    if (selectedCoupon.allowedUid && selectedCoupon.allowedUid !== input.uid) throw new DeliveryError('INVALID_COUPON', 'Coupon is not valid for this UID.', 403)
    if (selectedCoupon.allowedRegions?.length && !selectedCoupon.allowedRegions.map((code) => code.toUpperCase()).includes(regionCode)) throw new DeliveryError('INVALID_COUPON', 'Coupon is not valid for this region.', 403)
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`uid:${input.uid}:${today.toISOString()}`}))`)
    const usage = (await tx.select().from(dailyUidUsage).where(and(eq(dailyUidUsage.uid, input.uid), eq(dailyUidUsage.usageDate, today))).limit(1).for('update'))[0]
    const limit = selectedCoupon.dailyLimit
    const used = usage?.deliveredLikes ?? 0
    const reserved = usage?.reservedLikes ?? 0
    const allowed = Math.min(selectedCoupon.balance, limit, Math.max(0, limit - used - reserved))
    if (allowed <= 0) throw new DeliveryError(used + reserved >= limit ? 'DAILY_LIMIT_REACHED' : 'EXHAUSTED_COUPON', used + reserved >= limit ? 'Daily UID limit reached.' : 'Coupon has no remaining likes.')
    const changed = await tx.update(coupon).set({ balance: sql`${coupon.balance} - ${allowed}` }).where(and(eq(coupon.id, selectedCoupon.id), gte(coupon.balance, allowed))).returning({ id: coupon.id })
    if (!changed.length) throw new DeliveryError('EXHAUSTED_COUPON', 'Coupon balance changed. Please retry.', 409)
    if (usage) await tx.update(dailyUidUsage).set({ reservedLikes: sql`${dailyUidUsage.reservedLikes} + ${allowed}`, updatedAt: new Date() }).where(eq(dailyUidUsage.id, usage.id))
    else await tx.insert(dailyUidUsage).values({ id: crypto.randomUUID(), uid: input.uid, usageDate: today, deliveredLikes: 0, reservedLikes: allowed })
    const providerReservation = await reserveProviderSlotInTransaction(tx, selectedRegion.id, input.requestId)
    if (!providerReservation) throw new DeliveryError('NO_AVAILABLE_PROVIDER', 'No available provider supports this region.', 503)
    couponId = selectedCoupon.id; reservedLikes = allowed
    await tx.insert(likeTransaction).values({ id: crypto.randomUUID(), uid: input.uid, couponId, apiProviderId: providerReservation.provider.id, regionCode, status: 'sending', deliveredLikes: 0, requestId: input.requestId, reservedLikes: allowed, usageDate: today })
    return { providerReservation, regionId: selectedRegion.id, allowed }
  })
  const providerReservation = prepared.providerReservation
  reservation = { id: providerReservation.reservation.id, provider: providerReservation.provider }
  const provider = providerReservation.provider
  async function markUncertain() {
    await db.update(likeTransaction).set({ status: 'pending_reconciliation' }).where(eq(likeTransaction.requestId, input.requestId))
    // Keep capacity reserved: no blind refund, no automatic re-send.
  }
  async function settle(delivered: number, body: Record<string, unknown> | null) {
    return db.transaction(async tx => {
      const [record] = await tx.select().from(likeTransaction).where(eq(likeTransaction.requestId, input.requestId)).for('update')
      if (!record) throw new Error('Missing delivery record')
      if (record.status === 'completed' || record.status === 'failed') return
      const saved = body ?? record.confirmedResponse
      if (delivered > 0 && !saved) throw new Error('Confirmed response missing; do not retry provider')
      await settleProviderSlotInTransaction(tx, reservation!.id, delivered)
      await tx.update(coupon).set({ balance: sql`${coupon.balance} + ${reservedLikes - delivered}` }).where(eq(coupon.id, couponId))
      await tx.update(dailyUidUsage).set({ reservedLikes: sql`${dailyUidUsage.reservedLikes} - ${reservedLikes}`, deliveredLikes: sql`${dailyUidUsage.deliveredLikes} + ${delivered}`, updatedAt: new Date() }).where(and(eq(dailyUidUsage.uid, input.uid), eq(dailyUidUsage.usageDate, today)))
      await tx.update(likeTransaction).set({ status: delivered > 0 ? 'completed' : 'failed', deliveredLikes: delivered, confirmedResponse: saved, likesBefore: saved ? positiveInteger(mapped(saved, provider.responseMapping ?? {}, 'likesBefore')) || null : null, likesAfter: saved ? positiveInteger(mapped(saved, provider.responseMapping ?? {}, 'likesAfter')) || null : null, responseTimeMs: Date.now() - started }).where(eq(likeTransaction.id, record.id))
    })
  }
  try {
    const url = await assertSafeProviderUrl(new URL(provider.endpoint, provider.baseUrl).toString())
    url.searchParams.set(provider.uidParam, input.uid)
    url.searchParams.set(provider.regionParam, regionCode.toLowerCase())
    for (const [key, value] of Object.entries(provider.customQuery ?? {})) url.searchParams.set(key, value)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), provider.timeoutMs)
    let response: Response
    try {
      response = await fetch(url, { method: provider.method, headers: new Headers(provider.customHeaders ?? {}), signal: controller.signal, redirect: 'error' })
    } catch (error) {
      await markUncertain()
      throw new DeliveryError(error instanceof Error && error.name === 'AbortError' ? 'PROVIDER_TIMEOUT' : 'UNCERTAIN_DELIVERY', 'Provider result is uncertain; manual reconciliation required.', 502)
    } finally { clearTimeout(timeout) }
    const body = await response.json().catch(() => null) as Record<string, unknown> | null
    if (!body || Array.isArray(body) || typeof body !== 'object') {
      await markUncertain()
      throw new DeliveryError('UNCERTAIN_DELIVERY', 'Provider returned unreadable JSON; manual reconciliation required.', 502)
    }
    const uid = mapped(body, provider.responseMapping ?? {}, 'playerUid')
    if (uid != null && String(uid) !== input.uid) {
      await markUncertain()
      throw new DeliveryError('UNCERTAIN_DELIVERY', 'Provider returned a different UID; manual reconciliation required.', 502)
    }
    const raw = mapped(body, provider.responseMapping ?? {}, 'deliveredLikes')
    const parsed = Number(raw)
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > reservedLikes) {
      await markUncertain()
      throw new DeliveryError('UNCERTAIN_DELIVERY', 'Provider delivery count cannot be trusted.', 502)
    }
    const before = positiveInteger(mapped(body, provider.responseMapping ?? {}, 'likesBefore'))
    const after = positiveInteger(mapped(body, provider.responseMapping ?? {}, 'likesAfter'))
    if (before && after && after < before) {
      await markUncertain()
      throw new DeliveryError('UNCERTAIN_DELIVERY', 'Provider returned inconsistent totals.', 502)
    }
    if (!response.ok) {
      await markUncertain()
      throw new DeliveryError('UNCERTAIN_DELIVERY', 'Provider returned an HTTP error; delivery may have occurred.', 502)
    }
    // Persist confirmed result before attempting settlement. Never re-send after this point.
    await db.update(likeTransaction).set({ status: 'confirmed_pending_settlement', confirmedResponse: body, deliveredLikes: parsed }).where(eq(likeTransaction.requestId, input.requestId))
    await settle(parsed, body)
    return { delivered: parsed, providerId: provider.id, status: 'success' as const }
  } catch (error) {
    // The reservation remains held unless zero/positive delivery was durably confirmed.
    // If persistence fails, do not retry the external request.
    await db.update(likeTransaction).set({ status: 'pending_reconciliation' }).where(and(eq(likeTransaction.requestId, input.requestId), eq(likeTransaction.status, 'sending'))).catch(() => {})
    throw error
  }
}
