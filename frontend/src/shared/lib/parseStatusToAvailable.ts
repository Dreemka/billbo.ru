/**
 * Преобразует значение из CSV/extraFields `Status` в булево "доступен".
 * Поддерживает типичные варианты: True/False, да/нет, доступен/недоступен, резерв/активно и т.д.
 */
export function parseStatusToAvailable(value: unknown): boolean | null {
  if (value === null || value === undefined) return null

  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
    return null
  }

  const str = String(value).trim().toLowerCase()
  if (!str) return null

  // True-like
  if (
    ['true', '1', 'yes', 'y', 'да', 'доступен', 'доступна', 'доступно', 'active', 'available', 'доступ'].some(
      (x) => str === x || str.includes(x),
    )
  ) {
    return true
  }

  // False-like
  if (
    ['false', '0', 'no', 'n', 'нет', 'недоступен', 'недоступна', 'недоступно', 'inactive', 'unavailable', 'резерв', 'hold'].some(
      (x) => str === x || str.includes(x),
    )
  ) {
    return false
  }

  // Если не распознали явно — нейтрально.
  return null
}

