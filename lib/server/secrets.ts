import 'server-only'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

// This path is outside the website source tree and is never exposed to clients.
const configFile = join(homedir(), 'admin/account/data/system/cache/pca/Ord/Bac/Pop/configuration-setting.json')

export async function getTelegramSecrets(): Promise<{ token: string; chatId: string } | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(configFile, 'utf8'))
    if (!parsed || typeof parsed !== 'object') return null
    const settings = parsed as Record<string, unknown>
    const token = settings.botToken
    const chatId = settings.chatId
    if (typeof token !== 'string' || !/^\d{5,15}:[A-Za-z0-9_-]{20,}$/.test(token)) return null
    if (typeof chatId !== 'string' || !/^-?\d{5,25}$/.test(chatId)) return null
    return { token, chatId }
  } catch { return null }
}
