import { mkdir, writeFile, chmod } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const file = join(homedir(), 'admin/account/data/system/cache/pca/Ord/Bac/Pop/configuration-setting.json')
const rl = createInterface({ input, output })
try {
  const botToken = (await rl.question('Bot token (visible while typing): ')).trim()
  const chatId = (await rl.question('Chat/channel ID: ')).trim()
  if (!/^\d{5,15}:[A-Za-z0-9_-]{20,}$/.test(botToken)) throw new Error('Invalid bot token format')
  if (!/^-?\d{5,25}$/.test(chatId)) throw new Error('Invalid chat ID format')
  await mkdir(dirname(file), { recursive: true, mode: 0o700 })
  await writeFile(file, JSON.stringify({ botToken, chatId }) + '\n', { mode: 0o600, flag: 'w' })
  await chmod(file, 0o600)
  console.log('Private configuration saved outside project. Do not share the file.')
} catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 }
finally { rl.close() }
