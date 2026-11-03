'use client'

import { FormEvent, useEffect, useState } from 'react'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Copy,
  Gift,
  Globe2,
  KeyRound,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  WalletCards,
  X,
  Zap,
} from 'lucide-react'

type Region = { id: string; code: string; name: string; flag: string }

const packages = [
  ['150', '₹25'], ['3,000', '₹200'], ['4,000', '₹265'], ['5,000', '₹325'],
  ['7,000', '₹455'], ['10,000', '₹650'],
]

const activity = [
  ['RΛHUL', '12***890', 'IND', '+100', '2 min ago'],
  ['NEXUS', '98***412', 'BD', '+80', '6 min ago'],
  ['MAYANK', '45***761', 'IND', '+100', '11 min ago'],
]

function Brand() {
  return <div className="brand"><div className="brand-mark"><Zap size={18} fill="currentColor" /></div><div><strong>DEVELOPER ZONE</strong><span>FREE FIRE LIKES</span></div></div>
}

function Header({ onMenu, onAdmin }: { onMenu: () => void; onAdmin: () => void }) {
  return <header className="topbar"><Brand /><div className="header-actions"><button className="header-pill" onClick={() => document.getElementById('activity')?.scrollIntoView({ behavior: 'smooth' })}><BarChart3 size={15} /> Stats</button><button className="header-pill bright" onClick={() => document.getElementById('packages')?.scrollIntoView({ behavior: 'smooth' })}><Ticket size={15} /> Coupon</button><button aria-label="Open menu" className="menu-button" onClick={onMenu}><Menu size={20} /></button></div></header>
}

function Drawer({ open, close, onAdmin }: { open: boolean; close: () => void; onAdmin: () => void }) {
  if (!open) return null
  return <><div className="drawer-backdrop" onClick={close} /><aside className="drawer"><div className="drawer-head"><Brand /><button className="icon-button" onClick={close}><X size={20} /></button></div><p className="drawer-label">MANAGEMENT</p>{[['Home', Sparkles], ['Send Likes', Send], ['AutoLikes', Clock3], ['Buy Coupon', Ticket], ['Check Coupon', KeyRound], ['Live Statistics', BarChart3]].map(([label, Icon]) => <button className="drawer-item" key={label as string} onClick={() => { close(); const labelText = label as string; if (labelText === 'Buy Coupon') { window.location.href = '/buy-coupon'; return }; if (labelText === 'Check Coupon') { window.location.href = '/check-coupon'; return }; if (labelText === 'Home') { window.scrollTo({top:0,behavior:'smooth'}); return }; if (labelText === 'AutoLikes') { document.getElementById('send-likes')?.scrollIntoView({behavior:'smooth'}); return }; document.getElementById(labelText.toLowerCase().replace(' ', '-'))?.scrollIntoView({ behavior: 'smooth' }) }}><Icon size={18} />{label as string}<ArrowRight size={14} /></button>)}<p className="drawer-label">COMMUNITY</p><a className="drawer-item" href="https://t.me/" target="_blank" rel="noreferrer"><Send size={18} />Telegram<ArrowRight size={14} /></a><a className="drawer-item" href="https://wa.me/" target="_blank" rel="noreferrer"><MessageCircle size={18} />WhatsApp<ArrowRight size={14} /></a></aside></>
}

