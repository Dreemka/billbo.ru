const SCRIPT_ID = 'yandex-maps-script'

let loadPromise: Promise<void> | null = null

/**
 * Один раз подключает JS API 2.1 Яндекс.Карт (тот же тег, что и у карты на маркетплейсе).
 */
export function ensureYandexMapsScript(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Недоступно вне браузера'))
  }
  if (window.ymaps) {
    return Promise.resolve()
  }

  if (!loadPromise) {
    loadPromise = new Promise<void>((resolve, reject) => {
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
      if (!script) {
        script = document.createElement('script')
        script.id = SCRIPT_ID
        script.async = true
        script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`
        document.head.appendChild(script)
      }

      const onLoad = () => {
        if (window.ymaps) {
          resolve()
        } else {
          loadPromise = null
          reject(new Error('Yandex Maps API не инициализировался'))
        }
      }

      const onError = () => {
        loadPromise = null
        reject(new Error('Не удалось загрузить скрипт Яндекс.Карт'))
      }

      if (window.ymaps) {
        onLoad()
        return
      }

      script.addEventListener('load', onLoad, { once: true })
      script.addEventListener('error', onError, { once: true })
    })
  }

  return loadPromise
}

export function getYandexMapsApiKey(): string | undefined {
  return import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined
}
