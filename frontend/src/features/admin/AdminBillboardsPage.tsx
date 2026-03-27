import { Alert, Button, Card, Col, Collapse, Divider, Dropdown, Form, Input, InputNumber, Modal, Popover, Radio, Row, Select, Slider, Space, Spin, Table, Typography } from 'antd'
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditFilled,
  EditOutlined,
  EllipsisOutlined,
  FilterFilled,
  FilterOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  UnorderedListOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { notifyError, notifySuccess } from '../../shared/lib/notify'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { Billboard } from '../../entities/types'
import { BillboardPhotoIconButton } from '../../shared/ui/BillboardPhotoIconButton'
import { ExternalImagePreview } from '../../shared/ui/ExternalImagePreview'
import { YandexMap } from '../user/YandexMap'
import { filterBillboardsBySearchQuery } from '../../shared/lib/filterBillboardsBySearchQuery'
import { formatExtraField } from '../../shared/lib/formatExtraField'
import { geocodeAddressToLatLng, reverseGeocodeLatLngToAddress } from '../../shared/lib/yandexGeocode'
import { getPhotoUrl } from '../../shared/lib/photoLinkBehavior'
import { getYandexMapsApiKey } from '../../shared/lib/yandexMapsLoader'
import { observer } from 'mobx-react-lite'
import { parseCsv } from '../../shared/lib/parseCsv'
import { parseStatusToAvailable } from '../../shared/lib/parseStatusToAvailable'
import { tryParseLatLngFromText } from '../../shared/lib/parseCoords'
import { useStore } from '../../app/store/rootStore'

const emptyForm: Omit<Billboard, 'id'> = {
  title: '',
  description: '',
  type: 'billboard',
  address: '',
  lat: 55.751,
  lng: 37.618,
  pricePerWeek: 0,
  size: '3x6 м',
  available: true,
}

