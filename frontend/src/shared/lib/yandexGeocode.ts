import { ensureYandexMapsScript } from './yandexMapsLoader'

/**
 * Прямое геокодирование: адрес → координаты (первый результат).
 */
export async function geocodeAddressToLatLng(
  address: string,
  apiKey: string,
): Promise<{ lat: number; lng: number }> {
  const q = address.trim()
  if (!q) {
    throw new Error('Введите адрес')
  }

  await ensureYandexMapsScript(apiKey)
  const ymaps = window.ymaps
  if (!ymaps) {
    throw new Error('API карт недоступен')
  }

  return new Promise((resolve, reject) => {
    ymaps.ready(() => {
      void ymaps
        .geocode(q, { results: 1 })
        .then((result) => {
          try {
            const first = result.geoObjects.get(0)
            if (!first) {
              reject(new Error('Адрес не найден'))
              return
            }
            const coords = first.geometry.getCoordinates() as [number, number]
            resolve({ lat: coords[0], lng: coords[1] })
          } catch (e) {
            reject(e instanceof Error ? e : new Error('Ошибка геокодера'))
          }
        })
        .catch(reject)
    })
  })
}

/**
 * Обратное геокодирование: координаты → строка адреса (первый результат).
 */
export async function reverseGeocodeLatLngToAddress(lat: number, lng: number, apiKey: string): Promise<string> {
  await ensureYandexMapsScript(apiKey)
  const ymaps = window.ymaps
  if (!ymaps) {
    throw new Error('API карт недоступен')
  }

  return new Promise((resolve, reject) => {
    ymaps.ready(() => {
      void ymaps
        .geocode([lat, lng], { results: 1 })
        .then((result) => {
          try {
            const first = result.geoObjects.get(0) as
              | {
                  getAddressLine?: () => string
                  properties?: { get: (key: string) => unknown }
                }
              | undefined
            if (!first) {
              resolve('')
              return
            }
            const line =
              typeof first.getAddressLine === 'function'
                ? first.getAddressLine()
                : String(first.properties?.get?.('text') ?? first.properties?.get?.('name') ?? '')
            resolve(line.trim())
          } catch (e) {
            reject(e instanceof Error ? e : new Error('Ошибка обратного геокодера'))
          }
        })
        .catch(reject)
    })
  })
}
