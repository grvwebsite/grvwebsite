"use client"
import { useState } from 'react'
export default function OwnerExportForm() {
 const [password, setPassword] = useState('')
 const [status, setStatus] = useState('')
 const [loading, setLoading] = useState(false)
 async function exportBackup(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault(); setLoading(true); setStatus('')
  try {
   const res = await fetch('/api/admin/owner-export', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ currentPassword: password }) })
   if (!res.ok) { const data = await res.json().catch(() => ({})); throw Error(data.error || `Export failed (${res.status})`) }
   const blob = await res.blob(); const url = URL.createObjectURL(blob)
   const link = document.createElement('a'); link.href = url; link.download = 'developer-zone-owner-api-backup.json'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
   setStatus('Backup downloaded. Keep it private: it contains full API keys and tokens.')
  } catch (err) { setStatus(err instanceof Error ? err.message : 'Export failed') }
  finally { setLoading(false); setPassword('') }
 }
 return <main className="min-h-screen bg-slate-950 px-4 py-12 text-white"><section className="mx-auto max-w-xl rounded-3xl border border-emerald-500/30 bg-slate-900 p-8 shadow-2xl"><a href="/admin/dashboard" className="text-emerald-400">← Dashboard</a><h1 className="mt-6 text-3xl font-bold">Owner API Backup</h1><p className="mt-3 text-slate-300">Download a complete provider backup, including API keys and tokens, only after verifying your current admin password. The backup is never sent to Telegram.</p><form onSubmit={exportBackup} className="mt-8 grid gap-4"><label className="grid gap-2">Current admin password<input className="rounded-xl bg-slate-800 p-3" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label><button disabled={loading} className="rounded-xl bg-emerald-500 p-3 font-bold text-slate-950 disabled:opacity-50">{loading ? 'Exporting...' : 'Download private API backup'}</button></form><p className="mt-4 text-sm text-slate-300" role="status">{status}</p></section></main>
}