export const AdminBillboardsPage = observer(function AdminBillboardsPage() {
  const { billboards, session } = useStore()
  const [form, setForm] = useState<Omit<Billboard, 'id'>>(emptyForm)
  const [coordsPasteDraft, setCoordsPasteDraft] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [geoHint, setGeoHint] = useState<string | null>(null)
  const lastGeocodedAddressRef = useRef<string>('')
  const canEdit = session.role === 'admin'
  const yandexKey = getYandexMapsApiKey()
  const [csvSurfaces, setCsvSurfaces] = useState<Omit<Billboard, 'id'>[]>([])
  const [csvParsing, setCsvParsing] = useState(false)
  const [csvError, setCsvError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')
  const [activeExtraBillboardId, setActiveExtraBillboardId] = useState<string | null>(null)
  const [mapFocusBillboardId, setMapFocusBillboardId] = useState<string | null>(null)
  const mapSectionRef = useRef<HTMLDivElement | null>(null)
  const [mapPlacementNonce, setMapPlacementNonce] = useState(0)
  const [mapPickModalOpen, setMapPickModalOpen] = useState(false)
  const [mapPickDraft, setMapPickDraft] = useState<Omit<Billboard, 'id'>>(() => ({ ...emptyForm }))
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  const [billboardSearchQuery, setBillboardSearchQuery] = useState('')
  const [priceSort, setPriceSort] = useState<'none' | 'asc' | 'desc'>('none')
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null)
  const [priceSliderDraft, setPriceSliderDraft] = useState<[number, number] | null>(null)

  const [editingBillboardId, setEditingBillboardId] = useState<string | null>(null)
  const [editTitleDraft, setEditTitleDraft] = useState('')
  const [editTypeDraft, setEditTypeDraft] = useState<Billboard['type']>('billboard')
  const [editSizeDraft, setEditSizeDraft] = useState('')
  const [editAddressDraft, setEditAddressDraft] = useState('')
  const [editPriceDraft, setEditPriceDraft] = useState<number>(0)
  const [editLatDraft, setEditLatDraft] = useState<number>(55.751)
  const [editLngDraft, setEditLngDraft] = useState<number>(37.618)
  const [editStatusAvailableDraft, setEditStatusAvailableDraft] = useState(true)
  const [editDescriptionDraft, setEditDescriptionDraft] = useState('')
  const [editExtraDraft, setEditExtraDraft] = useState<Record<string, string>>({})
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null)

  const priceExtent = useMemo(() => {
    const prices = billboards.items.map((b) => b.pricePerWeek).filter((p) => Number.isFinite(p))
    if (!prices.length) return null
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    return { min, max }
  }, [billboards.items])

  const emin = priceExtent?.min ?? 0
  const emax = priceExtent?.max ?? 0

  useEffect(() => {
    setPriceRange(null)
    setPriceSliderDraft(null)
  }, [emin, emax])

  const committedPriceRange = useMemo((): [number, number] => {
    if (!priceExtent) return [0, 0]
    return priceRange ?? [priceExtent.min, priceExtent.max]
  }, [priceExtent, priceRange])

  const sliderDisplayValue = useMemo((): [number, number] => {
    if (!priceExtent) return [0, 0]
    return priceSliderDraft ?? committedPriceRange
  }, [priceExtent, priceSliderDraft, committedPriceRange])

  const isPriceFilterActive =
    !!priceExtent &&
    (committedPriceRange[0] > priceExtent.min || committedPriceRange[1] < priceExtent.max)

  const adminFiltersPopoverActive = isPriceFilterActive || priceSort !== 'none'

  const searchFilteredBillboards = useMemo(() => {
    let list = filterBillboardsBySearchQuery(billboards.items, billboardSearchQuery)
    if (priceExtent) {
      const [lo, hi] = committedPriceRange
      list = list.filter((b) => b.pricePerWeek >= lo && b.pricePerWeek <= hi)
    }
    if (priceSort !== 'none') {
      list = [...list].sort((a, b) =>
        priceSort === 'asc' ? a.pricePerWeek - b.pricePerWeek : b.pricePerWeek - a.pricePerWeek,
      )
    }
    return list
  }, [billboards.items, billboardSearchQuery, priceExtent, committedPriceRange, priceSort])

  /** Список для карты/карточек/таблицы: поиск + редактируемая строка не пропадает при фильтре. */
  const displayedBillboards = useMemo(() => {
    if (!editingBillboardId) return searchFilteredBillboards
    const editing = billboards.items.find((b) => b.id === editingBillboardId)
    if (!editing || searchFilteredBillboards.some((b) => b.id === editingBillboardId)) {
      return searchFilteredBillboards
    }
    return [editing, ...searchFilteredBillboards]
  }, [billboards.items, editingBillboardId, searchFilteredBillboards])

  useEffect(() => {
    if (!mapFocusBillboardId) return
    if (displayedBillboards.some((b) => b.id === mapFocusBillboardId)) return
    setMapFocusBillboardId(null)
  }, [displayedBillboards, mapFocusBillboardId])

  async function confirmAndDelete(id: string) {
    if (!canEdit || session.isLoading || billboards.isSaving) return

    Modal.confirm({
      title: 'Удалить конструкцию?',
      content: 'Действие нельзя отменить.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      onOk: async () => {
        await billboards.remove(id)
        if (billboards.lastError) {
          notifyError('Ошибка удаления', billboards.lastError)
          return
        }
        notifySuccess('Конструкция удалена')
      },
    })
  }

  const extraFieldsHiddenKeys = ['Gid', 'Format', 'Dinamic', 'address', 'Price', 'available', 'Coordinate']

  /** Поля раздела «Подробнее» — показываем в форме даже если в данных пусто. */
  const extraFieldTemplateKeys = [
    'city',
    'Side',
    'Photo',
    'Light',
    'Material',
    'specPrice',
    'printPrice',
    'installPrice',
    'AdditionalInstallPrice',
    'Tax',
    'GRP',
    'OTS',
    'ESPAR',
  ] as const

  function beginEdit(item: Billboard) {
    const statusAvailable = parseStatusToAvailable(item.extraFields?.Status)
    const nextStatus = statusAvailable ?? item.available

    setEditingBillboardId(item.id)
    setActiveExtraBillboardId(null)

    setEditTitleDraft(item.title)
    setEditDescriptionDraft(item.description?.trim() ?? '')
    setEditTypeDraft(item.type)
    setEditSizeDraft(item.size)
    setEditAddressDraft(item.address)
    setEditPriceDraft(item.pricePerWeek)
    setEditLatDraft(item.lat)
    setEditLngDraft(item.lng)
    setEditStatusAvailableDraft(nextStatus)

    const nextExtraDraft: Record<string, string> = {}
    for (const k of extraFieldTemplateKeys) {
      nextExtraDraft[k] = ''
    }
    if (item.extraFields) {
      for (const [k, v] of Object.entries(item.extraFields)) {
        if (extraFieldsHiddenKeys.includes(k) || k === 'Status') continue
        nextExtraDraft[k] = v == null ? '' : String(v)
      }
    }
    setEditExtraDraft(nextExtraDraft)
  }

  function cancelEdit() {
    setEditingBillboardId(null)
    setEditExtraDraft({})
  }

  async function saveEdit(item: Billboard) {
    const title = editTitleDraft.trim()
    let address = editAddressDraft.trim()
    const size = editSizeDraft.trim()

    const isValid =
      title.length > 0 &&
      size.length > 0 &&
      Number.isFinite(editLatDraft) &&
      Number.isFinite(editLngDraft) &&
      editPriceDraft >= 0

    if (!isValid) return

    if (!address && yandexKey) {
      try {
        address = (await reverseGeocodeLatLngToAddress(editLatDraft, editLngDraft, yandexKey)).trim()
      } catch {
        // можно сохранить без адреса
      }
    }

    const nextExtraFields: Record<string, unknown> = { ...(item.extraFields ?? {}) } as Record<string, unknown>

    for (const [k, v] of Object.entries(editExtraDraft)) {
      const trimmed = v.trim()
      if (!trimmed) delete nextExtraFields[k]
      else nextExtraFields[k] = trimmed
    }

    nextExtraFields.Status = editStatusAvailableDraft

    const payload: Omit<Billboard, 'id'> = {
      title,
      description: editDescriptionDraft.trim(),
      type: editTypeDraft,
      address,
      lat: editLatDraft,
      lng: editLngDraft,
      pricePerWeek: Math.round(editPriceDraft),
      size,
      available: editStatusAvailableDraft,
      extraFields: Object.keys(nextExtraFields).length ? nextExtraFields : undefined,
    }

    await billboards.update(item.id, payload)
    if (billboards.lastError) {
      notifyError('Ошибка сохранения', billboards.lastError)
      return
    }

    notifySuccess('Конструкция обновлена')
    cancelEdit()
  }

  function closeMapPickModal() {
    setMapPickModalOpen(false)
    setMapPickDraft({ ...emptyForm })
    setMapPlacementNonce((n) => n + 1)
  }

  async function submitMapPickDraft() {
    const title = mapPickDraft.title.trim()
    let address = mapPickDraft.address.trim()
    const size = mapPickDraft.size.trim()
    if (!title || !size || !mapPickDraft.pricePerWeek) {
      notifyError('Ошибка', 'Укажите заголовок, размер и цену за неделю.')
      return
    }
    if (!Number.isFinite(mapPickDraft.lat) || !Number.isFinite(mapPickDraft.lng)) {
      notifyError('Ошибка', 'Некорректные координаты.')
      return
    }

    if (!address && yandexKey) {
      try {
        address = (await reverseGeocodeLatLngToAddress(mapPickDraft.lat, mapPickDraft.lng, yandexKey)).trim()
      } catch {
        // можно сохранить без адреса
      }
    }

    const extraFields: Record<string, unknown> = {
      Status: mapPickDraft.available,
    }

    await billboards.add({
      ...mapPickDraft,
      title,
      address,
      size,
      pricePerWeek: Math.round(mapPickDraft.pricePerWeek),
      lat: mapPickDraft.lat,
      lng: mapPickDraft.lng,
      extraFields,
    })
    if (billboards.lastError) {
      notifyError('Ошибка сохранения', billboards.lastError)
      return
    }
    notifySuccess('Конструкция добавлена')
    closeMapPickModal()
  }

  async function confirmAndDeleteAll() {
    if (!canEdit || session.isLoading || billboards.isSaving || isDeletingAll) return
    const ids = billboards.items.map((b) => b.id)
    if (ids.length === 0) {
      notifyError('Удаление невозможно', 'Список билбордов пуст.')
      return
    }

    Modal.confirm({
      title: 'Удалить все конструкции?',
      content: `Будет удалено: ${ids.length}. Действие нельзя отменить.`,
      okText: 'Удалить все!',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        setIsDeletingAll(true)
        try {
          if (editingBillboardId) cancelEdit()

          for (const id of ids) {
            await billboards.remove(id)
          }

          if (billboards.lastError) {
            notifyError('Ошибка удаления', billboards.lastError)
            return
          }

          notifySuccess('Все конструкции удалены')
        } finally {
          setIsDeletingAll(false)
        }
      },
    })
  }

  const [extraDraft, setExtraDraft] = useState<Record<string, string>>({
    GRP: '',
    OTS: '',
    Tax: '',
    Side: '',
    city: '',
    ESPAR: '',
    Light: '',
    Photo: '',
    Status: '',
    Material: '',
    specPrice: '',
    printPrice: '',
    installPrice: '',
    AdditionalInstallPrice: '',
  })

  async function tryFillAddressFromCoords(lat: number, lng: number) {
    if (!yandexKey) {
      setGeoHint('Задайте VITE_YANDEX_MAPS_API_KEY — иначе адрес по координатам не подставить.')
      return
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    setGeocoding(true)
    setGeoHint(null)
    try {
      const addr = await reverseGeocodeLatLngToAddress(lat, lng, yandexKey)
      setForm((f) => ({ ...f, address: addr || '' }))
      lastGeocodedAddressRef.current = addr
      if (addr) {
        setGeoHint('Адрес подставлен по координатам')
      } else {
        setGeoHint('Адрес по координатам не найден — можно ввести вручную или оставить пустым')
      }
    } catch (e: unknown) {
      setGeoHint(e instanceof Error ? e.message : 'Не удалось определить адрес')
    } finally {
      setGeocoding(false)
    }
  }

  async function tryFillEditAddressFromCoords(lat: number, lng: number) {
    if (!yandexKey) return
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    setGeocoding(true)
    try {
      const addr = await reverseGeocodeLatLngToAddress(lat, lng, yandexKey)
      setEditAddressDraft(addr || '')
    } catch {
      // ignore
    } finally {
      setGeocoding(false)
    }
  }

  async function tryFillMapPickAddressFromCoords(lat: number, lng: number) {
    if (!yandexKey) return
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    setGeocoding(true)
    try {
      const addr = await reverseGeocodeLatLngToAddress(lat, lng, yandexKey)
      setMapPickDraft((d) => ({ ...d, address: addr || '' }))
    } catch {
      // ignore
    } finally {
      setGeocoding(false)
    }
  }

  function applyParsedCoords(text: string): boolean {
    const parsed = tryParseLatLngFromText(text)
    if (!parsed) return false
    setForm((f) => ({ ...f, lat: parsed.lat, lng: parsed.lng }))
    setCoordsPasteDraft('')
    setGeoHint(null)
    void tryFillAddressFromCoords(parsed.lat, parsed.lng)
    return true
  }

  async function resolveCoordsFromAddress(address: string) {
    const trimmed = address.trim()
    if (trimmed.length < 4) {
      setGeoHint('Введите адрес подлиннее')
      return
    }
    if (!yandexKey) {
      setGeoHint('Задайте VITE_YANDEX_MAPS_API_KEY — иначе координаты по адресу не определить.')
      return
    }
    if (trimmed === lastGeocodedAddressRef.current) return

    setGeocoding(true)
    setGeoHint(null)
    try {
      const { lat, lng } = await geocodeAddressToLatLng(trimmed, yandexKey)
      setForm((f) => ({ ...f, lat, lng }))
      lastGeocodedAddressRef.current = trimmed
      setGeoHint('Координаты обновлены по адресу')
    } catch (e: unknown) {
      lastGeocodedAddressRef.current = ''
      setGeoHint(e instanceof Error ? e.message : 'Не удалось найти координаты')
    } finally {
      setGeocoding(false)
    }
  }

  // Под ваш `example.csv`:
  // city;Gid;Format;Dinamic;address;...;Price;...;available;...;Coordinate
  function parseLooseNumber(value: string): number | null {
    const raw = value.trim()
    if (!raw) return null
    const normalized = raw.replace(',', '.').replace(/[^0-9.+-]/g, '')
    const num = Number(normalized)
    return Number.isFinite(num) ? num : null
  }

  function parseAvailableCsv(value: string): boolean | null {
    const v = value.trim().toLowerCase()
    if (!v) return null
    // В вашем примере: "резерв" => недоступно.
    if (['да', 'true', '1', 'active', 'available', 'доступен', 'доступна', 'доступно', 'доступ'].some((x) => v.includes(x))) return true
    return false
  }

  function parseTypeFromDinamic(value: string): Billboard['type'] | null {
    const v = value.trim().toLowerCase()
    if (!v) return null
    if (v.includes('дина')) return 'digital'
    if (v.includes('стат')) return 'billboard'
    return 'billboard'
  }

  function normalizeSizeFromFormat(format: string): string | null {
    const f = format.trim()
    if (!f) return null
    const normalized = f.replace('х', 'x')
    if (normalized.toLowerCase().includes('м')) return normalized
    return `${normalized} м`
  }

  function csvRowToSurface(headers: string[], headerIndex: Record<string, number>, row: string[]): Omit<Billboard, 'id'> | null {
    const get = (key: string) => {
      const idx = headerIndex[key]
      return idx === undefined ? '' : (row[idx] ?? '').trim()
    }

    const title = get('Gid')
    const dinamic = get('Dinamic')
    const type = parseTypeFromDinamic(dinamic)
    const address = get('address')
    const format = get('Format')
    const size = normalizeSizeFromFormat(format)

    const coordsParsed = tryParseLatLngFromText(get('Coordinate'))
    const pricePerWeek = parseLooseNumber(get('Price'))
    // Для разных CSV файликов "истина" для статуса может лежать в разных колонках.
    // В вашем `example3.csv` везде True в колонке `Status`, а колонка `available` содержит `резерв`.
    const statusValue = headerIndex['Status'] !== undefined ? get('Status') : ''
    const availableValue = headerIndex['available'] !== undefined ? get('available') : ''
    const available = parseAvailableCsv(statusValue || availableValue)

    if (!title) return null
    if (!type) return null
    if (!address) return null
    if (!size) return null
    if (coordsParsed == null) return null
    if (pricePerWeek == null) return null
    if (available == null) return null

    const extraFields: Record<string, unknown> = {}
    headers.forEach((h, idx) => {
      extraFields[h] = (row[idx] ?? '').trim()
    })
    extraFields.Status = available

    const description = headerIndex['description'] !== undefined ? get('description') : ''

    return {
      title,
      type,
      address,
      lat: coordsParsed.lat,
      lng: coordsParsed.lng,
      pricePerWeek: Math.round(pricePerWeek),
      size,
      available,
      ...(description ? { description } : {}),
      extraFields,
    }
  }

  async function onCsvFileSelected(file: File) {
    setCsvError(null)
    setCsvSurfaces([])
    setCsvParsing(true)
    try {
      const text = await file.text()
      const { header, rows } = parseCsv(text)
      const headerIndex: Record<string, number> = {}
      header.forEach((h, idx) => {
        headerIndex[h] = idx
      })

      const requiredHeaders = ['Gid', 'Format', 'Dinamic', 'address', 'Price', 'Coordinate']
      const missing = requiredHeaders.filter((h) => headerIndex[h] === undefined)
      if (missing.length) {
        setCsvError(`В CSV не найдены нужные колонки: ${missing.join(', ')}`)
        return
      }

      if (headerIndex['available'] === undefined && headerIndex['Status'] === undefined) {
        setCsvError('В CSV не найдены колонки статуса: ожидается `available` или `Status`')
        return
      }

      const surfaces: Omit<Billboard, 'id'>[] = []
      const errors: number[] = []

      // Safety limit: не парсим бесконечные файлы.
      const maxRows = 2000
      rows.slice(0, maxRows).forEach((row, i) => {
        const surface = csvRowToSurface(header, headerIndex, row)
        if (surface) surfaces.push(surface)
        else errors.push(i + 2)
      })

      if (surfaces.length === 0) {
        setCsvError('Не удалось распознать ни одной валидной строки. Проверьте заголовки и формат данных.')
        return
      }

      setCsvSurfaces(surfaces)
      if (errors.length > 0) {
        setCsvError(`Некоторые строки не распознаны: ${errors.slice(0, 5).join(', ')}${errors.length > 5 ? `… (всего ${errors.length})` : ''}`)
      }
    } catch (e: unknown) {
      setCsvError(e instanceof Error ? e.message : 'Не удалось прочитать CSV')
    } finally {
      setCsvParsing(false)
    }
  }

  function csvEscape(value: unknown, delimiter: string): string {
    const raw = value == null ? '' : String(value)
    const escaped = raw.replace(/"/g, '""')
    const mustQuote = escaped.includes('"') || escaped.includes(delimiter) || escaped.includes('\n') || escaped.includes('\r')
    return mustQuote ? `"${escaped}"` : escaped
  }

  async function exportCsv() {
    if (!canEdit || billboards.isSaving) return
    try {
      const delimiter = ';'
      const reservedHeaders = ['Gid', 'Format', 'Dinamic', 'address', 'Price', 'Coordinate', 'Status', 'available']

      const extraKeys = new Set<string>()
      billboards.items.forEach((item) => {
        if (!item.extraFields) return
        Object.keys(item.extraFields).forEach((k) => {
          if (reservedHeaders.includes(k)) return
          extraKeys.add(k)
        })
      })

      const headers = [...reservedHeaders, ...Array.from(extraKeys).sort()]

      const lines: string[] = []
      lines.push(headers.map((h) => csvEscape(h, delimiter)).join(delimiter))

      billboards.items.forEach((item) => {
        const statusAvailable = parseStatusToAvailable(item.extraFields?.Status)
        const isAvailable = statusAvailable ?? item.available

        const extraFields = item.extraFields ?? {}
        const row = headers.map((h) => {
          if (h === 'Gid') return item.title
          if (h === 'Format') return item.size
          if (h === 'Dinamic') return item.type === 'digital' ? 'Digital' : 'Статический'
          if (h === 'address') return item.address
          if (h === 'Price') return item.pricePerWeek
          if (h === 'Coordinate') return `${item.lat}, ${item.lng}`
          if (h === 'Status') return isAvailable ? 'true' : 'false'
          if (h === 'available') return isAvailable ? 'true' : 'false'

          const v = (extraFields as Record<string, unknown>)[h]
          if (v == null) return ''
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v
          return JSON.stringify(v)
        })

        lines.push(row.map((v) => csvEscape(v, delimiter)).join(delimiter))
      })

      const content = '\uFEFF' + lines.join('\r\n')
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      const today = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `billboards-export-${today}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()

      URL.revokeObjectURL(url)
      notifySuccess('Экспорт CSV', billboards.items.length ? `Скачивание: ${a.download}` : 'Экспорт пустого списка.')
    } catch (e: unknown) {
      notifyError('Ошибка экспорта CSV', e instanceof Error ? e.message : 'Не удалось сформировать CSV')
    }
  }

  useEffect(() => {
    if (session.role !== 'admin') return
    void billboards.load('mine')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.role])

  return (
    <>
      <div style={{ paddingLeft: 20 }}>
        <Typography.Title level={4}>Рекламные элементы компании</Typography.Title>
        <Typography.Paragraph>
          Добавляйте, обновляйте и удаляйте карточки конструкций, доступных для аренды.
        </Typography.Paragraph>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <Card type="inner" title="Импорт CSV" loading={csvParsing}>
          <Space orientation="vertical" size="middle" style={{ width: '100%', display: 'flex' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.currentTarget.files?.[0]
                if (!file) return
                void onCsvFileSelected(file)
                // allow selecting the same file again
                e.currentTarget.value = ''
              }}
              disabled={!canEdit || billboards.isSaving}
            />

            {/* Кнопки выбора файла и экспорта — одна строка */}
            <Space size="small" wrap={false} style={{ flexWrap: 'nowrap' }}>
              <Button
                icon={<DownloadOutlined />}
                disabled={!canEdit || billboards.isSaving}
                onClick={() => fileInputRef.current?.click()}
              >
                Импорт CSV
              </Button>
              <Button
                icon={<UploadOutlined />}
                disabled={!canEdit || billboards.isSaving}
                onClick={() => void exportCsv()}
              >
                Экспорт CSV
              </Button>
            </Space>

            {csvSurfaces.length ? (
              <Alert
                type="success"
                showIcon
                title={`Распознано строк: ${csvSurfaces.length}`}
                style={{ width: '100%' }}
              />
            ) : null}

            {csvError ? (
              <Alert type="error" showIcon title={csvError} style={{ width: '100%' }} />
            ) : null}

            {/* Подтверждение импорта — одна строка */}
            {csvSurfaces.length ? (
              <Space size="small" wrap={false} style={{ flexWrap: 'nowrap' }}>
                <Button
                  type="primary"
                  disabled={!canEdit || billboards.isSaving}
                  loading={billboards.isSaving}
                  onClick={async () => {
                    await billboards.bulkImport(csvSurfaces)
                    if (billboards.lastError) {
                      notifyError('Ошибка импорта CSV', billboards.lastError)
                      return
                    }
                    notifySuccess('Импорт CSV завершен', `Добавлено: ${csvSurfaces.length}`)
                    setCsvSurfaces([])
                    setCsvError(null)
                  }}
                >
                  Импортировать
                </Button>
                <Button
                  disabled={!canEdit || billboards.isSaving}
                  onClick={() => {
                    setCsvSurfaces([])
                    setCsvError(null)
                  }}
                >
                  Очистить
                </Button>
              </Space>
            ) : null}

            {csvSurfaces.length ? (
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                Пример данных: {csvSurfaces.slice(0, 3).map((s) => `${s.title} (${s.lat}, ${s.lng})`).join(' • ')}
                {csvSurfaces.length > 3 ? ' • …' : ''}
              </Typography.Text>
            ) : null}
          </Space>
        </Card>

        <Card>
          <Form layout="vertical" className="app-form">
        <Form.Item label="Заголовок">
          <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} disabled={!canEdit} />
        </Form.Item>

        <Form.Item label="Описание" extra={<Typography.Text type="secondary">Краткий текст о конструкции, виден в карточке в каталоге.</Typography.Text>}>
          <Input.TextArea
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            disabled={!canEdit}
            rows={3}
            placeholder="Необязательно"
            showCount
            maxLength={2000}
          />
        </Form.Item>

        <Form.Item label="Тип">
          <Select<Billboard['type']>
            value={form.type}
            onChange={(value) => setForm({ ...form, type: value })}
            disabled={!canEdit}
          >
            <Select.Option value="billboard">Билборд</Select.Option>
            <Select.Option value="cityboard">Ситиборд</Select.Option>
            <Select.Option value="supersite">Суперсайт</Select.Option>
            <Select.Option value="digital">Digital экран</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Адрес"
          extra={
            geocoding ? (
              <Spin size="small" style={{ marginTop: 4 }} />
            ) : geoHint ? (
              <Typography.Text
                type={
                  geoHint.includes('обновлены') || geoHint.includes('подставлен')
                    ? 'success'
                    : geoHint.includes('VITE_YANDEX') || geoHint.includes('подлиннее')
                      ? 'warning'
                      : 'danger'
                }
                style={{ fontSize: 12 }}
              >
                {geoHint}
              </Typography.Text>
            ) : (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Необязательно. Если адрес указан — при уходе с поля подставятся координаты. При изменении координат
                (вставка строки или уход с широты/долготы) адрес обновится по новым точкам (нужен ключ API Яндекс.Карт).
              </Typography.Text>
            )
          }
        >
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={form.address}
              onChange={(event) => {
                setForm({ ...form, address: event.target.value })
                if (event.target.value.trim() !== lastGeocodedAddressRef.current) {
                  lastGeocodedAddressRef.current = ''
                }
              }}
              onBlur={() => void resolveCoordsFromAddress(form.address)}
              placeholder="Необязательно — например: Москва, Ленинский проспект, 1"
              disabled={!canEdit}
              style={{ flex: 1 }}
            />
            <Button
              type="default"
              disabled={!canEdit || geocoding || !form.address.trim()}
              loading={geocoding}
              onClick={() => void resolveCoordsFromAddress(form.address)}
            >
              Определить координаты
            </Button>
          </Space.Compact>
        </Form.Item>

        <Form.Item
          label="Координаты одной строкой"
          extra={
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Вставьте из буфера формат <Typography.Text code>55.683194, 37.561895</Typography.Text> — широта и долгота
              заполнятся сами (можно с точкой с запятой или пробелом между числами).
            </Typography.Text>
          }
        >
          <Input
            value={coordsPasteDraft}
            onChange={(e) => setCoordsPasteDraft(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text')
              if (tryParseLatLngFromText(text)) {
                e.preventDefault()
                applyParsedCoords(text)
              }
            }}
            onBlur={() => {
              if (coordsPasteDraft.trim()) applyParsedCoords(coordsPasteDraft)
            }}
            placeholder="55.683194, 37.561895"
            disabled={!canEdit}
            allowClear
            onClear={() => setCoordsPasteDraft('')}
          />
        </Form.Item>

        <Form.Item label="Цена за неделю">
          <InputNumber
            value={form.pricePerWeek}
            onChange={(value) => setForm({ ...form, pricePerWeek: value ?? 0 })}
            disabled={!canEdit}
            min={0}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Space style={{ display: 'flex', gap: 16, width: '100%' }} wrap>
          <Form.Item label="Широта" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
            <InputNumber
              value={form.lat}
              onChange={(value) => setForm({ ...form, lat: value ?? 0 })}
              onBlur={() => void tryFillAddressFromCoords(form.lat, form.lng)}
              disabled={!canEdit}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="Долгота" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
            <InputNumber
              value={form.lng}
              onChange={(value) => setForm({ ...form, lng: value ?? 0 })}
              onBlur={() => void tryFillAddressFromCoords(form.lat, form.lng)}
              disabled={!canEdit}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Space>

        <Collapse
          style={{ marginTop: 16 }}
          items={[
            {
              key: 'extra-fields',
              label: 'Дополнительные поля (необязательно)',
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <Typography.Text>GRP</Typography.Text>
                    <Input value={extraDraft.GRP} onChange={(e) => setExtraDraft((d) => ({ ...d, GRP: e.target.value }))} disabled={!canEdit} />
                  </div>
                  <div>
                    <Typography.Text>OTS</Typography.Text>
                    <Input value={extraDraft.OTS} onChange={(e) => setExtraDraft((d) => ({ ...d, OTS: e.target.value }))} disabled={!canEdit} />
                  </div>
                  <div>
                    <Typography.Text>Налог</Typography.Text>
                    <Input value={extraDraft.Tax} onChange={(e) => setExtraDraft((d) => ({ ...d, Tax: e.target.value }))} disabled={!canEdit} />
                  </div>
                  <div>
                    <Typography.Text>Сторона</Typography.Text>
                    <Input value={extraDraft.Side} onChange={(e) => setExtraDraft((d) => ({ ...d, Side: e.target.value }))} disabled={!canEdit} />
                  </div>
                  <div>
                    <Typography.Text>Город</Typography.Text>
                    <Input value={extraDraft.city} onChange={(e) => setExtraDraft((d) => ({ ...d, city: e.target.value }))} disabled={!canEdit} />
                  </div>
                  <div>
                    <Typography.Text>ESPAR</Typography.Text>
                    <Input value={extraDraft.ESPAR} onChange={(e) => setExtraDraft((d) => ({ ...d, ESPAR: e.target.value }))} disabled={!canEdit} />
                  </div>
                  <div>
                    <Typography.Text>Подсветка</Typography.Text>
                    <Input value={extraDraft.Light} onChange={(e) => setExtraDraft((d) => ({ ...d, Light: e.target.value }))} disabled={!canEdit} />
                  </div>
                  <div>
                    <Typography.Text>Фото</Typography.Text>
                    <Input value={extraDraft.Photo} onChange={(e) => setExtraDraft((d) => ({ ...d, Photo: e.target.value }))} disabled={!canEdit} />
                  </div>
                  <div>
                    <Typography.Text>Статус</Typography.Text>
                    <Input value={extraDraft.Status} onChange={(e) => setExtraDraft((d) => ({ ...d, Status: e.target.value }))} disabled={!canEdit} />
                  </div>
                  <div>
                    <Typography.Text>Материал</Typography.Text>
                    <Input value={extraDraft.Material} onChange={(e) => setExtraDraft((d) => ({ ...d, Material: e.target.value }))} disabled={!canEdit} />
                  </div>
                  <div>
                    <Typography.Text>Спец. цена</Typography.Text>
                    <Input value={extraDraft.specPrice} onChange={(e) => setExtraDraft((d) => ({ ...d, specPrice: e.target.value }))} disabled={!canEdit} />
                  </div>
                  <div>
                    <Typography.Text>Цена печати</Typography.Text>
                    <Input value={extraDraft.printPrice} onChange={(e) => setExtraDraft((d) => ({ ...d, printPrice: e.target.value }))} disabled={!canEdit} />
                  </div>
                  <div>
                    <Typography.Text>Монтаж</Typography.Text>
                    <Input value={extraDraft.installPrice} onChange={(e) => setExtraDraft((d) => ({ ...d, installPrice: e.target.value }))} disabled={!canEdit} />
                  </div>
                  <div>
                    <Typography.Text>Доп. монтаж</Typography.Text>
                    <Input
                      value={extraDraft.AdditionalInstallPrice}
                      onChange={(e) => setExtraDraft((d) => ({ ...d, AdditionalInstallPrice: e.target.value }))}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              ),
            },
          ]}
        />

        <Form.Item>
          <Button
            type="primary"
            disabled={
              !canEdit ||
              session.isLoading ||
              !form.title ||
              !form.pricePerWeek ||
              billboards.isSaving
            }
            loading={billboards.isSaving}
            onClick={async () => {
              const extraFields: Record<string, unknown> = {}
              Object.entries(extraDraft).forEach(([k, v]) => {
                const trimmed = v.trim()
                if (!trimmed) return
                if (k === 'Status') {
                  const parsed = parseStatusToAvailable(trimmed)
                  extraFields[k] = parsed !== null ? parsed : trimmed
                  return
                }
                extraFields[k] = trimmed
              })

              let availableFlag = form.available
              const statusAvailable = parseStatusToAvailable(extraFields.Status)
              if (statusAvailable !== null) {
                availableFlag = statusAvailable
              }
              if (!('Status' in extraFields)) {
                extraFields.Status = availableFlag
              }

              await billboards.add({
                ...form,
                available: availableFlag,
                extraFields: Object.keys(extraFields).length ? extraFields : undefined,
              })
              if (billboards.lastError) {
                notifyError('Ошибка сохранения', billboards.lastError)
                return
              }
              notifySuccess('Конструкция добавлена')
              setForm(emptyForm)
              setExtraDraft({
                GRP: '',
                OTS: '',
                Tax: '',
                Side: '',
                city: '',
                ESPAR: '',
                Light: '',
                Photo: '',
                Status: '',
                Material: '',
                specPrice: '',
                printPrice: '',
                installPrice: '',
                AdditionalInstallPrice: '',
              })
              setCoordsPasteDraft('')
              lastGeocodedAddressRef.current = ''
              setGeoHint(null)
            }}
          >
            Добавить конструкцию
          </Button>
        </Form.Item>
      </Form>

      {billboards.lastError ? (
        <Typography.Paragraph type="danger" style={{ marginTop: 12 }}>
          {billboards.lastError}
        </Typography.Paragraph>
      ) : null}
        </Card>

        <Card variant="borderless" styles={{ root: { boxShadow: 'none' } }}>
          <div ref={mapSectionRef}>
            <YandexMap
              items={displayedBillboards}
              focusBillboardId={mapFocusBillboardId}
              placementClearNonce={mapPlacementNonce}
              clickToCreate={
                canEdit && yandexKey
                  ? {
                      enabled: true,
                      onPlaced: ({ lat, lng, address }) => {
                        setMapPickDraft({
                          ...emptyForm,
                          lat,
                          lng,
                          address: address || '',
                        })
                        setMapPickModalOpen(true)
                      },
                    }
                  : undefined
              }
            />
          </div>
        </Card>

        <Card>
          <div style={{ marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <Space wrap size={12} style={{ flex: 1, alignItems: 'center' }}>
              <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)} optionType="button" buttonStyle="solid">
                <Radio.Button value="cards">
                  <AppstoreOutlined style={{ marginRight: 6 }} />
                  Карточки
                </Radio.Button>
                <Radio.Button value="list">
                  <UnorderedListOutlined style={{ marginRight: 6 }} />
                  Список
                </Radio.Button>
              </Radio.Group>
              <Input.Search
                allowClear
                placeholder="Поиск по всем полям…"
                value={billboardSearchQuery}
                onChange={(e) => setBillboardSearchQuery(e.target.value)}
                style={{ width: 'min(100%, 360px)' }}
              />
            </Space>

            <Space size={4} align="center">
              <Popover
                trigger="click"
                placement="bottomRight"
                title="Фильтры и сортировка"
                content={
                  <div style={{ width: 300, maxWidth: 'min(92vw, 360px)' }}>
                    <Space orientation="vertical" size={14} style={{ width: '100%' }}>
                      {priceExtent && priceExtent.min < priceExtent.max ? (
                        <div>
                          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                            Цена (₽/мес.): {sliderDisplayValue[0].toLocaleString('ru-RU')} —{' '}
                            {sliderDisplayValue[1].toLocaleString('ru-RU')}
                          </Typography.Text>
                          <Slider
                            range
                            min={priceExtent.min}
                            max={priceExtent.max}
                            value={sliderDisplayValue}
                            onChange={(v) => setPriceSliderDraft(v as [number, number])}
                            onAfterChange={(v) => {
                              setPriceSliderDraft(null)
                              if (!priceExtent) return
                              const tuple = v as [number, number]
                              const [lo, hi] = tuple
                              if (lo <= priceExtent.min && hi >= priceExtent.max) {
                                setPriceRange(null)
                              } else {
                                setPriceRange(tuple)
                              }
                            }}
                            tooltip={{ formatter: (v) => (v != null ? `${Number(v).toLocaleString('ru-RU')} ₽` : '') }}
                          />
                        </div>
                      ) : priceExtent ? (
                        <Typography.Text type="secondary">
                          Цена (₽/мес.): {priceExtent.min.toLocaleString('ru-RU')}
                        </Typography.Text>
                      ) : null}
                      <div style={{ width: '100%' }}>
                        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>
                          Сортировка по цене
                        </Typography.Text>
                        <Select
                          value={priceSort}
                          onChange={(v) => setPriceSort(v)}
                          style={{ width: '100%' }}
                          options={[
                            { value: 'none', label: 'Без сортировки' },
                            { value: 'asc', label: 'По возрастанию' },
                            { value: 'desc', label: 'По убыванию' },
                          ]}
                          getPopupContainer={(n) => n.parentElement ?? document.body}
                        />
                      </div>
                    </Space>
                  </div>
                }
              >
                <Button
                  type="text"
                  className="app-map-focus-btn"
                  icon={
                    adminFiltersPopoverActive ? (
                      <FilterFilled style={{ color: 'var(--color-focus)' }} />
                    ) : (
                      <FilterOutlined />
                    )
                  }
                  aria-label="Фильтры и сортировка"
                />
              </Popover>
              <Button
                className="app-delete-btn"
                icon={<DeleteOutlined />}
                loading={isDeletingAll || billboards.isSaving}
                disabled={!canEdit || billboards.isSaving || isDeletingAll || !billboards.items.length}
                onClick={() => void confirmAndDeleteAll()}
                aria-label="Удалить все"
              />
            </Space>
          </div>

          {billboardSearchQuery.trim() && searchFilteredBillboards.length === 0 && !editingBillboardId ? (
            <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
              Ничего не найдено — попробуйте другой запрос.
            </Typography.Paragraph>
          ) : null}

          {viewMode === 'cards' ? (
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              {displayedBillboards.map((item) => (
                <Col key={item.id} xs={24} sm={12} md={12} lg={8} xl={8}>
                  <Card className="app-billboard-card">
                    <div style={{ position: 'absolute', right: 20, top: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <BillboardPhotoIconButton
                        url={
                          editingBillboardId === item.id
                            ? (editExtraDraft.Photo ?? '').trim()
                            : getPhotoUrl(item.extraFields as Record<string, unknown>)
                        }
                        onOpenModal={setPhotoModalUrl}
                      />
                      <Button
                        type="text"
                        className="app-map-focus-btn"
                        icon={<GlobalOutlined />}
                        aria-label="На карте"
                        onClick={() => {
                          setMapFocusBillboardId(item.id)
                          mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }}
                      />
                      <Button
                        type="text"
                        className="app-map-focus-btn"
                        icon={editingBillboardId === item.id ? <EditFilled /> : <EditOutlined />}
                        aria-label={editingBillboardId === item.id ? 'Завершить редактирование' : 'Редактировать'}
                        onClick={() => {
                          if (editingBillboardId === item.id) cancelEdit()
                          else beginEdit(item)
                        }}
                      />
                      <Button
                        disabled={!canEdit || session.isLoading || billboards.isSaving}
                        className="app-delete-btn"
                        onClick={() => {
                          void confirmAndDelete(item.id)
                        }}
                        aria-label="Удалить"
                      >
                        <DeleteOutlined />
                      </Button>
                    </div>
                    {editingBillboardId === item.id ? (
                      <Space orientation="vertical" size={5} style={{ width: '100%' }}>
                        <Input
                          placeholder="Заголовок"
                          value={editTitleDraft}
                          onChange={(e) => setEditTitleDraft(e.target.value)}
                          disabled={!canEdit || billboards.isSaving || session.isLoading}
                        />

                        <Input.TextArea
                          placeholder="Описание"
                          value={editDescriptionDraft}
                          onChange={(e) => setEditDescriptionDraft(e.target.value)}
                          disabled={!canEdit || billboards.isSaving || session.isLoading}
                          rows={3}
                          maxLength={2000}
                          showCount
                        />

                        <Space orientation="horizontal" size={5} style={{ width: '100%' }}>
                          <Select<Billboard['type']>
                            value={editTypeDraft}
                            onChange={(v) => setEditTypeDraft(v)}
                            disabled={!canEdit || billboards.isSaving || session.isLoading}
                            style={{ flex: 1 }}
                          >
                            <Select.Option value="billboard">Билборд</Select.Option>
                            <Select.Option value="cityboard">Ситиборд</Select.Option>
                            <Select.Option value="supersite">Суперсайт</Select.Option>
                            <Select.Option value="digital">Digital экран</Select.Option>
                          </Select>
                          <Input
                            placeholder="Размер"
                            value={editSizeDraft}
                            onChange={(e) => setEditSizeDraft(e.target.value)}
                            disabled={!canEdit || billboards.isSaving || session.isLoading}
                            style={{ flex: 1 }}
                          />
                        </Space>

                        <Input
                          placeholder="Адрес"
                          value={editAddressDraft}
                          onChange={(e) => setEditAddressDraft(e.target.value)}
                          disabled={!canEdit || billboards.isSaving || session.isLoading}
                        />

                        <InputNumber
                          placeholder="Цена за неделю"
                          value={editPriceDraft}
                          onChange={(v) => setEditPriceDraft(v ?? 0)}
                          disabled={!canEdit || billboards.isSaving || session.isLoading}
                          style={{ width: '100%' }}
                          min={0}
                        />

                        <Space orientation="horizontal" size={5} style={{ width: '100%' }}>
                          <InputNumber
                            placeholder="Широта"
                            value={editLatDraft}
                            onChange={(v) => setEditLatDraft(v ?? 0)}
                            onBlur={() => void tryFillEditAddressFromCoords(editLatDraft, editLngDraft)}
                            disabled={!canEdit || billboards.isSaving || session.isLoading}
                            style={{ flex: 1 }}
                          />
                          <InputNumber
                            placeholder="Долгота"
                            value={editLngDraft}
                            onChange={(v) => setEditLngDraft(v ?? 0)}
                            onBlur={() => void tryFillEditAddressFromCoords(editLatDraft, editLngDraft)}
                            disabled={!canEdit || billboards.isSaving || session.isLoading}
                            style={{ flex: 1 }}
                          />
                        </Space>

                        <Select
                          value={editStatusAvailableDraft ? 'available' : 'unavailable'}
                          onChange={(v) => setEditStatusAvailableDraft(v === 'available')}
                          disabled={!canEdit || billboards.isSaving || session.isLoading}
                          style={{ width: '100%' }}
                          options={[
                            { value: 'available', label: 'Доступен' },
                            { value: 'unavailable', label: 'Недоступен' },
                          ]}
                        />

                        <>
                          <Divider className="marketplace-status-divider" />
                          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                            Подробнее
                          </Typography.Paragraph>
                          <Space orientation="vertical" size={5} style={{ width: '100%' }}>
                            {Object.keys(editExtraDraft)
                              .filter((k) => !extraFieldsHiddenKeys.includes(k) && k !== 'Status')
                              .sort()
                              .map((k) => (
                                <Input
                                  key={k}
                                  placeholder={formatExtraField(k, '').label}
                                  value={editExtraDraft[k] ?? ''}
                                  onChange={(e) => setEditExtraDraft((prev) => ({ ...prev, [k]: e.target.value }))}
                                  disabled={!canEdit || billboards.isSaving || session.isLoading}
                                />
                              ))}
                          </Space>
                        </>

                        {billboards.lastError && editingBillboardId === item.id ? (
                          <Typography.Paragraph type="danger" style={{ margin: 0 }}>
                            {billboards.lastError}
                          </Typography.Paragraph>
                        ) : null}

                        <Space orientation="horizontal" size={5}>
                          <Button
                            type="primary"
                            disabled={!canEdit || session.isLoading || billboards.isSaving}
                            loading={billboards.isSaving}
                            onClick={() => void saveEdit(item)}
                          >
                            Сохранить
                          </Button>
                          <Button onClick={cancelEdit} disabled={billboards.isSaving}>
                            Отменить
                          </Button>
                        </Space>
                      </Space>
                    ) : (
                      <>
                        <Typography.Title level={5} style={{ marginTop: 0 }}>
                          {item.title}
                        </Typography.Title>
                        {item.description?.trim() ? (
                          <Typography.Paragraph style={{ marginBottom: 8 }}>{item.description.trim()}</Typography.Paragraph>
                        ) : null}
                        <Typography.Paragraph>
                          {item.type} · {item.size}
                        </Typography.Paragraph>
                        <Typography.Paragraph>{item.address}</Typography.Paragraph>
                        <Typography.Paragraph>
                          Цена: {item.pricePerWeek.toLocaleString('ru-RU')} руб / месяц
                        </Typography.Paragraph>
                        <Typography.Paragraph>
                          Локация: {item.lat}, {item.lng}
                        </Typography.Paragraph>
                        {(() => {
                          const statusAvailable = parseStatusToAvailable(item.extraFields?.Status)
                          const isAvailable = statusAvailable ?? item.available
                          return (
                            <div style={{ marginBottom: 12, fontSize: 18, lineHeight: 1 }}>
                              {isAvailable ? (
                                <CheckCircleOutlined style={{ color: '#52c41a' }} aria-label="Доступен" />
                              ) : (
                                <CloseCircleOutlined style={{ color: '#ff4d4f' }} aria-label="Недоступен" />
                              )}
                            </div>
                          )
                        })()}

                        {(() => {
                          const detailEntriesForView = Object.entries(item.extraFields ?? {}).filter(
                            ([k]) =>
                              !extraFieldsHiddenKeys.includes(k) && k !== 'Photo' && k !== 'Status',
                          )
                          const hasDetailRows = detailEntriesForView.length > 0
                          const showDetailsCollapse = hasDetailRows || canEdit

                          if (!showDetailsCollapse) return null

                          return (
                            <>
                              {activeExtraBillboardId === item.id ? null : (
                                <Divider className="marketplace-status-divider" />
                              )}
                              <Collapse
                                className="marketplace-extra-collapse"
                                activeKey={activeExtraBillboardId === item.id ? ['extra'] : []}
                                onChange={(keys) => {
                                  const arr = Array.isArray(keys) ? keys : [keys]
                                  setActiveExtraBillboardId(arr.length ? item.id : null)
                                }}
                                items={[
                                  {
                                    key: 'extra',
                                    label: 'Подробнее',
                                    children: (
                                      <div>
                                        {!hasDetailRows ? (
                                          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                                            Дополнительные поля не заполнены. Нажмите «Редактировать карточку», чтобы внести
                                            данные в раздел «Подробнее».
                                          </Typography.Text>
                                        ) : (
                                          detailEntriesForView.map(([k, v]) => {
                                            const formatted = formatExtraField(k, v)
                                            return (
                                              <Typography.Paragraph key={k} style={{ margin: '0 0 5px 0' }}>
                                                {formatted.label}: {formatted.value || '—'}
                                              </Typography.Paragraph>
                                            )
                                          })
                                        )}
                                      </div>
                                    ),
                                  },
                                ]}
                              />
                            </>
                          )
                        })()}
                      </>
                    )}
              </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <Table
              rowKey="id"
              style={{ marginTop: 16 }}
              pagination={{ pageSize: 20 }}
              dataSource={displayedBillboards}
              scroll={editingBillboardId ? { x: 'max-content' } : undefined}
              onRow={(record) => ({
                className: editingBillboardId === record.id ? 'admin-billboard-table-row--editing' : undefined,
              })}
              columns={[
                {
                  title: 'Конструкция',
                  key: 'title',
                  width: editingBillboardId ? 280 : undefined,
                  render: (_: unknown, item: Billboard) =>
                    editingBillboardId === item.id ? (
                      <Space orientation="vertical" size={4} style={{ width: '100%', minWidth: 260 }}>
                        <Input
                          value={editTitleDraft}
                          onChange={(e) => setEditTitleDraft(e.target.value)}
                          placeholder="Заголовок"
                          disabled={!canEdit || billboards.isSaving || session.isLoading}
                        />
                        <Select<Billboard['type']>
                          value={editTypeDraft}
                          onChange={(v) => setEditTypeDraft(v)}
                          disabled={!canEdit || billboards.isSaving || session.isLoading}
                          style={{ width: '100%' }}
                        >
                          <Select.Option value="billboard">Билборд</Select.Option>
                          <Select.Option value="cityboard">Ситиборд</Select.Option>
                          <Select.Option value="supersite">Суперсайт</Select.Option>
                          <Select.Option value="digital">Digital экран</Select.Option>
                        </Select>
                        <Input
                          value={editSizeDraft}
                          onChange={(e) => setEditSizeDraft(e.target.value)}
                          placeholder="Размер"
                          disabled={!canEdit || billboards.isSaving || session.isLoading}
                        />
                        <Space.Compact style={{ width: '100%' }}>
                          <InputNumber
                            placeholder="Широта"
                            value={editLatDraft}
                            onChange={(v) => setEditLatDraft(v ?? 0)}
                            onBlur={() => void tryFillEditAddressFromCoords(editLatDraft, editLngDraft)}
                            disabled={!canEdit || billboards.isSaving || session.isLoading}
                            style={{ width: '50%' }}
                          />
                          <InputNumber
                            placeholder="Долгота"
                            value={editLngDraft}
                            onChange={(v) => setEditLngDraft(v ?? 0)}
                            onBlur={() => void tryFillEditAddressFromCoords(editLatDraft, editLngDraft)}
                            disabled={!canEdit || billboards.isSaving || session.isLoading}
                            style={{ width: '50%' }}
                          />
                        </Space.Compact>
                      </Space>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                        <div style={{ color: 'rgba(0,0,0,0.6)', fontSize: 12 }}>
                          {item.type} · {item.size}
                        </div>
                      </div>
                    ),
                },
                {
                  title: 'Описание',
                  key: 'description',
                  width: editingBillboardId ? 360 : 320,
                  ellipsis: !editingBillboardId,
                  render: (_: unknown, item: Billboard) =>
                    editingBillboardId === item.id ? (
                      <Input.TextArea
                        value={editDescriptionDraft}
                        onChange={(e) => setEditDescriptionDraft(e.target.value)}
                        placeholder="Описание"
                        disabled={!canEdit || billboards.isSaving || session.isLoading}
                        rows={3}
                        maxLength={2000}
                        style={{ minWidth: 320 }}
                      />
                    ) : (
                      <span title={item.description?.trim() || undefined}>{item.description?.trim() || '—'}</span>
                    ),
                },
                {
                  title: 'Адрес',
                  key: 'address',
                  width: editingBillboardId ? 260 : undefined,
                  ellipsis: !editingBillboardId,
                  render: (_: unknown, item: Billboard) =>
                    editingBillboardId === item.id ? (
                      <Input
                        value={editAddressDraft}
                        onChange={(e) => setEditAddressDraft(e.target.value)}
                        placeholder="Адрес"
                        disabled={!canEdit || billboards.isSaving || session.isLoading}
                        style={{ minWidth: 240 }}
                      />
                    ) : (
                      <span>{item.address?.trim() || '—'}</span>
                    ),
                },
                {
                  title: 'Цена',
                  key: 'price',
                  width: editingBillboardId ? 152 : undefined,
                  render: (_: unknown, item: Billboard) =>
                    editingBillboardId === item.id ? (
                      <InputNumber
                        value={editPriceDraft}
                        onChange={(v) => setEditPriceDraft(v ?? 0)}
                        min={0}
                        style={{ width: '100%', minWidth: 136 }}
                        disabled={!canEdit || billboards.isSaving || session.isLoading}
                      />
                    ) : (
                      <span>{item.pricePerWeek.toLocaleString('ru-RU')} руб / месяц</span>
                    ),
                },
                {
                  title: 'Фото',
                  key: 'photo',
                  width: 72,
                  align: 'center' as const,
                  render: (_: unknown, item: Billboard) => (
                    <BillboardPhotoIconButton
                      url={
                        editingBillboardId === item.id
                          ? (editExtraDraft.Photo ?? '').trim()
                          : getPhotoUrl(item.extraFields as Record<string, unknown>)
                      }
                      onOpenModal={setPhotoModalUrl}
                    />
                  ),
                },
                {
                  title: 'Статус',
                  key: 'status',
                  width: editingBillboardId ? 148 : 120,
                  align: 'center' as const,
                  render: (_: unknown, item: Billboard) =>
                    editingBillboardId === item.id ? (
                      <Select
                        value={editStatusAvailableDraft ? 'available' : 'unavailable'}
                        onChange={(v) => setEditStatusAvailableDraft(v === 'available')}
                        disabled={!canEdit || billboards.isSaving || session.isLoading}
                        style={{ width: '100%', minWidth: 132 }}
                        options={[
                          { value: 'available', label: 'Доступен' },
                          { value: 'unavailable', label: 'Недоступен' },
                        ]}
                      />
                    ) : (() => {
                      const statusAvailable = parseStatusToAvailable(item.extraFields?.Status)
                      const isAvailable = statusAvailable ?? item.available
                      return (
                        <span style={{ fontSize: 18 }}>
                          {isAvailable ? (
                            <CheckCircleOutlined style={{ color: '#52c41a' }} aria-label="Доступен" />
                          ) : (
                            <CloseCircleOutlined style={{ color: '#ff4d4f' }} aria-label="Недоступен" />
                          )}
                        </span>
                      )
                    })(),
                },
                {
                  title: 'Инфо',
                  key: 'details',
                  width: editingBillboardId ? 340 : 72,
                  align: (editingBillboardId ? 'left' : 'center') as 'left' | 'center',
                  render: (_: unknown, item: Billboard) => {
                    if (editingBillboardId === item.id) {
                      const keys = Object.keys(editExtraDraft)
                        .filter((k) => !extraFieldsHiddenKeys.includes(k) && k !== 'Status')
                        .sort()
                      return (
                        <Space orientation="vertical" size={4} style={{ width: '100%', minWidth: 300, textAlign: 'left' }}>
                          {keys.map((k) => (
                            <Input
                              key={k}
                              value={editExtraDraft[k] ?? ''}
                              placeholder={formatExtraField(k, '').label}
                              onChange={(e) =>
                                setEditExtraDraft((prev) => ({
                                  ...prev,
                                  [k]: e.target.value,
                                }))
                              }
                              disabled={!canEdit || billboards.isSaving || session.isLoading}
                            />
                          ))}
                        </Space>
                      )
                    }

                    const extraEntries = Object.entries(item.extraFields ?? {}).filter(
                      ([k]) =>
                        !extraFieldsHiddenKeys.includes(k) && k !== 'Photo' && k !== 'Status',
                    )
                    const hasExtra = extraEntries.length > 0
                    const canOpenDetails = hasExtra || canEdit

                    return (
                      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                        <Dropdown
                          trigger={['click']}
                          disabled={!canOpenDetails}
                          menu={{
                            items: [
                              {
                                key: 'details',
                                label: (
                                  <div>
                                    {!hasExtra ? (
                                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                        Нет данных в «Подробнее». Включите «Редактировать», чтобы заполнить поля.
                                      </Typography.Text>
                                    ) : (
                                      extraEntries.map(([k, v]) => {
                                        const formatted = formatExtraField(k, v)
                                        return (
                                          <Typography.Paragraph
                                            key={k}
                                            style={{ margin: '0 0 6px 0', fontSize: 12, color: 'rgba(0,0,0,0.85)' }}
                                          >
                                            {formatted.label}: {formatted.value || '—'}
                                          </Typography.Paragraph>
                                        )
                                      })
                                    )}
                                  </div>
                                ),
                              },
                            ],
                          }}
                        >
                          <Button
                            type="text"
                            icon={<InfoCircleOutlined />}
                            aria-label="Инфо"
                            disabled={!canOpenDetails}
                          />
                        </Dropdown>
                      </div>
                    )
                  },
                },
                {
                  title: '',
                  key: 'actions',
                  width: editingBillboardId ? 108 : 88,
                  align: 'center' as const,
                  render: (_: unknown, item: Billboard) =>
                    editingBillboardId === item.id ? (
                      <Space size={8}>
                        <Button
                          type="primary"
                          icon={<CheckOutlined />}
                          aria-label="Сохранить"
                          loading={billboards.isSaving}
                          disabled={!canEdit || session.isLoading}
                          onClick={() => void saveEdit(item)}
                        />
                        <Button
                          icon={<CloseOutlined />}
                          aria-label="Отменить"
                          disabled={billboards.isSaving}
                          onClick={cancelEdit}
                        />
                      </Space>
                    ) : (
                      <Dropdown
                        trigger={['click']}
                        menu={{
                          items: [
                            {
                              key: 'on-map',
                              label: (
                                <Space size={8}>
                                  <GlobalOutlined />
                                  <span>На карте</span>
                                </Space>
                              ),
                              onClick: () => {
                                setMapFocusBillboardId(item.id)
                                mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              },
                            },
                            {
                              key: 'edit',
                              label: (
                                <Space size={8}>
                                  <EditOutlined />
                                  <span>Редактировать</span>
                                </Space>
                              ),
                              disabled: !canEdit || session.isLoading || billboards.isSaving,
                              onClick: () => {
                                beginEdit(item)
                              },
                            },
                            {
                              key: 'delete',
                              label: (
                                <Space size={8}>
                                  <DeleteOutlined />
                                  <span>Удалить</span>
                                </Space>
                              ),
                              onClick: () => {
                                void confirmAndDelete(item.id)
                              },
                            },
                          ],
                        }}
                      >
                        <Button
                          type="text"
                          icon={<EllipsisOutlined />}
                          aria-label="Действия"
                          disabled={!canEdit || session.isLoading || billboards.isSaving}
                        />
                      </Dropdown>
                    ),
                },
              ]}
            />
          )}
        </Card>
      </div>

      <Modal
        title="Новая конструкция по точке на карте"
        open={mapPickModalOpen}
        onCancel={closeMapPickModal}
        footer={null}
        destroyOnHidden
        width={560}
      >
        <Space orientation="vertical" size={10} style={{ width: '100%' }}>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
            Координаты с клика по карте; адрес, если есть, подставляется автоматически. Поле адреса необязательно — при
            сохранении без адреса он попробует определиться по координатам. Дозаполните поля и сохраните.
          </Typography.Paragraph>
          <Input
            placeholder="Заголовок (Gid / название)"
            value={mapPickDraft.title}
            onChange={(e) => setMapPickDraft((d) => ({ ...d, title: e.target.value }))}
            disabled={!canEdit || billboards.isSaving}
          />
          <Input.TextArea
            placeholder="Описание (необязательно)"
            value={mapPickDraft.description ?? ''}
            onChange={(e) => setMapPickDraft((d) => ({ ...d, description: e.target.value }))}
            disabled={!canEdit || billboards.isSaving}
            rows={2}
            maxLength={2000}
          />
          <Select<Billboard['type']>
            value={mapPickDraft.type}
            onChange={(v) => setMapPickDraft((d) => ({ ...d, type: v }))}
            disabled={!canEdit || billboards.isSaving}
            style={{ width: '100%' }}
          >
            <Select.Option value="billboard">Билборд</Select.Option>
            <Select.Option value="cityboard">Ситиборд</Select.Option>
            <Select.Option value="supersite">Суперсайт</Select.Option>
            <Select.Option value="digital">Digital экран</Select.Option>
          </Select>
          <Input
            placeholder="Размер (Format)"
            value={mapPickDraft.size}
            onChange={(e) => setMapPickDraft((d) => ({ ...d, size: e.target.value }))}
            disabled={!canEdit || billboards.isSaving}
          />
          <Input
            placeholder="Адрес (необязательно; при уходе с координат подставится)"
            value={mapPickDraft.address}
            onChange={(e) => setMapPickDraft((d) => ({ ...d, address: e.target.value }))}
            disabled={!canEdit || billboards.isSaving}
          />
          <Space.Compact style={{ width: '100%' }}>
            <InputNumber
              placeholder="Широта"
              value={mapPickDraft.lat}
              onChange={(v) => setMapPickDraft((d) => ({ ...d, lat: v ?? d.lat }))}
              onBlur={() => void tryFillMapPickAddressFromCoords(mapPickDraft.lat, mapPickDraft.lng)}
              disabled={!canEdit || billboards.isSaving}
              style={{ width: '50%' }}
            />
            <InputNumber
              placeholder="Долгота"
              value={mapPickDraft.lng}
              onChange={(v) => setMapPickDraft((d) => ({ ...d, lng: v ?? d.lng }))}
              onBlur={() => void tryFillMapPickAddressFromCoords(mapPickDraft.lat, mapPickDraft.lng)}
              disabled={!canEdit || billboards.isSaving}
              style={{ width: '50%' }}
            />
          </Space.Compact>
          <InputNumber
            placeholder="Цена за неделю (RUB)"
            value={mapPickDraft.pricePerWeek}
            onChange={(v) => setMapPickDraft((d) => ({ ...d, pricePerWeek: v ?? 0 }))}
            min={0}
            style={{ width: '100%' }}
            disabled={!canEdit || billboards.isSaving}
          />
          <Select
            value={mapPickDraft.available ? 'available' : 'unavailable'}
            onChange={(v) => setMapPickDraft((d) => ({ ...d, available: v === 'available' }))}
            disabled={!canEdit || billboards.isSaving}
            style={{ width: '100%' }}
            options={[
              { value: 'available', label: 'Доступен' },
              { value: 'unavailable', label: 'Недоступен' },
            ]}
          />
          <Space orientation="horizontal" size={8}>
            <Button type="primary" loading={billboards.isSaving} disabled={!canEdit} onClick={() => void submitMapPickDraft()}>
              Сохранить
            </Button>
            <Button disabled={billboards.isSaving} onClick={closeMapPickModal}>
              Отмена
            </Button>
          </Space>
        </Space>
      </Modal>

      <Modal
        open={!!photoModalUrl}
        title="Фото"
        footer={null}
        onCancel={() => setPhotoModalUrl(null)}
      >
        {photoModalUrl ? <ExternalImagePreview key={photoModalUrl} src={photoModalUrl} alt="Фото" /> : null}
      </Modal>
    </>
  )
})
