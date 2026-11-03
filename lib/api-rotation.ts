import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { apiProvider, apiRegion, apiRotationCounter, apiRotationReservation } from '@/lib/db/schema'

export const DEFAULT_CLAIMS_PER_API = 25
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

// A rotation day starts at 03:55 Asia/Kolkata. Epochs are immutable for in-flight work.
export function rotationEpoch(now = new Date()): number {
  return Math.floor((now.getTime() + 330 * 60_000 - (3 * 60 + 55) * 60_000) / 86_400_000)
}

export async function reserveProviderSlotInTransaction(tx: Transaction, regionId: string, requestId: string) {
  // Serializes all reservations in a region, including competing provider selection.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`rotation:${regionId}`}))`)
  const epoch = rotationEpoch()
  const providers = await tx.select({ provider: apiProvider }).from(apiProvider)
    .innerJoin(apiRegion, eq(apiRegion.apiId, apiProvider.id))
    .where(and(eq(apiProvider.enabled, true), eq(apiRegion.regionId, regionId)))
    .orderBy(asc(apiProvider.priority), asc(apiProvider.createdAt))
  if (!providers.length) return null
  const counters = await tx.select().from(apiRotationCounter).where(and(eq(apiRotationCounter.regionId, regionId), eq(apiRotationCounter.epoch, epoch)))
  const lookup = new Map(counters.map(c => [c.providerId, c]))
  // Choose the earliest rotation cycle with an eligible provider. Every turn is 25 slots.
  // Capacity exhaustion is terminal for this request; avoid repeated empty scans.
  const capacities = await Promise.all(providers.map(async ({provider}) => {
    const rows = await tx.select({used: sql<number>`coalesce(sum(${apiRotationCounter.confirmedClaims} + ${apiRotationCounter.reservedClaims}), 0)`}).from(apiRotationCounter).where(and(eq(apiRotationCounter.providerId, provider.id), eq(apiRotationCounter.epoch, epoch)))
    return provider.dailyCapacity == null || Number(rows[0]?.used ?? 0) < provider.dailyCapacity
  }))
  if (!capacities.some(Boolean)) return null
  for (let cycle = 0; cycle < 100000; cycle++) {
    for (const { provider } of providers) {
      const counter = lookup.get(provider.id)
      const used = counter?.confirmedClaims ?? 0
      const pending = counter?.reservedClaims ?? 0
      const turnUsed = used + pending - cycle * DEFAULT_CLAIMS_PER_API
      if (turnUsed >= DEFAULT_CLAIMS_PER_API || turnUsed < 0) continue
      // Daily capacity is provider-wide across regions, not just this region.
      const totals = await tx.select({ used: sql<number>`coalesce(sum(${apiRotationCounter.confirmedClaims} + ${apiRotationCounter.reservedClaims}), 0)` })
        .from(apiRotationCounter).where(and(eq(apiRotationCounter.providerId, provider.id), eq(apiRotationCounter.epoch, epoch)))
      if (provider.dailyCapacity != null && Number(totals[0]?.used ?? 0) >= provider.dailyCapacity) continue
      // Serialize capacity across all regions for the same provider.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`provider:${provider.id}`}))`)
      const latest = await tx.select({ used: sql<number>`coalesce(sum(${apiRotationCounter.confirmedClaims} + ${apiRotationCounter.reservedClaims}), 0)` })
        .from(apiRotationCounter).where(and(eq(apiRotationCounter.providerId, provider.id), eq(apiRotationCounter.epoch, epoch)))
      if (provider.dailyCapacity != null && Number(latest[0]?.used ?? 0) >= provider.dailyCapacity) continue
      const [updated] = await tx.insert(apiRotationCounter).values({ providerId: provider.id, regionId, epoch, confirmedClaims: 0, reservedClaims: 1, cycle })
        .onConflictDoUpdate({ target: [apiRotationCounter.providerId, apiRotationCounter.regionId, apiRotationCounter.epoch], set: { reservedClaims: sql`${apiRotationCounter.reservedClaims} + 1`, cycle, updatedAt: new Date() } })
        .returning({ id: apiRotationCounter.id })
      const [reservation] = await tx.insert(apiRotationReservation).values({ providerId: provider.id, regionId, epoch, cycle, requestId, status: 'reserved' }).returning()
      return { reservation, provider, counterId: updated.id }
    }
    // A cycle cannot progress if some provider still has a pending turn and none is eligible.
    if (providers.every(({provider}) => {
      const c = lookup.get(provider.id)
      return (c?.confirmedClaims ?? 0) + (c?.reservedClaims ?? 0) <= cycle * DEFAULT_CLAIMS_PER_API
    })) break
  }
  return null
}

export async function reserveProviderSlot(regionId: string, requestId: string) {
  return db.transaction(tx => reserveProviderSlotInTransaction(tx, regionId, requestId))
}

// No destructive reset: a new epoch automatically begins at 03:55 IST.
export async function resetDailyRotation() { return { epoch: rotationEpoch(), resetIsEpochBased: true } }

export async function settleProviderSlotInTransaction(tx: Transaction, reservationId: string, delivered: number, uncertain = false) {
  const [r] = await tx.select().from(apiRotationReservation).where(eq(apiRotationReservation.id, reservationId)).for('update')
  if (!r || r.status !== 'reserved') return false
  if (uncertain) {
    await tx.update(apiRotationReservation).set({ status: 'pending' }).where(eq(apiRotationReservation.id, reservationId))
    return true
  }
  await tx.update(apiRotationReservation).set({ status: delivered > 0 ? 'confirmed' : 'released', settledAt: new Date() }).where(eq(apiRotationReservation.id, reservationId))
  await tx.update(apiRotationCounter).set({
    reservedClaims: sql`${apiRotationCounter.reservedClaims} - 1`,
    confirmedClaims: delivered > 0 ? sql`${apiRotationCounter.confirmedClaims} + 1` : apiRotationCounter.confirmedClaims,
    lifetimeClaims: delivered > 0 ? sql`${apiRotationCounter.lifetimeClaims} + 1` : apiRotationCounter.lifetimeClaims,
    updatedAt: new Date(),
  }).where(and(eq(apiRotationCounter.providerId, r.providerId), eq(apiRotationCounter.regionId, r.regionId), eq(apiRotationCounter.epoch, r.epoch)))
  return true
}
export async function settleProviderSlot(reservationId: string, delivered: number, uncertain = false) {
  return db.transaction(tx => settleProviderSlotInTransaction(tx, reservationId, delivered, uncertain))
}
