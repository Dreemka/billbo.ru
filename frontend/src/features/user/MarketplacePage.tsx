import { Alert, Button, Card, Col, Collapse, Row, Space, Tag, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'

import { YandexMap } from './YandexMap'
import { formatExtraField } from '../../shared/lib/formatExtraField'
import { observer } from 'mobx-react-lite'
import { useStore } from '../../app/store/rootStore'

export const MarketplacePage = observer(function MarketplacePage() {
  const { billboards, user, session } = useStore()
  const canBuy = session.role === 'user'
  const [message, setMessage] = useState('')
  const [mapFocusBillboardId, setMapFocusBillboardId] = useState<string | null>(null)
  const mapSectionRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    void billboards.load()
    void user.loadWallet()
  }, [billboards, user])

  return (
    <Card>
      <Typography.Title level={4}>Маркетплейс рекламных поверхностей</Typography.Title>
      <Typography.Paragraph>
        Здесь клиент видит доступные элементы, их стоимость, статус и положение на карте.
      </Typography.Paragraph>

      <div ref={mapSectionRef}>
        <YandexMap items={billboards.items} focusBillboardId={mapFocusBillboardId} />
      </div>

      {message ? <Alert type="info" showIcon message={message} /> : null}
      {billboards.lastError ? (
        <Alert type="error" showIcon message={billboards.lastError} style={{ marginTop: 12 }} />
      ) : null}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {billboards.items.map((item) => (
          <Col key={item.id} xs={24} sm={12} md={12} lg={8} xl={8}>
            <Card>
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                {item.title}
              </Typography.Title>

              <Typography.Paragraph>{item.address}</Typography.Paragraph>
              <Typography.Paragraph>
                {item.type} · {item.size}
              </Typography.Paragraph>
              <Typography.Paragraph>
                Координаты: {item.lat}, {item.lng}
              </Typography.Paragraph>
              <Typography.Paragraph>
                Стоимость: {item.pricePerWeek.toLocaleString('ru-RU')} RUB / неделя
              </Typography.Paragraph>

              <Space align="center" style={{ marginBottom: 12 }}>
                <Tag color={item.available ? 'green' : 'red'}>
                  Статус: {item.available ? 'Доступен' : 'Недоступен'}
                </Tag>
              </Space>

              {item.extraFields ? (
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

              <Space direction="vertical" size={5}>
                <Button
                  onClick={() => {
                    setMapFocusBillboardId(item.id)
                    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  На карте
                </Button>

                <Button
                  type="primary"
                  disabled={!canBuy || session.isLoading || !item.available}
                  onClick={async () => {
                    const ok = user.pay(item.pricePerWeek)
                    if (!ok) {
                      setMessage('Недостаточно средств в кошельке.')
                      return
                    }
                    await billboards.reserve(item.id)
                    setMessage(`Конструкция "${item.title}" успешно забронирована.`)
                  }}
                >
                  Забронировать и оплатить
                </Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  )
})
