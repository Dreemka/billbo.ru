import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState } from 'react'
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Spin, Typography } from 'antd'
import { useStore } from '../../app/store/rootStore'
import type { Billboard } from '../../entities/types'
import { tryParseLatLngFromText } from '../../shared/lib/parseCoords'
import { geocodeAddressToLatLng } from '../../shared/lib/yandexGeocode'
import { getYandexMapsApiKey } from '../../shared/lib/yandexMapsLoader'

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

  useEffect(() => {
    if (session.role !== 'admin') return
    void billboards.load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.role])

  return (
    <Card>
      <Typography.Title level={4}>Рекламные элементы компании</Typography.Title>
      <Typography.Paragraph>
        Добавляйте, обновляйте и удаляйте карточки конструкций, доступных для аренды.
      </Typography.Paragraph>

      <Form layout="vertical">
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
              await billboards.add(form)
              setForm(emptyForm)
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
                Статус: {item.available ? 'Доступен' : 'Забронирован'}
              </Typography.Text>

              <Space style={{ marginTop: 12 }}>
                <Button
                  danger
                  disabled={!canEdit || session.isLoading || billboards.isSaving}
                  onClick={() => void billboards.remove(item.id)}
                >
                  Удалить
                </Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  )
})
