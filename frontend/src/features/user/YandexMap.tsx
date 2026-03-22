import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Input, Space, Typography } from 'antd'
import type { Billboard } from '../../entities/types'
import { parseStatusToAvailable } from '../../shared/lib/parseStatusToAvailable'
import { reverseGeocodeLatLngToAddress } from '../../shared/lib/yandexGeocode'
import { ensureYandexMapsScript, getYandexMapsApiKey } from '../../shared/lib/yandexMapsLoader'

export type MapClickPlacementPayload = {
  lat: number
  lng: number
  address: string
}

interface YandexMapProps {
  items: Billboard[]
  /** При смене — карта центрируется на точке, открывается балун, метка выделяется. */
  focusBillboardId?: string | null
  /** Правый клик по карте: метка, обратный геокод и колбэк (контекстное меню браузера отключается). */
  clickToCreate?: {
    enabled: boolean
    onPlaced: (payload: MapClickPlacementPayload) => void
  }
  /** Увеличьте число, чтобы сбросить временную метку клика (закрытие модалки и т.п.). */
  placementClearNonce?: number
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

function getBillboardAvailable(item: Billboard) {
  const statusAvailable = parseStatusToAvailable(item.extraFields?.Status)
  return statusAvailable ?? item.available
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function YandexMap({
  items,
  focusBillboardId = null,
  clickToCreate,
  placementClearNonce = 0,
}: YandexMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<YandexMapInstance | null>(null)
  const itemsCollectionRef = useRef<YandexGeoObjectCollection | null>(null)
  const placementCollectionRef = useRef<YandexGeoObjectCollection | null>(null)
  const placemarksByIdRef = useRef<Map<string, YandexPlacemarkHandle>>(new Map())
  const prevClearNonceRef = useRef<number | undefined>(undefined)
  const onPlacedRef = useRef(clickToCreate?.onPlaced)
  onPlacedRef.current = clickToCreate?.onPlaced

  const [error, setError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const apiKey = useMemo(() => getYandexMapsApiKey(), [])

  /** Явная сигнатура набора — иначе при том же reference массива эффект маркеров мог не сработать. */
  const itemsSignature = useMemo(() => items.map((i) => i.id).join('|'), [items])

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
            suppressMapOpenBlock: true,
            suppressObsoleteBrowserNotifier: true,
          })

          itemsCollectionRef.current = new ymaps.GeoObjectCollection()
          placementCollectionRef.current = new ymaps.GeoObjectCollection()
          mapRef.current.geoObjects.add(itemsCollectionRef.current)
          mapRef.current.geoObjects.add(placementCollectionRef.current)
          setMapReady(true)
        })
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить Яндекс.Карты')
      })
  }, [apiKey])

  // Маркеры билбордов (отдельная коллекция — не трогаем метку «клик для создания»).
  useEffect(() => {
    if (!mapReady) return
    const ymaps = window.ymaps
    if (!ymaps) return
    if (!mapRef.current || !itemsCollectionRef.current) return

    const collection = itemsCollectionRef.current
    collection.removeAll()
    placemarksByIdRef.current = new Map()

    if (items.length === 0) {
      return
    }

    items.forEach((item) => {
      const titleEsc = escapeHtml(item.title)
      const addressEsc = escapeHtml(item.address)
      const companyName = item.companyName?.trim()
      const companyEsc = companyName ? escapeHtml(companyName) : ''
      const companyBlock = companyEsc ? `Компания: ${companyEsc}<br/>` : ''
      const hintContent = companyName ? `${companyName} — ${item.title}` : item.title

      const placemark = new ymaps.Placemark(
        [item.lat, item.lng],
        {
          hintContent,
          balloonContent: `<strong>${titleEsc}</strong><br/>${addressEsc}<br/>${companyBlock}Цена: ${item.pricePerWeek.toLocaleString('ru-RU')} RUB/неделя`,
        },
        {
          preset: getMarkerPreset(getBillboardAvailable(item), false),
        },
      ) as YandexPlacemarkHandle
      placemarksByIdRef.current.set(item.id, placemark)
      collection.add(placemark)
    })

    try {
      const bounds = collection.getBounds()
      mapRef.current.setBounds(bounds, { checkZoomRange: true, zoomMargin: 20 } as Record<string, unknown>)
      return
    } catch {
      // ignore
    }

    const avgLat = items.reduce((s, x) => s + x.lat, 0) / items.length
    const avgLng = items.reduce((s, x) => s + x.lng, 0) / items.length
    try {
      mapRef.current.setCenter([avgLat, avgLng], 11)
    } catch {
      // ignore
    }
  }, [items, itemsSignature, mapReady])

  useEffect(() => {
    if (!mapReady || !placementCollectionRef.current) return
    if (prevClearNonceRef.current === undefined) {
      prevClearNonceRef.current = placementClearNonce
      return
    }
    if (placementClearNonce !== prevClearNonceRef.current) {
      placementCollectionRef.current.removeAll()
      prevClearNonceRef.current = placementClearNonce
    }
  }, [placementClearNonce, mapReady])

  useEffect(() => {
    if (!mapReady || !clickToCreate?.enabled) {
      placementCollectionRef.current?.removeAll()
    }
  }, [clickToCreate?.enabled, mapReady])

  useEffect(() => {
    if (!mapReady || !mapRef.current || !clickToCreate?.enabled || !apiKey) return

    const map = mapRef.current
    const handler = (e: unknown) => {
      const ev = e as { get: (k: string) => unknown }
      const domEvent = ev.get('domEvent')
      if (domEvent && typeof (domEvent as Event).preventDefault === 'function') {
        ;(domEvent as Event).preventDefault()
      }

      const coords = ev.get('coords') as [number, number]
      const lat = coords[0]
      const lng = coords[1]
      const ymaps = window.ymaps
      const placement = placementCollectionRef.current
      if (!ymaps || !placement) return

      placement.removeAll()
      const pm = new ymaps.Placemark(
        coords,
        {
          hintContent: 'Новая конструкция',
          balloonContent: 'Определяем адрес…',
        },
        { preset: 'islands#violetDotIcon' },
      )
      placement.add(pm)

      void reverseGeocodeLatLngToAddress(lat, lng, apiKey)
        .then((address) => {
          onPlacedRef.current?.({ lat, lng, address })
        })
        .catch(() => {
          onPlacedRef.current?.({ lat, lng, address: '' })
        })
    }

    map.events.add('contextmenu', handler)
    return () => {
      map.events.remove('contextmenu', handler)
    }
  }, [mapReady, clickToCreate?.enabled, apiKey])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    placemarksByIdRef.current.forEach((pm, id) => {
      const item = items.find((i) => i.id === id)
      if (!item) return
      try {
        pm.options.set('preset', getMarkerPreset(getBillboardAvailable(item), id === focusBillboardId))
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

      {clickToCreate?.enabled ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 12 }}>
          Правый клик по карте — поставить точку новой конструкции и открыть форму с адресом по координатам.
        </Typography.Paragraph>
      ) : null}

      <div
        className="yandex-map"
        ref={hostRef}
        onContextMenu={(e) => {
          if (clickToCreate?.enabled) e.preventDefault()
        }}
        style={{ height: 500, minHeight: 500 }}
      />
      {error ? <p style={{ marginTop: 10, color: '#d94b4b' }}>{error}</p> : null}
    </Card>
  )
}
