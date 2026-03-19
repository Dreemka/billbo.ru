import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Typography } from 'antd'
import { useStore } from '../../app/store/rootStore'
import type { Billboard } from '../../entities/types'

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
  const canEdit = session.role === 'admin'

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

        <Form.Item label="Адрес">
          <Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} disabled={!canEdit} />
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
