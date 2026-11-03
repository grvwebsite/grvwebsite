'use client'

import { useEffect, useState } from 'react'

interface Provider { id: string; name: string; priority: number; enabled: boolean; dailyCapacity: number | null; timeoutMs: number }

export default function ApiRotationManager() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const response = await fetch('/api/admin/providers', { cache: 'no-store' })
    if (response.ok) { const payload = await response.json(); setProviders(Array.isArray(payload) ? payload : payload.providers ?? []) }
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  return (
    <main className="min-h-screen bg-[#06101f] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">Developer Zone</p><h1 className="mt-2 text-3xl font-black tracking-tight">API Rotation</h1><p className="mt-2 text-sm text-slate-400">Eligible providers are ordered by priority. Confirmed deliveries are the only successful claims.</p></div>
          <button type="button" onClick={() => void load()} className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/20">Refresh</button>
        </div>
        <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/[.05] p-5"><p className="text-xs uppercase tracking-widest text-slate-400">Claims per provider</p><p className="mt-2 text-3xl font-black text-lime-300">25</p></div><div className="rounded-2xl border border-white/10 bg-white/[.05] p-5"><p className="text-xs uppercase tracking-widest text-slate-400">Reset schedule</p><p className="mt-2 text-xl font-bold">03:55 IST</p></div><div className="rounded-2xl border border-white/10 bg-white/[.05] p-5"><p className="text-xs uppercase tracking-widest text-slate-400">Configured APIs</p><p className="mt-2 text-3xl font-black text-cyan-300">{providers.length}</p></div></section>
        <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[.04]"><div className="border-b border-white/10 px-5 py-4"><h2 className="font-bold">Provider queue</h2></div>{loading ? <p className="p-6 text-slate-400">Loading providers…</p> : providers.length === 0 ? <p className="p-6 text-slate-400">No providers configured.</p> : <div className="divide-y divide-white/10">{providers.map((provider, index) => <div key={provider.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div className="flex items-center gap-4"><span className="grid size-9 place-items-center rounded-full bg-cyan-400/10 font-bold text-cyan-200">{index + 1}</span><div><p className="font-semibold">{provider.name}</p><p className="text-xs text-slate-400">Priority {provider.priority} · Timeout {provider.timeoutMs}ms · Capacity {provider.dailyCapacity ?? 'unlimited'}</p></div></div><span className={provider.enabled ? 'rounded-full bg-lime-400/15 px-3 py-1 text-xs font-semibold text-lime-300' : 'rounded-full bg-slate-400/15 px-3 py-1 text-xs font-semibold text-slate-400'}>{provider.enabled ? 'Eligible' : 'Disabled'}</span></div>)}</div>}</section>
      </div>
    </main>
  )
}
