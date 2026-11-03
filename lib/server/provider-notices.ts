import 'server-only'
import { sendTelegramMessage, istNow } from '@/lib/server/telegram'

// Never include API credentials or query parameters in notifications.
export async function notifyProviderChange(action: 'added' | 'updated' | 'deleted', name: string, baseUrl?: string, endpoint?: string, regions?: number) {
  try {
    const host = baseUrl ? new URL(baseUrl).host : '(removed)'
    const safeEndpoint = endpoint?.split('?')[0].split('#')[0] || ''
    await sendTelegramMessage(`DEVELOPER ZONE — API ${action.toUpperCase()}\nName: ${name.slice(0, 100)}\nHost: ${host}\nEndpoint: ${safeEndpoint.slice(0, 100)}\nRegions selected: ${regions ?? 'N/A'}\nTime: ${istNow()}\nCredentials: not included`)
  } catch (error) { console.warn('[provider-notice] Notification unavailable') }
}