function ServiceForm() {
  const [mode, setMode] = useState<'send' | 'auto'>('send')
  const [autoSuccess, setAutoSuccess] = useState('')
  const [result, setResult] = useState<{ delivered: number; likesBefore?: number; likesAfter?: number; playerName?: string; remaining: number; status: string } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [uid, setUid] = useState('')
  const [coupon, setCoupon] = useState('')
  const [region, setRegion] = useState('')
  const [regions, setRegions] = useState<Region[]>([])
  useEffect(() => { fetch('/api/regions').then((response) => response.ok ? response.json() : []).then(setRegions).catch(() => setRegions([])) }, [])
  const submit = async (event: FormEvent) => { event.preventDefault(); if (uid.length < 6 || !coupon || !region || loading) return; setLoading(true); setError(''); setResult(null); setAutoSuccess(''); try { const response = await fetch(mode === 'auto' ? '/api/autolikes/activate' : '/api/likes/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ uid, coupon, region }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Delivery unavailable.'); if (mode === 'auto') { setAutoSuccess('AutoLikes activated. First delivery is scheduled for 04:00 AM IST.'); } else { setResult(body) } } catch (cause) { setError(cause instanceof Error ? cause.message : 'Delivery unavailable.') } finally { setLoading(false) } }
  return <section className="service-shell" id="send-likes"><div className="mode-switch"><button className={mode === 'send' ? 'active' : ''} onClick={() => { setMode('send'); setResult(null) }}><Send size={16} /> Send Likes</button><button className={mode === 'auto' ? 'active' : ''} onClick={() => { setMode('auto'); setResult(null) }}><Clock3 size={16} /> AutoLikes</button></div><div className="service-card">{autoSuccess && <div role="status" className="rounded-xl border border-lime-400/30 bg-lime-400/10 p-4 text-lime-200">{autoSuccess}</div>}{error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">{error}</div>}{result ? <div className="success-state"><div className="success-icon"><Check size={26} /></div><p className="eyebrow">{result.status === 'success' ? 'DELIVERY CONFIRMED' : 'DELIVERY RESULT'}</p><h2>{result.status === 'success' ? 'Likes sent successfully' : 'No likes delivered'}</h2><p>{result.delivered > 0 ? `+${result.delivered} likes delivered to ${uid} in ${region}.` : 'The provider did not confirm delivery. No balance was deducted.'}</p><div className="result-grid"><div><span>PLAYER</span><strong>{result.playerName || 'Verified profile'}</strong></div><div><span>LIKES DELIVERED</span><strong className="green">+{result.delivered}</strong></div><div><span>LIKES AFTER</span><strong>{result.likesAfter ?? '—'}</strong></div><div><span>COUPON REMAINING</span><strong>{result.remaining} likes</strong></div></div><button className="secondary-button" onClick={() => setResult(null)}>Send again</button></div> : <><div className="card-heading"><div><p className="eyebrow">{mode === 'send' ? 'SEND LIKES' : 'DAILY AUTOMATION'}</p><h2>{mode === 'send' ? 'Send likes' : 'Enable AutoLikes'}</h2><p>{mode === 'send' ? 'Send likes instantly using your coupon.' : 'Wake up to fresh likes every morning at 04:00 IST.'}</p></div><div className="card-icon">{mode === 'send' ? <Send size={20} /> : <Clock3 size={20} />}</div></div><form onSubmit={submit}><label>Your Free Fire UID<input value={uid} onChange={(e) => setUid(e.target.value.replace(/\D/g, '').slice(0, 15))} placeholder="123456789" inputMode="numeric" required /></label><label>Coupon code<input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="LIKES-XXXXXX" required /></label><label>Server region<div className="select-wrap"><select value={region} onChange={(e) => setRegion(e.target.value)} required><option value="">Select your region</option>{regions.map((item) => <option key={item.code} value={item.code}>{item.flag} · {item.name} ({item.code})</option>)}</select><ChevronDown size={16} /></div></label><button className="primary-button" type="submit">{mode === 'send' ? <Send size={17} /> : <Zap size={17} />}{loading ? 'Please wait...' : mode === 'send' ? 'Send likes now' : 'Enable AutoLikes'}<ArrowRight size={16} /></button></form><div className="form-foot"><span><ShieldCheck size={14} /> No password required</span><button onClick={() => { setUid(''); setCoupon(''); setRegion('') }}>Reset form</button></div></>}</div></section>
}

function ActivityPanel() {
  return <section className="activity-section" id="activity"><div className="section-heading"><div><p className="eyebrow">SERVICE OVERVIEW</p><h2>Service information</h2></div></div><p className="text-slate-400">Delivery records and verified statistics are available in the administrator dashboard. Public live statistics will appear after verified data integration.</p></section>
}

function Packages() {
  
  return <section className="packages-section" id="packages"><div className="section-heading"><div><p className="eyebrow">INSTANT DELIVERY</p><h2>Get a likes coupon</h2></div><a className="text-button" href="/buy-coupon">View all <ArrowRight size={15} /></a></div><div className="package-grid">{packages.map(([likes, price], i) => <article className={i === 1 ? 'package-card featured' : 'package-card'} key={likes}><span className="package-tag">{i === 1 ? 'POPULAR' : 'COUPON'}</span><strong>{likes}</strong><span>likes balance</span><div className="package-bottom"><b>{price}</b><button onClick={() => { window.location.href = '/buy-coupon' }}><Ticket size={15} /> {'Buy Now'}</button></div></article>)}</div></section>
}

function Footer() { return <footer><div><Brand /><p>Fast, safe and reliable Free Fire likes delivery.<br />Built by Anurag Singh.</p></div><div className="footer-links"><span>Developer Zone</span><a href="#activity">Live statistics</a><a href="/buy-coupon">Buy coupon</a><a href="#send-likes">Support</a></div><div className="footer-end"><span>© 2026 Developer Zone</span><span>Asia/Kolkata · Secure service</span></div></footer> }

function AdminView({ close }: { close: () => void }) { const nav = [['Overview', LayoutDashboard], ['API management', Zap], ['Coupons', Ticket], ['AutoLikes', Clock3], ['Transactions', Activity], ['Settings', Settings2]] as const; return <div className="admin-view"><aside className="admin-side"><div className="admin-brand"><Brand /></div><div className="admin-nav">{nav.map(([item, Icon], i) => <button className={i === 0 ? 'selected' : ''} key={item}><Icon size={17} />{item}</button>)}</div><button className="secondary-button" onClick={close}>Back to site</button></aside><main className="admin-main"><div className="admin-top"><div><p className="eyebrow">DEVELOPER ZONE / ADMIN</p><h1>Operations overview</h1></div><div className="admin-user"><div className="avatar">AS</div><span>Anurag Singh<small>Owner account</small></span></div></div><div className="admin-metrics">{[['Total coupons', '1,284', '+12.8%', Ticket], ['Likes delivered', '84,620', '+24.1%', Zap], ['Active AutoLikes', '248', '+8.6%', Clock3], ['Revenue', '₹42,850', '+18.2%', WalletCards]].map(([label, value, trend, Icon]) => <div className="metric-card" key={label as string}><div className="metric-icon"><Icon size={18} /></div><span>{label as string}</span><strong>{value as string}</strong><small>{trend as string} this month</small></div>)}</div><div className="admin-grid"><div className="admin-panel chart-panel"><div className="panel-head"><div><p className="eyebrow">DELIVERY VOLUME</p><h2>Likes sent this week</h2></div><span className="panel-filter">Last 7 days <ChevronDown size={14} /></span></div><div className="chart"><div className="chart-bars">{[44, 60, 52, 76, 66, 88, 72].map((height, i) => <div className="bar-col" key={i}><div className="bar" style={{ height: `${height}%` }} /><span>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span></div>)}</div></div></div><div className="admin-panel health-panel"><div className="panel-head"><div><p className="eyebrow">PROVIDER HEALTH</p><h2>API network</h2></div><span className="health-badge"><i /> 3 / 4 online</span></div>{['Anurag API 1', 'ZoneBoost API', 'Rapid Likes', 'Fallback Node'].map((api, i) => <div className="api-row" key={api}><span className="api-status" data-off={i === 3} /><strong>{api}</strong><small>{i === 3 ? 'Offline' : `${99 - i * 3}.8% success`}</small><span className="api-latency">{i === 3 ? '—' : `${120 + i * 24}ms`}</span></div>)}</div></div><div className="admin-panel"><div className="panel-head"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Latest transactions</h2></div><button className="text-button">Open history <ArrowRight size={15} /></button></div><div className="transaction-table"><div className="table-head"><span>PLAYER / UID</span><span>REGION</span><span>DELIVERED</span><span>STATUS</span></div>{activity.map(([name, id, reg, likes]) => <div className="table-row" key={id}><span><strong>{name}</strong><small>{id}</small></span><span>{reg}</span><span className="green">{likes}</span><b className="status-pill">Completed</b></div>)}</div></div></main></div> }

export default function ZoneApp() { const [menu, setMenu] = useState(false); const [admin, setAdmin] = useState(false); if (admin) return <AdminView close={() => setAdmin(false)} />; return <div className="app-shell"><Header onMenu={() => setMenu(true)} onAdmin={() => { window.location.href = "/admin/dashboard" }} /><Drawer open={menu} close={() => setMenu(false)} onAdmin={() => { window.location.href = "/admin/dashboard" }} /><main><section className="hero"><div className="hero-glow" /><div className="online-badge"><i /> Online — service active</div><h1>Free Fire <span>Likes</span><br />Sender</h1><p>Just your UID and a coupon — no password needed.<br />Fast, safe, and instant delivery.</p><ServiceForm /><ActivityPanel /></section><Packages /><section className="why-section"><div><p className="eyebrow">BUILT FOR PLAYERS</p><h2>Simple, secure, <span>always on.</span></h2></div><div className="why-grid">{[['Fast delivery', 'Your likes are processed through the best available provider.', Zap], ['Password-free', 'We only need your public player UID and region.', ShieldCheck], ['Daily AutoLikes', 'Set it once and wake up to a fresh profile.', Clock3], ['Secure coupons', 'Usage is tracked and protected across every request.', Ticket]].map(([title, desc, Icon]) => <div className="why-card" key={title as string}><Icon size={19} /><h3>{title as string}</h3><p>{desc as string}</p></div>)}</div></section></main><Footer /><a className="floating telegram" href="https://t.me/" target="_blank" rel="noreferrer" aria-label="Join Telegram"><Send size={20} /></a><a className="floating whatsapp" href="https://wa.me/" target="_blank" rel="noreferrer" aria-label="Contact on WhatsApp"><MessageCircle size={21} /></a></div> }
