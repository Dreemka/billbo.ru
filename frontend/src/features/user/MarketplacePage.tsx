import { Alert, Button, Card, Col, Collapse, Radio, Row, Space, Tag, Table, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'

import { YandexMap } from './YandexMap'
import { formatExtraField } from '../../shared/lib/formatExtraField'
import { observer } from 'mobx-react-lite'
import { useStore } from '../../app/store/rootStore'
import { notifyError, notifySuccess } from '../../shared/lib/notify'
import { AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { parseStatusToAvailable } from '../../shared/lib/parseStatusToAvailable'

export const MarketplacePage = observer(function MarketplacePage() {
  const { billboards, user, session } = useStore()
  const canBuy = session.role === 'user'
  const [message, setMessage] = useState('')
  const [mapFocusBillboardId, setMapFocusBillboardId] = useState<string | null>(null)
  const mapSectionRef = useRef<HTMLDivElement | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')

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

      <div style={{ marginTop: 16 }}>
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

              {(() => {
                const statusAvailable = parseStatusToAvailable(item.extraFields?.Status)
                const isAvailable = statusAvailable ?? item.available
                return (
                  <Space align="center" style={{ marginBottom: 12 }}>
                    <Tag color={isAvailable ? 'green' : 'red'}>Статус: {isAvailable ? 'Доступен' : 'Недоступен'}</Tag>
                  </Space>
                )
              })()}

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

                <Space orientation="vertical" size={5}>
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
                    disabled={!canBuy || session.isLoading || !(() => {
                      const statusAvailable = parseStatusToAvailable(item.extraFields?.Status)
                      return (statusAvailable ?? item.available) === true
                    })()}
                    onClick={async () => {
                      const ok = user.pay(item.pricePerWeek)
                      if (!ok) {
                        setMessage('Недостаточно средств в кошельке.')
                        return
                      }
                      await billboards.reserve(item.id)
                      if (billboards.lastError) {
                        notifyError('Ошибка бронирования', billboards.lastError)
                        setMessage(`Не удалось забронировать: ${billboards.lastError}`)
                        return
                      }
                      notifySuccess('Бронирование успешно', `Конструкция "${item.title}" забронирована`)
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
      ) : (
        <Table
          rowKey="id"
          style={{ marginTop: 16 }}
          pagination={{ pageSize: 20 }}
          dataSource={billboards.items}
          columns={[
            {
              title: 'Конструкция',
              dataIndex: 'title',
              key: 'title',
              render: (_value, item) => (
                <div>
                  <div style={{ fontWeight: 600 }}>{item.title}</div>
                  <div style={{ color: 'rgba(0,0,0,0.6)', fontSize: 12 }}>
                    {item.type} · {item.size}
                  </div>
                </div>
              ),
            },
            { title: 'Адрес', dataIndex: 'address', key: 'address' },
            {
              title: 'Цена',
              key: 'price',
              render: (_value, item) => `${item.pricePerWeek.toLocaleString('ru-RU')} RUB / неделя`,
            },
            {
              title: 'Статус',
              key: 'status',
              render: (_value, item) => (
                <Tag
                  color={
                    (parseStatusToAvailable(item.extraFields?.Status) ?? item.available) ? 'green' : 'red'
                  }
                >
                  {(parseStatusToAvailable(item.extraFields?.Status) ?? item.available) ? 'Доступен' : 'Недоступен'}
                </Tag>
              ),
            },
            {
              title: 'Действия',
              key: 'actions',
              render: (_value, item) => (
                <Space orientation="vertical" size={5}>
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
                    disabled={!canBuy || session.isLoading || !((parseStatusToAvailable(item.extraFields?.Status) ?? item.available) === true)}
                    onClick={async () => {
                      const ok = user.pay(item.pricePerWeek)
                      if (!ok) {
                        setMessage('Недостаточно средств в кошельке.')
                        return
                      }
                      await billboards.reserve(item.id)
                      if (billboards.lastError) {
                        notifyError('Ошибка бронирования', billboards.lastError)
                        setMessage(`Не удалось забронировать: ${billboards.lastError}`)
                        return
                      }
                      notifySuccess('Бронирование успешно', `Конструкция "${item.title}" забронирована`)
                      setMessage(`Конструкция "${item.title}" успешно забронирована.`)
                    }}
                  >
                    Забронировать
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      )}
    </Card>
  )
})
