import type { Billboard } from '../../entities/types'
import { parseStatusToAvailable } from './parseStatusToAvailable'

/**
 * Доступность для отображения и кнопки «Забронировать».
 * Поле `available` с бэка (isActive) учитывается даже если в extraFields.Status указано «доступен».
 */
export function effectiveBillboardAvailable(item: Billboard): boolean {
  const statusParsed = parseStatusToAvailable(item.extraFields?.Status)
  if (statusParsed === false) return false
  return item.available
}
