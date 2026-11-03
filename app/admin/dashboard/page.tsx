import Link from 'next/link'
import { redirect } from 'next/navigation'
import { count, eq, sql } from 'drizzle-orm'
import { Activity, ArrowRight, BarChart3, CreditCard, Globe2, KeyRound, LayoutDashboard, ReceiptText, Settings, Shield, ShoppingBag, Ticket, UserRound, Wallet, Zap } from 'lucide-react'
import { getAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { apiProvider, region, coupon, likeTransaction } from '@/lib/db/schema'

const actions = [
  { name: 'API Management', desc: 'Providers, mappings and region assignments', href: '/admin/apis', icon: Zap, tint: 'cyan' },
  { name: 'API Rotation', desc: 'Claim counters, rotation and reset settings', href: '/admin/api-rotation', icon: BarChart3, tint: 'lime' },
  { name: 'Regions', desc: 'Create and manage supported regions', href: '/admin/regions', icon: Globe2, tint: 'blue' },
  { name: 'Coupons', desc: 'Generate and manage customer coupons', href: '/admin/coupons', icon: Ticket, tint: 'lime' },
  { name: 'Like Transactions', desc: 'Inspect delivery records and statuses', href: '/admin/transactions', icon: ReceiptText, tint: 'cyan' },
  { name: 'Payment Settings', desc: 'Configure QR gateway and API credentials', href: '/admin/payment-settings', icon: CreditCard, tint: 'blue' },
  { name: 'Admin Account', desc: 'Update account credentials and security', href: '/admin/account', icon: Shield, tint: 'lime' },
  { name: 'Customer Buy Coupon', desc: 'Open the real customer purchase page', href: '/buy-coupon', icon: ShoppingBag, tint: 'cyan' },
  { name: 'Check Coupon', desc: 'Customer coupon balance lookup', href: '/check-coupon', icon: KeyRound, tint: 'blue' },
  { name: 'Website Home', desc: 'Visit the public Free Fire Likes website', href: '/', icon: LayoutDashboard, tint: 'lime' },
]

export default async function DashboardPage() {
  const current = await getAdmin()
  if (!current) redirect('/admin/login')
  const [apis, activeApis, regions, coupons, likes] = await Promise.all([
    db.select({ value: count() }).from(apiProvider),
    db.select({ value: count() }).from(apiProvider).where(eq(apiProvider.enabled, true)),
    db.select({ value: count() }).from(region),
    db.select({ value: count() }).from(coupon),
    db.select({ value: sql<number>`coalesce(sum(${likeTransaction.deliveredLikes}), 0)` }).from(likeTransaction),
  ])
  const metrics = [
    { label: 'Total APIs', value: apis[0].value, icon: Zap },
    { label: 'Active APIs', value: activeApis[0].value, icon: Activity },
    { label: 'Regions', value: regions[0].value, icon: Globe2 },
    { label: 'Coupons', value: coupons[0].value, icon: Ticket },
    { label: 'Likes Delivered', value: likes[0].value, icon: BarChart3 },
  ]
  return <main className="min-h-screen bg-[#050c16] text-white" style={{backgroundImage:'radial-gradient(ellipse at 12% 0%, rgba(22,163,174,.16),transparent 40%),radial-gradient(ellipse at 90% 0%,rgba(118,202,64,.10),transparent 38%)'}}>
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-8 lg:px-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <Link href="/" className="flex items-center gap-3 no-underline text-white"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-300 text-[#06101b] shadow-[0_0_30px_rgba(163,230,53,.18)]"><Zap size={23} fill="currentColor" /></span><span><strong className="block text-lg tracking-tight">DEVELOPER ZONE</strong><small className="text-[10px] font-bold tracking-[.22em] text-cyan-300">ADMIN CONTROL CENTER</small></span></Link>
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-2 text-xs text-lime-200"><UserRound size={13} className="mr-1 inline" />{current.username}</span><Link href="/" className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/10">View Site</Link><a href="/api/admin/logout" className="rounded-xl border border-rose-300/20 px-4 py-2 text-sm text-rose-200 hover:bg-rose-300/10">Logout</a></div>
      </header>
      <div className="mt-10 flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[.26em] text-cyan-300">Overview / Dashboard</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Welcome back, <span className="text-lime-300">{current.username}</span></h1><p className="mt-3 text-sm text-slate-400">Manage your likes network, coupons and payment settings from one place.</p></div><Link href="/admin/payment-settings" className="inline-flex items-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-sm font-extrabold text-[#07121a] shadow-[0_8px_30px_rgba(163,230,53,.16)] hover:bg-lime-200"><Wallet size={17} />Payment Settings<ArrowRight size={16} /></Link></div>
      <section aria-label="Live database statistics" className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">{metrics.map(({label,value,icon:Icon})=><div key={label} className="rounded-2xl border border-cyan-200/10 bg-[#0d1b28]/85 p-5 shadow-lg shadow-black/10"><Icon className="text-cyan-300" size={19}/><p className="mt-5 text-xs text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-lime-300">{Number(value ?? 0).toLocaleString('en-IN')}</p></div>)}</section>
      <div className="mt-11 flex items-center justify-between gap-4"><div><p className="text-xs font-bold tracking-[.24em] text-cyan-300">QUICK ACCESS</p><h2 className="mt-2 text-2xl font-bold">All management pages</h2></div><Settings className="text-slate-500" size={25}/></div>
      <section aria-label="Admin navigation" className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{actions.map(({name,desc,href,icon:Icon,tint})=><Link key={href} href={href} className="group flex min-h-[135px] items-start gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-5 text-white no-underline transition hover:-translate-y-0.5 hover:border-lime-300/40 hover:bg-white/[.065]"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${tint==='lime'?'bg-lime-300/10 text-lime-300':tint==='cyan'?'bg-cyan-300/10 text-cyan-300':'bg-blue-400/10 text-blue-300'}`}><Icon size={22}/></span><span className="min-w-0 flex-1"><strong className="block text-base font-bold">{name}</strong><small className="mt-2 block text-xs leading-relaxed text-slate-400">{desc}</small></span><ArrowRight className="mt-1 shrink-0 text-slate-500 transition group-hover:translate-x-1 group-hover:text-lime-300" size={17}/></Link>)}</section>
      <div className="mt-9 rounded-2xl border border-amber-300/20 bg-amber-300/[.06] px-5 py-4 text-xs leading-relaxed text-amber-100/85"><strong>Payment notice:</strong> Payment Settings and Buy Coupon links are available. Automatic gateway verification and coupon fulfillment are not verified as production-ready; do not accept live customer payments until the backend and worker are tested.</div>
      <p className="mt-10 text-center text-xs text-slate-600">DEVELOPER ZONE · Built by Anurag Singh</p>
    </div>
  </main>
}
