import { parseStatusToAvailable } from './parseStatusToAvailable'

type ExtraValue = unknown

function formatValue(key: string, value: ExtraValue): string {
  const str = value == null ? '' : String(value)

  // Исключаем из перевода значения GRP/OTS/ESPAR.
  if (key === 'GRP' || key === 'OTS' || key === 'ESPAR') return str

  if (key === 'Status') {
    const b = parseStatusToAvailable(value)
    if (b === null) return str
    return b ? 'Доступен' : 'Недоступен'
  }

  if (key === 'Light') {
    // В вашем CSV обычно: "Да"/"Нет", но на всякий случай переводим True/False.
    const lower = str.trim().toLowerCase()
    if (lower === 'да' || lower === 'true') return 'Да'
    if (lower === 'нет' || lower === 'false') return 'Нет'
  }

  return str
}

function formatLabel(key: string): string {
  switch (key) {
    case 'city':
      return 'Город'
    case 'Side':
      return 'Сторона'
    case 'Photo':
      return 'Фото'
    case 'Light':
      return 'Подсветка'
    case 'Status':
      return 'Статус'
    case 'Material':
      return 'Материал'
    case 'specPrice':
      return 'Спец. цена'
    case 'printPrice':
      return 'Цена печати'
    case 'installPrice':
      return 'Монтаж'
    case 'AdditionalInstallPrice':
      return 'Доп. монтаж'
    case 'Tax':
      return 'Налог'
    case 'GRP':
      return 'GRP'
    case 'OTS':
      return 'OTS'
    case 'ESPAR':
      return 'ESPAR'
    default:
      // Если ключ неизвестный — оставляем как есть.
      return key
  }
}

export function formatExtraField(key: string, value: ExtraValue): { label: string; value: string } {
  return { label: formatLabel(key), value: formatValue(key, value) }
}

