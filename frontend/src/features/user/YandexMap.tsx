import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Input, Space } from 'antd'
import type { Billboard } from '../../entities/types'
import { ensureYandexMapsScript, getYandexMapsApiKey } from '../../shared/lib/yandexMapsLoader'

interface YandexMapProps {
  items: Billboard[]
  /** При смене — карта центрируется на точке, открывается балун, метка выделяется. */
  focusBillboardId?: string | null
}

/** Минимальный тип метки для preset / балуна (API 2.1). */
type YandexPlacemarkHandle = {
  options: { set: (key: string, value: string) => void }
  balloon: { open: () => void }
}

function getMarkerPreset(available: boolean, focused: boolean) {
  if (focused) return 'islands#violetDotIcon'
  return available ? 'islands#greenDotIcon' : 'islands#redDotIcon'
}

export function YandexMap({ items, focusBillboardId = null }: YandexMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<YandexMapInstance | null>(null)
  const geoObjectsRef = useRef<YandexGeoObjectCollection | null>(null)
  const placemarksByIdRef = useRef<Map<string, YandexPlacemarkHandle>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const apiKey = useMemo(() => getYandexMapsApiKey(), [])

  useEffect(() => {
    if (!hostRef.current) return
    if (!apiKey) {
      setError('Не задан `VITE_YANDEX_MAPS_API_KEY`. Карта недоступна.')
      return
    }

    void ensureYandexMapsScript(apiKey)
      .then(() => {
        const ymaps = window.ymaps
        if (!ymaps) return

        ymaps.ready(() => {
          if (!hostRef.current) return
          if (mapRef.current) return

          mapRef.current = new ymaps.Map(hostRef.current, {
            center: [55.751244, 37.618423],
            zoom: 11,
            controls: ['zoomControl'],
            // Скрыть ссылку «Открыть в Яндекс Картах» (левый нижний угол).
            suppressMapOpenBlock: true,
            suppressObsoleteBrowserNotifier: true,
          })

          geoObjectsRef.current = new ymaps.GeoObjectCollection()
          mapRef.current.geoObjects.add(geoObjectsRef.current)
          setMapReady(true)
        })
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить Яндекс.Карты')
      })
  }, [apiKey])

  useEffect(() => {
    if (!mapReady) return
    const ymaps = window.ymaps
    if (!ymaps) return
    if (!mapRef.current || !geoObjectsRef.current) return

    if (items.length === 0) return

    // Чтобы гарантированно отображать маркеры: пересоздаём коллекцию при смене data.
    try {
      mapRef.current.geoObjects.remove(geoObjectsRef.current)
    } catch {
      // ignore
    }

    geoObjectsRef.current = new ymaps.GeoObjectCollection()
    mapRef.current.geoObjects.add(geoObjectsRef.current)
    placemarksByIdRef.current = new Map()

    items.forEach((item) => {
      const collection = geoObjectsRef.current
      if (!collection) return
      const placemark = new ymaps.Placemark(
        [item.lat, item.lng],
        {
          hintContent: item.title,
          balloonContent: `<strong>${item.title}</strong><br/>${item.address}<br/>Цена: ${item.pricePerWeek.toLocaleString('ru-RU')} RUB/неделя`,
        },
        {
          // Активная метка подсвечивается во втором эффекте (без пересборки bounds).
          preset: getMarkerPreset(item.available, false),
        },
      ) as YandexPlacemarkHandle
      placemarksByIdRef.current.set(item.id, placemark)
      collection.add(placemark)
    })

    // Show all markers initially.
    try {
      const bounds = geoObjectsRef.current.getBounds()
      mapRef.current.setBounds(bounds, { checkZoomRange: true, zoomMargin: 20 } as Record<string, unknown>)
      return
    } catch {
      // ignore and fallback to center
    }

    // Fallback centering: average of coordinates
    const avgLat = items.reduce((s, x) => s + x.lat, 0) / items.length
    const avgLng = items.reduce((s, x) => s + x.lng, 0) / items.length
    try {
      mapRef.current.setCenter([avgLat, avgLng], 11)
    } catch {
      // ignore
    }
  }, [items, mapReady])

  // Выделение метки, центр и балун при выборе билборда с карточки.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    placemarksByIdRef.current.forEach((pm, id) => {
      const item = items.find((i) => i.id === id)
      if (!item) return
      try {
        pm.options.set('preset', getMarkerPreset(item.available, id === focusBillboardId))
      } catch {
        // ignore
      }
    })

    if (!focusBillboardId) return
    const item = items.find((i) => i.id === focusBillboardId)
    if (!item) return
    const pm = placemarksByIdRef.current.get(focusBillboardId)
    try {
      mapRef.current.setCenter([item.lat, item.lng], 16)
      pm?.balloon.open()
    } catch {
      // ignore
    }
  }, [focusBillboardId, items, mapReady])

  async function onSearchAddress() {
    const ymaps = window.ymaps
    if (!ymaps || !mapRef.current) return

    const query = searchValue.trim()
    if (!query) return

    setIsSearching(true)
    setError(null)
    try {
      const result = await ymaps.geocode(query, { results: 1 })
      const first = result.geoObjects.get(0)
      const coords = first.geometry.getCoordinates()
      mapRef.current.setCenter(coords, 16)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Адрес не найден.')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <Card>
      <Space style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <Input
          placeholder="Поиск по адресу"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onPressEnter={() => void onSearchAddress()}
          style={{ flex: 1 }}
          disabled={!mapReady}
        />
        <Button type="primary" onClick={() => void onSearchAddress()} loading={isSearching} disabled={!mapReady}>
          Найти
        </Button>
      </Space>

      <div className="yandex-map" ref={hostRef} />
      {error ? <p style={{ marginTop: 10, color: '#d94b4b' }}>{error}</p> : null}
    </Card>
  )
}

