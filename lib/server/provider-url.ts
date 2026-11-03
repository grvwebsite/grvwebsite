import dns from 'node:dns/promises'

const blockedHostnames = new Set(['localhost', 'metadata.google.internal', 'instance-data.ec2.internal'])

export async function assertSafeProviderUrl(value: string, production = process.env.NODE_ENV === 'production') {
  const url = new URL(value)
  if (production && url.protocol !== 'https:') throw new Error('Provider URLs must use HTTPS in production')
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported provider URL protocol')
  const hostname = url.hostname.toLowerCase()
  if (blockedHostnames.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.internal')) throw new Error('Private provider hosts are not allowed')
  const addresses = await dns.lookup(hostname, { all: true, verbatim: true })
  if (addresses.some(({ address }) => isPrivateAddress(address))) throw new Error('Provider resolves to a private network')
  return url
}

function isPrivateAddress(address: string) {
  return address === '::1' || address === '0.0.0.0' || address.startsWith('127.') || address.startsWith('10.') || address.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(address) || address.startsWith('169.254.') || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:')
}
