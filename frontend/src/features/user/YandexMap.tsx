import { Button, Card, Input, Space, Typography } from 'antd'
import { ensureYandexMapsScript, getYandexMapsApiKey } from '../../shared/lib/yandexMapsLoader'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { Billboard } from '../../entities/types'
import { effectiveBillboardAvailable } from '../../shared/lib/effectiveBillboardAvailable'
import { reverseGeocodeLatLngToAddress } from '../../shared/lib/yandexGeocode'

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
  return effectiveBillboardAvailable(item)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Временно скрываем владельца/компанию в балуне карты (по запросу). */
const SHOW_MAP_BALLOON_COMPANY = false

function buildBillboardBalloonHtml(item: Billboard): string {
  const addressEsc = escapeHtml(item.address)
  const priceStr = `${item.pricePerWeek.toLocaleString('ru-RU')} руб / месяц`

  const sideRaw = item.extraFields?.Side
  const sideStr =
    sideRaw != null && String(sideRaw).trim() ? escapeHtml(String(sideRaw).trim()) : '—'

  const isAvailable = effectiveBillboardAvailable(item)
  const statusStr = isAvailable ? 'Доступен' : 'Недоступен'

  const gid = item.extraFields?.Gid
  const articleText =
    gid != null && String(gid).trim() ? String(gid).trim() : item.title
  const articleEsc = escapeHtml(articleText)

  return [
    '<div style="line-height:1.45;max-width:280px;">',
    `<div style="margin-bottom:8px;"><strong style="font-size:14px;">${addressEsc}</strong></div>`,
    `<div>Цена: ${priceStr}</div>`,
    `<div>Сторона: ${sideStr}</div>`,
    `<div>Статус: ${statusStr}</div>`,
    `<div style="font-size:11px;color:rgba(0,0,0,0.55);margin-top:8px;">Артикул: ${articleEsc}</div>`,
    '</div>',
  ].join('')
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
      const companyName = item.companyName?.trim()
      const hintContent = SHOW_MAP_BALLOON_COMPANY && companyName ? `${companyName} — ${item.title}` : item.title

      const placemark = new ymaps.Placemark(
        [item.lat, item.lng],
        {
          hintContent,
          balloonContent: buildBillboardBalloonHtml(item),
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
    <Card variant="borderless" styles={{ root: { boxShadow: 'none' }, body: { padding: 0 } }}>
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
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 12, padding: '0 12px' }}>
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
      {error ? <p style={{ marginTop: 10, color: '#d94b4b', padding: '0 12px 12px' }}>{error}</p> : null}
    </Card>
  )
}
