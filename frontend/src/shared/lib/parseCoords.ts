/**
 * Разбор строки вида «55.683194, 37.561895» (запятая, точка с запятой или пробел между числами).
 */
export function tryParseLatLngFromText(text: string): { lat: number; lng: number } | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  let m = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)\s*$/)
  if (!m) {
    m = trimmed.match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*$/)
  }
  if (!m) return null

  const lat = Number(m[1])
  const lng = Number(m[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}
