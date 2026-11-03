export function nextFourAmIst(from = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(from)
  const date = `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}-${parts.find((p) => p.type === 'day')?.value}`
  const candidate = new Date(`${date}T04:00:00+05:30`)
  return candidate > from ? candidate : new Date(candidate.getTime() + 86_400_000)
}
