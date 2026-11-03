import { getTelegramSecrets } from '@/lib/server/secrets'

export async function sendTelegramMessage(text: string) {
  const secrets = await getTelegramSecrets()
  if (!secrets) return { ok: false, reason: 'not-configured' as const }
  try {
    const response = await fetch(`https://api.telegram.org/bot${secrets.token}/sendMessage`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: secrets.chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    })
    return { ok: response.ok }
  } catch { return { ok: false, reason: 'network' as const } }
}

export function istNow() {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date())
}
