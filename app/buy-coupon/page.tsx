'use client'
import { useEffect, useState } from 'react'

type Package = { id: string; likes: number; pricePaise: number }
export default function BuyCouponPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [packageId, setPackageId] = useState('')
  const [contact, setContact] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => { fetch('/api/packages').then(r => r.json()).then(data => { setPackages(data.packages ?? []); setPackageId(data.packages?.[0]?.id ?? '') }).catch(() => setError('Unable to load packages')) }, [])
  async function checkout() {
    setLoading(true); setError('')
    const response = await fetch('/api/payments/create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ packageId, contact }) })
    const data = await response.json(); setLoading(false)
    if (!response.ok) return setError(data.error ?? 'Checkout unavailable')
    if (data.orderId) window.location.href = `/payment/${data.orderId}`
  }
  return <main className="min-h-screen bg-[#050b18] px-6 py-16 text-white"><div className="mx-auto max-w-3xl"><p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Developer Zone</p><h1 className="mt-3 text-4xl font-black">Buy a likes coupon</h1><p className="mt-3 text-slate-400">Secure checkout. Coupons are issued only after verified payment.</p><div className="mt-10 grid gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6"><label className="grid gap-2 text-sm text-slate-300">Likes package<select className="rounded-xl border border-white/10 bg-slate-950 p-3 text-white" value={packageId} onChange={e => setPackageId(e.target.value)}>{packages.map(item => <option key={item.id} value={item.id}>{item.likes.toLocaleString()} likes — ₹{(item.pricePaise / 100).toFixed(0)}</option>)}</select></label><label className="grid gap-2 text-sm text-slate-300">WhatsApp number<input className="rounded-xl border border-white/10 bg-slate-950 p-3 text-white" value={contact} onChange={e => setContact(e.target.value)} placeholder="+91..." /></label>{error && <p className="text-sm text-rose-300">{error}</p>}<button onClick={checkout} disabled={loading || !packageId || !contact} className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 disabled:opacity-50">{loading ? 'Opening secure checkout…' : 'Pay now'}</button></div></div></main>
}
