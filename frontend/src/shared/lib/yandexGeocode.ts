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
