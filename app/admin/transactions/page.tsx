import { db } from '@/lib/db'
import { desc } from 'drizzle-orm'
import { likeTransaction } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/admin-auth'
export default async function TransactionsPage() { await requireAdmin(); const rows = await db.select().from(likeTransaction).orderBy(desc(likeTransaction.createdAt)).limit(200); return <main className="admin-page"><h1>Transactions</h1><div className="admin-card"><table><thead><tr><th>UID</th><th>Region</th><th>Delivered</th><th>Status</th><th>Date</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.uid}</td><td>{row.regionCode}</td><td>{row.deliveredLikes}</td><td>{row.status}</td><td>{row.createdAt.toISOString()}</td></tr>)}</tbody></table></div></main> }
