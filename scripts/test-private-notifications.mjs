import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

const file = join(homedir(), 'admin/account/data/system/cache/pca/Ord/Bac/Pop/configuration-setting.json')
const live = process.argv.includes('--send')
try {
  const { botToken, chatId } = JSON.parse(await readFile(file, 'utf8'))
  if (typeof botToken !== 'string' || !/^\d{5,15}:[A-Za-z0-9_-]{20,}$/.test(botToken)) throw Error('Invalid bot token format')
  if (typeof chatId !== 'string' || !/^-?\d{5,25}$/.test(chatId)) throw Error('Invalid numeric chat ID format')
  console.log('PASS: private configuration found and valid (credentials not printed)')
  if (!live) { console.log('To send a REAL test message: node scripts/test-private-notifications.mjs --send'); process.exit(0) }
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: 'DEVELOPER ZONE — Private notification test successful.' }),
    signal: AbortSignal.timeout(10000),
  })
  const data = await response.json().catch(() => ({}))
  if (response.ok && data.ok === true) console.log('PASS: Telegram confirmed message delivery to target chat')
  else { console.error('FAIL: Telegram did not accept the message. HTTP:', response.status, 'Code:', data.error_code ?? 'unknown'); process.exitCode = 1 }
} catch (error) {
  console.error('FAIL:', error?.code === 'ENOENT' ? 'Private configuration file not found' : error?.name === 'TimeoutError' ? 'Telegram request timed out' : error?.message === 'fetch failed' ? 'Network request failed' : 'Invalid configuration or request failure')
  process.exitCode = 1
}
