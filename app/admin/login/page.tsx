'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError('')
    const body = Object.fromEntries(new FormData(event.currentTarget))
    const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    if (!response.ok) setError('Invalid credentials or temporarily unavailable.')
    else router.push('/admin/dashboard')
    setLoading(false)
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#06101b] px-6 text-white"><form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-cyan-400/20 bg-[#0c1b2b]/90 p-8 shadow-2xl shadow-cyan-950/40"><p className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-cyan-300">Developer Zone</p><h1 className="text-3xl font-black">Admin access</h1><p className="mt-2 text-sm text-slate-400">Secure operations console</p><div className="mt-8 flex flex-col gap-4"><input name="username" required autoComplete="username" placeholder="Username" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyan-300" /><input name="password" required type="password" autoComplete="current-password" placeholder="Password" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyan-300" /></div>{error && <p className="mt-4 text-sm text-rose-300">{error}</p>}<button disabled={loading} className="mt-6 w-full rounded-xl bg-lime-300 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{loading ? 'Signing in…' : 'Sign in'}</button></form></main>
}
