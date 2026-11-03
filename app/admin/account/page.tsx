'use client'

import { useState } from 'react'

export default function AdminAccountPage() {
  const [form, setForm] = useState({ currentPassword: '', newUsername: '', newPassword: '' })
  const [message, setMessage] = useState('')
  async function submit(event: React.FormEvent) { event.preventDefault(); setMessage('') ; const response = await fetch('/api/admin/account', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) }); const data = await response.json(); setMessage(data.ok ? 'Credentials updated. Please sign in again.' : data.error ?? 'Update failed') }
  return <main className="min-h-screen bg-[#06101f] p-6 text-white"><div className="mx-auto max-w-xl rounded-2xl border border-cyan-400/20 bg-white/5 p-6"><p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Security</p><h1 className="mt-2 text-3xl font-bold">Admin account</h1><form onSubmit={submit} className="mt-8 flex flex-col gap-4"><input className="rounded-lg bg-black/30 p-3" type="password" placeholder="Current password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required /><input className="rounded-lg bg-black/30 p-3" placeholder="New username (optional)" value={form.newUsername} onChange={(e) => setForm({ ...form, newUsername: e.target.value })} /><input className="rounded-lg bg-black/30 p-3" type="password" placeholder="New password (12+ characters)" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} /><button className="rounded-lg bg-lime-300 px-4 py-3 font-bold text-black">UPDATE LOGIN CREDENTIALS</button>{message && <p className="text-sm text-cyan-200">{message}</p>}</form></div></main>
}
