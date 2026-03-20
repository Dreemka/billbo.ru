import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState } from 'react'
import { AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Col, Collapse, Form, Input, InputNumber, Radio, Row, Select, Space, Spin, Table, Typography } from 'antd'
import { useStore } from '../../app/store/rootStore'
import type { Billboard } from '../../entities/types'
import { tryParseLatLngFromText } from '../../shared/lib/parseCoords'
import { parseCsv } from '../../shared/lib/parseCsv'
import { geocodeAddressToLatLng } from '../../shared/lib/yandexGeocode'
import { getYandexMapsApiKey } from '../../shared/lib/yandexMapsLoader'
import { formatExtraField } from '../../shared/lib/formatExtraField'
import { notifyError, notifySuccess } from '../../shared/lib/notify'
import { parseStatusToAvailable } from '../../shared/lib/parseStatusToAvailable'

const emptyForm: Omit<Billboard, 'id'> = {
  title: '',
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

  function applyParsedCoords(text: string): boolean {
    const parsed = tryParseLatLngFromText(text)
    if (!parsed) return false
    setForm((f) => ({ ...f, lat: parsed.lat, lng: parsed.lng }))
    setCoordsPasteDraft('')
    setGeoHint(null)
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

    return {
      title,
      type,
      address,
      lat: coordsParsed.lat,
      lng: coordsParsed.lng,
      pricePerWeek: Math.round(pricePerWeek),
      size,
      available,
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

  useEffect(() => {
    if (session.role !== 'admin') return
    void billboards.load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.role])

  return (
    <>
      <Typography.Title level={4}>Рекламные элементы компании</Typography.Title>
      <Typography.Paragraph>
        Добавляйте, обновляйте и удаляйте карточки конструкций, доступных для аренды.
      </Typography.Paragraph>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <Card type="inner" title="Импорт CSV" loading={csvParsing}>
        <Space orientation="vertical" style={{ width: '100%' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0]
              if (!file) return
              void onCsvFileSelected(file)
              // allow selecting the same file again
              e.currentTarget.value = ''
            }}
            disabled={!canEdit || billboards.isSaving}
          />

          {csvSurfaces.length ? (
            <Alert
              type="success"
              showIcon
              message={`Распознано строк: ${csvSurfaces.length}`}
              style={{ padding: 0 }}
            />
          ) : null}

          {csvError ? <Alert type="error" showIcon message={csvError} style={{ padding: 0 }} /> : null}

          {csvSurfaces.length ? (
            <Space orientation="vertical" size={5} style={{ width: '100%' }}>
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
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
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
                  geoHint.includes('обновлены')
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
                При уходе с поля адреса координаты подставятся автоматически (нужен ключ API Яндекс.Карт).
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
              placeholder="Например: Москва, Ленинский проспект, 1"
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
              disabled={!canEdit}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="Долгота" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
            <InputNumber
              value={form.lng}
              onChange={(value) => setForm({ ...form, lng: value ?? 0 })}
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
              !form.address ||
              !form.pricePerWeek ||
              billboards.isSaving
            }
            loading={billboards.isSaving}
            onClick={async () => {
              const extraFields: Record<string, string> = {}
              Object.entries(extraDraft).forEach(([k, v]) => {
                if (v.trim()) extraFields[k] = v.trim()
              })

              // Доступность определяется полем `Status` (если оно заполнено).
              const statusAvailable = parseStatusToAvailable(extraFields.Status)
              if (statusAvailable !== null) {
                form.available = statusAvailable
              }
              // Если статус не заполнен — подставляем из `available`, чтобы в карточке был единый источник.
              if (!extraFields.Status) {
                extraFields.Status = form.available ? 'Доступен' : 'Недоступен'
              }

              await billboards.add({
                ...form,
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

        <Card>
          <div style={{ marginTop: 0 }}>
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
          </div>

          {viewMode === 'cards' ? (
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              {billboards.items.map((item) => (
                <Col key={item.id} xs={24} sm={12} md={12} lg={8} xl={8}>
                  <Card>
                <Typography.Title level={5} style={{ marginTop: 0 }}>
                  {item.title}
                </Typography.Title>
                <Typography.Paragraph>
                  {item.type} · {item.size}
                </Typography.Paragraph>
                <Typography.Paragraph>{item.address}</Typography.Paragraph>
                <Typography.Paragraph>
                  Цена: {item.pricePerWeek.toLocaleString('ru-RU')} RUB / неделя
                </Typography.Paragraph>
                <Typography.Paragraph>
                  Локация: {item.lat}, {item.lng}
                </Typography.Paragraph>
                <Typography.Text>
                Статус:{' '}
                {(() => {
                  const statusAvailable = parseStatusToAvailable(item.extraFields?.Status)
                  const isAvailable = statusAvailable ?? item.available
                  return isAvailable ? 'Доступен' : 'Забронирован'
                })()}
                </Typography.Text>

                {item.extraFields && Object.keys(item.extraFields).length > 0 ? (
                  <Collapse
                    style={{ marginTop: 5, marginBottom: 5 }}
                    items={[
                      {
                        key: 'extra',
                        label: 'Дополнительная информация',
                        children: (
                          <div>
                            {Object.entries(item.extraFields)
                              .filter(([k]) => !['Gid', 'Format', 'Dinamic', 'address', 'Price', 'available', 'Coordinate'].includes(k))
                              .map(([k, v]) => {
                                const formatted = formatExtraField(k, v)
                                return (
                                  <Typography.Paragraph key={k} style={{ margin: '0 0 5px 0', fontSize: 12 }}>
                                    {formatted.label}: {formatted.value}
                                  </Typography.Paragraph>
                                )
                              })}
                          </div>
                        ),
                      },
                    ]}
                  />
                ) : null}

                <Space style={{ marginTop: 5 }}>
                  <Button
                    danger
                    disabled={!canEdit || session.isLoading || billboards.isSaving}
                    onClick={async () => {
                      await billboards.remove(item.id)
                      if (billboards.lastError) {
                        notifyError('Ошибка удаления', billboards.lastError)
                        return
                      }
                      notifySuccess('Конструкция удалена')
                    }}
                  >
                    Удалить
                  </Button>
                </Space>
              </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <Table
              rowKey="id"
              style={{ marginTop: 16 }}
              pagination={{ pageSize: 20 }}
              dataSource={billboards.items}
              columns={[
                {
                  title: 'Конструкция',
                  key: 'title',
                  render: (_: unknown, item: Billboard) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.title}</div>
                      <div style={{ color: 'rgba(0,0,0,0.6)', fontSize: 12 }}>
                        {item.type} · {item.size}
                      </div>
                    </div>
                  ),
                },
                {
                  title: 'Адрес',
                  key: 'address',
                  render: (_: unknown, item: Billboard) => <span>{item.address}</span>,
                },
                {
                  title: 'Цена',
                  key: 'price',
                  render: (_: unknown, item: Billboard) => (
                    <span>{item.pricePerWeek.toLocaleString('ru-RU')} RUB / неделя</span>
                  ),
                },
                {
                  title: 'Статус',
                  key: 'status',
                  render: (_: unknown, item: Billboard) => (
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <Typography.Text style={{ marginRight: 8 }}>
                        {(() => {
                          const statusAvailable = parseStatusToAvailable(item.extraFields?.Status)
                          const isAvailable = statusAvailable ?? item.available
                          return isAvailable ? 'Доступен' : 'Забронирован'
                        })()}
                      </Typography.Text>
                    </span>
                  ),
                },
                {
                  title: 'Действия',
                  key: 'actions',
                  render: (_: unknown, item: Billboard) => (
                    <Button
                      danger
                      disabled={!canEdit || session.isLoading || billboards.isSaving}
                      onClick={async () => {
                        await billboards.remove(item.id)
                        if (billboards.lastError) {
                          notifyError('Ошибка удаления', billboards.lastError)
                          return
                        }
                        notifySuccess('Конструкция удалена')
                      }}
                    >
                      Удалить
                    </Button>
                  ),
                },
              ]}
            />
          )}
        </Card>
      </div>
    </>
  )
})
