import type { Billboard } from '../../entities/types'

/** Собирает все текстовые данные конструкции для поиска (нижний регистр). */
function collectBillboardSearchHaystack(item: Billboard): string {
  const parts: string[] = [
    item.id,
    item.title,
    item.type,
    item.address,
    String(item.lat),
    String(item.lng),
    String(item.pricePerWeek),
    item.size,
    String(item.available),
    item.companyId ?? '',
    item.companyName ?? '',
  ]
  if (item.extraFields) {
    for (const [k, v] of Object.entries(item.extraFields)) {
      parts.push(k)
      if (v != null && typeof v === 'object') {
        try {
          parts.push(JSON.stringify(v))
        } catch {
          parts.push(String(v))
        }
      } else {
        parts.push(String(v))
      }
    }
  }
  return parts.join(' ').toLowerCase()
}

/**
 * Фильтрует конструкции по строке поиска: учитываются все основные поля и extraFields.
 * Несколько слов через пробел — все должны встречаться (AND).
 */
export function filterBillboardsBySearchQuery(items: Billboard[], query: string): Billboard[] {
  const raw = query.trim().toLowerCase()
  if (!raw) return items
  const tokens = raw.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return items

  return items.filter((item) => {
    const haystack = collectBillboardSearchHaystack(item)
    return tokens.every((t) => haystack.includes(t))
  })
}
