import { Alert, Badge, Button, Card, Col, Collapse, Divider, Dropdown, Modal, Radio, Row, Space, Table, Typography } from 'antd'
import {
  AppstoreOutlined,
  CalendarOutlined,
  EllipsisOutlined,
  GlobalOutlined,
  HeartFilled,
  HeartOutlined,
  FileImageOutlined,
  InfoCircleOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { notifyError, notifySuccess } from '../../shared/lib/notify'
import { useEffect, useMemo, useRef, useState } from 'react'

import { YandexMap } from './YandexMap'
import { favoritesApi } from '../../shared/api/services'
import { formatExtraField } from '../../shared/lib/formatExtraField'
import { observer } from 'mobx-react-lite'
import { parseStatusToAvailable } from '../../shared/lib/parseStatusToAvailable'
import { useStore } from '../../app/store/rootStore'

export const MarketplacePage = observer(function MarketplacePage() {
  const { billboards, user, session } = useStore()
  const canBuy = session.role === 'user'
  const [message, setMessage] = useState('')
  const [mapFocusBillboardId, setMapFocusBillboardId] = useState<string | null>(null)
  const mapSectionRef = useRef<HTMLDivElement | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [activeExtraBillboardId, setActiveExtraBillboardId] = useState<string | null>(null)
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null)

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds])

  useEffect(() => {
    void billboards.load()
    void user.loadWallet()

    void favoritesApi
      .getIds()
      .then((res) => setFavoriteIds(res.data.ids))
      .catch((e) => {
        console.error('Favorites load failed', e)
        notifyError('Не удалось загрузить избранное', 'Попробуйте ещё раз.')
      })
  }, [billboards, user])

  const itemsToShow = useMemo(() => {
    if (!onlyFavorites) return billboards.items
    return billboards.items.filter((b) => favoriteIdSet.has(b.id))
  }, [onlyFavorites, billboards.items, favoriteIdSet])

  useEffect(() => {
    if (!mapFocusBillboardId) return
    if (!onlyFavorites) return
    if (!favoriteIdSet.has(mapFocusBillboardId)) setMapFocusBillboardId(null)
  }, [onlyFavorites, favoriteIdSet, mapFocusBillboardId])

  return (
    <>
      <div style={{ paddingLeft: 20 }}>
        <Typography.Title level={4}>Маркетплейс рекламных поверхностей</Typography.Title>
        <Typography.Paragraph>
          Здесь клиент видит доступные элементы, их стоимость, статус и положение на карте.
        </Typography.Paragraph>
      </div>

      <Card>
      <div ref={mapSectionRef}>
        <YandexMap items={itemsToShow} focusBillboardId={mapFocusBillboardId} />
      </div>

      {message ? <Alert type="info" showIcon message={message} /> : null}
      {billboards.lastError ? (
        <Alert type="error" showIcon message={billboards.lastError} style={{ marginTop: 12 }} />
      ) : null}

      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

        <Button
          type="text"
          className="app-map-focus-btn"
          icon={
            onlyFavorites ? <HeartFilled style={{ color: 'var(--color-focus)' }} /> : <HeartOutlined />
          }
          aria-label="Показать избранное"
          onClick={() => setOnlyFavorites((v) => !v)}
        />
      </div>

      {viewMode === 'cards' ? (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {itemsToShow.map((item) => (
            <Col key={item.id} xs={24} sm={12} md={12} lg={8} xl={8}>
              <Card className="app-billboard-card">
                <div style={{ position: 'absolute', right: 20, top: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
                    icon={
                      favoriteIdSet.has(item.id) ? (
                        <HeartFilled style={{ color: 'var(--color-focus)' }} />
                      ) : (
                        <HeartOutlined />
                      )
                    }
                    aria-label={favoriteIdSet.has(item.id) ? 'Убрать из избранного' : 'Добавить в избранное'}
                    onClick={async () => {
                      try {
                        const res = await favoritesApi.toggle(item.id)
                        if (res.data.favorited) {
                          setFavoriteIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]))
                        } else {
                          setFavoriteIds((prev) => prev.filter((id) => id !== item.id))
                        }
                      } catch (e) {
                        console.error('Favorites toggle failed', e)
                        notifyError('Ошибка', 'Не удалось обновить избранное.')
                      }
                    }}
                  />
                </div>

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
                  <div style={{ marginBottom: 12 }}>
                    <Badge
                      status={isAvailable ? 'success' : 'error'}
                      text={isAvailable ? 'Доступен' : 'Недоступен'}
                    />
                  </div>
                )
              })()}

                {activeExtraBillboardId === item.id ? null : <Divider className="marketplace-status-divider" />}

              {item.extraFields && Object.keys(item.extraFields).length > 0 ? (
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
                            {Object.entries(item.extraFields)
                              .filter(([k]) => !['Gid', 'Format', 'Dinamic', 'address', 'Price', 'available', 'Coordinate'].includes(k))
                              .map(([k, v]) => {
                                const formatted = formatExtraField(k, v)
                                const isPhoto = k === 'Photo'
                                const url = isPhoto ? (v == null ? '' : String(v).trim()) : ''
                                if (isPhoto) {
                                  return (
                                    <Typography.Paragraph key={k} style={{ margin: '0 0 5px 0' }}>
                                      <Button
                                        type="text"
                                        icon={<FileImageOutlined />}
                                        disabled={!url}
                                        aria-label={url ? 'Открыть изображение' : 'Нет изображения'}
                                        onClick={() => {
                                          if (!url) return
                                          setPhotoModalUrl(url)
                                        }}
                                      />
                                    </Typography.Paragraph>
                                  )
                                }
                                return (
                                  <Typography.Paragraph key={k} style={{ margin: '0 0 5px 0' }}>
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
                    type="primary"
                    style={{ marginTop: 10 }}
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
                    Забронировать
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
          dataSource={itemsToShow}
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
                <Badge
                  status={(parseStatusToAvailable(item.extraFields?.Status) ?? item.available) ? 'success' : 'error'}
                  text={(parseStatusToAvailable(item.extraFields?.Status) ?? item.available) ? 'Доступен' : 'Недоступен'}
                />
              ),
            },
            {
              title: 'Подробнее',
              key: 'details',
              render: (_value, item) => {
                const extraEntries = Object.entries(item.extraFields ?? {}).filter(
                  ([k]) => !['Gid', 'Format', 'Dinamic', 'address', 'Price', 'available', 'Coordinate'].includes(k),
                )

                const hasExtra = extraEntries.length > 0

                return (
                  <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <Dropdown
                      trigger={['click']}
                      disabled={!hasExtra}
                      menu={{
                        items: [
                          {
                            key: 'details',
                            label: (
                              <div>
                                {extraEntries.map(([k, v]) => {
                                  const formatted = formatExtraField(k, v)
                                  const isPhoto = k === 'Photo'
                                  const url = isPhoto ? (v == null ? '' : String(v).trim()) : ''
                                  if (isPhoto) {
                                    return (
                                      <Typography.Paragraph key={k} style={{ margin: '0 0 6px 0', fontSize: 12, color: 'rgba(0,0,0,0.85)' }}>
                                        <Button
                                          type="text"
                                          icon={<FileImageOutlined />}
                                          disabled={!url}
                                          aria-label={url ? 'Открыть изображение' : 'Нет изображения'}
                                          onClick={() => {
                                            if (!url) return
                                            setPhotoModalUrl(url)
                                          }}
                                        />
                                      </Typography.Paragraph>
                                    )
                                  }
                                  return (
                                    <Typography.Paragraph
                                      key={k}
                                      style={{ margin: '0 0 6px 0', fontSize: 12, color: 'rgba(0,0,0,0.85)' }}
                                    >
                                      {formatted.label}: {formatted.value}
                                    </Typography.Paragraph>
                                  )
                                })}
                              </div>
                            ),
                          },
                        ],
                      }}
                    >
                      <Button type="text" icon={<InfoCircleOutlined />} aria-label="Подробнее" />
                    </Dropdown>
                  </div>
                )
              },
            },
            {
              title: 'Действия',
              key: 'actions',
              render: (_value, item) => (
                (() => {
                  const statusAvailable = parseStatusToAvailable(item.extraFields?.Status)
                  const isAvailable = statusAvailable ?? item.available
                  const isFavorited = favoriteIdSet.has(item.id)
                  const canReserve = canBuy && !session.isLoading && isAvailable === true

                  return (
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
                            key: 'favorite',
                            label: (
                              <Space size={8}>
                                {isFavorited ? <HeartFilled /> : <HeartOutlined />}
                                <span>Избранное</span>
                              </Space>
                            ),
                            onClick: async () => {
                              try {
                                const res = await favoritesApi.toggle(item.id)
                                if (res.data.favorited) {
                                  setFavoriteIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]))
                                } else {
                                  setFavoriteIds((prev) => prev.filter((id) => id !== item.id))
                                }
                              } catch (e) {
                                console.error('Favorites toggle failed', e)
                                notifyError('Ошибка', 'Не удалось обновить избранное.')
                              }
                            },
                          },
                          {
                            key: 'reserve',
                            label: (
                              <Space size={8}>
                                <CalendarOutlined />
                                <span>Забронировать</span>
                              </Space>
                            ),
                            disabled: !canReserve,
                            onClick: async () => {
                              if (!canReserve) return
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
                            },
                          },
                        ],
                      }}
                    >
                      <Button type="text" icon={<EllipsisOutlined />} aria-label="Действия" />
                    </Dropdown>
                  )
                })()
              ),
            },
          ]}
        />
      )}
      </Card>

      <Modal
        open={!!photoModalUrl}
        title="Фото"
        footer={null}
        onCancel={() => setPhotoModalUrl(null)}
      >
        {photoModalUrl ? (
          <img
            src={photoModalUrl}
            alt="Фото"
            style={{ width: '100%', borderRadius: 8, display: 'block' }}
          />
        ) : null}
      </Modal>
    </>
  )
})
