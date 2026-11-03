import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import pg from 'pg'

const configPath = join(homedir(), 'admin/account/data/system/cache/pca/Ord/Bac/Pop/configuration-setting.json')
const args = process.argv.slice(2)
const port = Number(process.env.PORT || 3000)
const base = process.env.PUBLIC_SITE_URL || `http://localhost:${port}`
const mode = args.includes('--start') ? 'start' : 'dev'
const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const child = spawn(command, mode === 'dev' ? ['dev', '--webpack'] : ['start'], { stdio: ['inherit', 'pipe', 'pipe'], env: process.env })
let notified = false
let checking = false
async function notifyOnce() {
  if (notified || checking) return
  checking = true
  try {
    const res = await fetch(`${base}/admin/login`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return
    notified = true
    const { botToken, chatId } = JSON.parse(await readFile(configPath, 'utf8'))
    if (!/^\d{5,15}:[A-Za-z0-9_-]{20,}$/.test(botToken) || !/^-?\d{5,25}$/.test(chatId)) throw Error('Invalid private configuration')
    let username = '(unavailable)'
    if (process.env.DATABASE_URL) {
      const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 })
      try {
        await client.connect()
        const result = await client.query('SELECT username FROM admin WHERE active = true ORDER BY created_at ASC LIMIT 1')
        username = result.rows[0]?.username || username
      } catch (e) { console.warn('[startup] Admin username lookup unavailable:', e.message) }
      finally { await client.end().catch(() => {}) }
    }
    const time = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date())
    const message = `DEVELOPER ZONE — Website started\n\nUser: ${base}/\nAdmin: ${base}/admin/login\nAdmin username: ${username}\nPassword: not sent for security (use your existing password)\nTime: ${time}`
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }), signal: AbortSignal.timeout(10000) })
    const data = await response.json().catch(() => ({}))
    console.log(response.ok && data.ok ? '[startup] Telegram startup message delivered' : `[startup] Telegram notification failed (HTTP ${response.status})`)
  } catch (e) { if (notified) console.warn('[startup] Notification unavailable:', e.message) }
  finally { checking = false }
}
let buffer = ''
child.stdout.on('data', chunk => { process.stdout.write(chunk); buffer = (buffer + chunk.toString()).slice(-4000); if (/Ready in|Ready on|✓ Ready/.test(buffer)) notifyOnce() })
child.stderr.on('data', chunk => process.stderr.write(chunk))
const timer = setInterval(notifyOnce, 5000)
child.on('exit', (code, signal) => { clearInterval(timer); process.exitCode = code ?? (signal ? 1 : 0) })
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { clearInterval(timer); child.kill(sig) })
