import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Divider,
  Dropdown,
  Input,
  Modal,
  Popover,
  Radio,
  Row,
  Select,
  Slider,
  Space,
  Table,
  Typography,
} from 'antd'
import {
  AppstoreOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EllipsisOutlined,
  FilterFilled,
  FilterOutlined,
  GlobalOutlined,
  HeartFilled,
  HeartOutlined,
  InfoCircleOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { notifyError, notifySuccess } from '../../shared/lib/notify'
import { useEffect, useMemo, useRef, useState } from 'react'

import { BillboardPhotoIconButton } from '../../shared/ui/BillboardPhotoIconButton'
import { ExternalImagePreview } from '../../shared/ui/ExternalImagePreview'
import { YandexMap } from './YandexMap'
import { favoritesApi } from '../../shared/api/services'
import { filterBillboardsBySearchQuery } from '../../shared/lib/filterBillboardsBySearchQuery'
import { formatExtraField } from '../../shared/lib/formatExtraField'
import { getPhotoUrl } from '../../shared/lib/photoLinkBehavior'
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
  const [billboardSearchQuery, setBillboardSearchQuery] = useState('')
  const [companyFilterId, setCompanyFilterId] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null)
  const [priceSliderDraft, setPriceSliderDraft] = useState<[number, number] | null>(null)
  const [priceSort, setPriceSort] = useState<'none' | 'asc' | 'desc'>('none')
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [activeExtraBillboardId, setActiveExtraBillboardId] = useState<string | null>(null)
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null)

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds])

  useEffect(() => {
    void billboards.load('catalog')
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

  const companyOptions = useMemo(() => {
    const m = new Map<string, string>()
    itemsToShow.forEach((b) => {
      const name = b.companyName?.trim()
      if (b.companyId && name) m.set(b.companyId, name)
    })
    return Array.from(m.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'))
  }, [itemsToShow])

  useEffect(() => {
    if (!companyFilterId) return
    if (!itemsToShow.some((b) => b.companyId === companyFilterId)) {
      setCompanyFilterId(null)
    }
  }, [itemsToShow, companyFilterId])

  const priceExtent = useMemo(() => {
    const prices = billboards.items
      .map((b) => b.pricePerWeek)
      .filter((p) => Number.isFinite(p))
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

  const filtersPopoverActive =
    !!companyFilterId || isPriceFilterActive || priceSort !== 'none'

  const itemsAfterCompanyFilter = useMemo(() => {
    if (!companyFilterId) return itemsToShow
    return itemsToShow.filter((b) => b.companyId === companyFilterId)
  }, [itemsToShow, companyFilterId])

  const itemsAfterPriceFilter = useMemo(() => {
    if (!priceExtent) return itemsAfterCompanyFilter
    const [lo, hi] = committedPriceRange
    return itemsAfterCompanyFilter.filter((b) => b.pricePerWeek >= lo && b.pricePerWeek <= hi)
  }, [itemsAfterCompanyFilter, priceExtent, committedPriceRange])

  const displayedBillboards = useMemo(() => {
    const searched = filterBillboardsBySearchQuery(itemsAfterPriceFilter, billboardSearchQuery)
    if (priceSort === 'none') return searched
    return [...searched].sort((a, b) =>
      priceSort === 'asc' ? a.pricePerWeek - b.pricePerWeek : b.pricePerWeek - a.pricePerWeek,
    )
  }, [itemsAfterPriceFilter, billboardSearchQuery, priceSort])

  useEffect(() => {
    if (!mapFocusBillboardId) return
    if (!onlyFavorites) return
    if (!favoriteIdSet.has(mapFocusBillboardId)) setMapFocusBillboardId(null)
  }, [onlyFavorites, favoriteIdSet, mapFocusBillboardId])

  useEffect(() => {
    if (!mapFocusBillboardId) return
    if (displayedBillboards.some((b) => b.id === mapFocusBillboardId)) return
    setMapFocusBillboardId(null)
  }, [displayedBillboards, mapFocusBillboardId])

  return (
    <>
      <div style={{ paddingLeft: 20 }}>
        <Typography.Title level={4}>Каталог рекламных поверхностей</Typography.Title>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <Card variant="borderless" styles={{ root: { boxShadow: 'none' } }}>
          <div ref={mapSectionRef}>
            <YandexMap items={displayedBillboards} focusBillboardId={mapFocusBillboardId} />
          </div>
        </Card>

        <Card>
      {message ? <Alert type="info" showIcon message={message} /> : null}
      {billboards.lastError ? (
        <Alert type="error" showIcon message={billboards.lastError} style={{ marginTop: 12 }} />
      ) : null}

      <div
        style={{
          marginTop: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
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
                  <div style={{ width: '100%' }}>
                    <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>
                      Компания
                    </Typography.Text>
                    <Select
                      allowClear
                      placeholder="Все компании"
                      style={{ width: '100%' }}
                      value={companyFilterId ?? undefined}
                      onChange={(v) => setCompanyFilterId(v ?? null)}
                      options={companyOptions}
                      showSearch
                      optionFilterProp="label"
                      disabled={!companyOptions.length}
                      getPopupContainer={(n) => n.parentElement ?? document.body}
                    />
                  </div>
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
                filtersPopoverActive ? (
                  <FilterFilled style={{ color: 'var(--color-focus)' }} />
                ) : (
                  <FilterOutlined />
                )
              }
              aria-label="Фильтры и сортировка"
            />
          </Popover>
          <Button
            type="text"
            className="app-map-focus-btn"
            icon={
              onlyFavorites ? <HeartFilled style={{ color: 'var(--color-focus)' }} /> : <HeartOutlined />
            }
            aria-label="Показать избранное"
            onClick={() => setOnlyFavorites((v) => !v)}
          />
        </Space>
      </div>

      {(billboardSearchQuery.trim() || companyFilterId || isPriceFilterActive) &&
      displayedBillboards.length === 0 ? (
        <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
          Ничего не найдено — измените поиск, фильтр компании, диапазон цены или сбросьте фильтры.
        </Typography.Paragraph>
      ) : null}

      {viewMode === 'cards' ? (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {displayedBillboards.map((item) => (
            <Col key={item.id} xs={24} sm={12} md={12} lg={8} xl={8}>
              <Card className="app-billboard-card">
                <div style={{ position: 'absolute', right: 20, top: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <BillboardPhotoIconButton
                    url={getPhotoUrl(item.extraFields as Record<string, unknown>)}
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

                {item.description?.trim() ? (
                  <Typography.Paragraph style={{ marginBottom: 8, whiteSpace: 'pre-wrap' }}>
                    {item.description.trim()}
                  </Typography.Paragraph>
                ) : null}

                <Typography.Paragraph>{item.address}</Typography.Paragraph>
                <Typography.Paragraph>
                  {item.type} · {item.size}
                </Typography.Paragraph>
                <Typography.Paragraph>
                  Координаты: {item.lat}, {item.lng}
                </Typography.Paragraph>
                <Typography.Paragraph>
                  Стоимость: {item.pricePerWeek.toLocaleString('ru-RU')} руб / месяц
                </Typography.Paragraph>

                <Typography.Paragraph style={{ marginBottom: 8 }}>
                  <Typography.Text type="secondary">Компания: </Typography.Text>
                  {item.companyName?.trim() || '—'}
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

                {activeExtraBillboardId === item.id ? null : <Divider className="marketplace-status-divider" />}

              {(() => {
                const detailEntries = Object.entries(item.extraFields ?? {}).filter(
                  ([k]) =>
                    ![
                      'Gid',
                      'Format',
                      'Dinamic',
                      'address',
                      'Price',
                      'available',
                      'Coordinate',
                      'Photo',
                      'Status',
                    ].includes(k),
                )
                if (!detailEntries.length) return null
                return (
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
                            {detailEntries.map(([k, v]) => {
                              const formatted = formatExtraField(k, v)
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
                )
              })()}

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
          dataSource={displayedBillboards}
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
            {
              title: 'Описание',
              key: 'description',
              width: 320,
              ellipsis: true,
              render: (_value, item) => item.description?.trim() || '—',
            },
            { title: 'Адрес', dataIndex: 'address', key: 'address' },
            {
              title: 'Цена',
              key: 'price',
              render: (_value, item) => `${item.pricePerWeek.toLocaleString('ru-RU')} руб / месяц`,
            },
            {
              title: 'Компания',
              key: 'company',
              width: 160,
              ellipsis: true,
              render: (_value, item) => item.companyName?.trim() || '—',
            },
            {
              title: 'Фото',
              key: 'photo',
              width: 72,
              align: 'center' as const,
              render: (_value, item) => (
                <BillboardPhotoIconButton
                  url={getPhotoUrl(item.extraFields as Record<string, unknown>)}
                  onOpenModal={setPhotoModalUrl}
                />
              ),
            },
            {
              title: 'Статус',
              key: 'status',
              width: 120,
              align: 'center' as const,
              render: (_value, item) => {
                const ok = parseStatusToAvailable(item.extraFields?.Status) ?? item.available
                return (
                  <span style={{ fontSize: 18 }}>
                    {ok ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} aria-label="Доступен" />
                    ) : (
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} aria-label="Недоступен" />
                    )}
                  </span>
                )
              },
            },
            {
              title: 'Инфо',
              key: 'details',
              width: 72,
              align: 'center' as const,
              render: (_value, item) => {
                const extraEntries = Object.entries(item.extraFields ?? {}).filter(
                  ([k]) =>
                    ![
                      'Gid',
                      'Format',
                      'Dinamic',
                      'address',
                      'Price',
                      'available',
                      'Coordinate',
                      'Photo',
                      'Status',
                    ].includes(k),
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
                      <Button type="text" icon={<InfoCircleOutlined />} aria-label="Инфо" />
                    </Dropdown>
                  </div>
                )
              },
            },
            {
              title: '',
              key: 'actions',
              width: 88,
              align: 'center' as const,
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
      </div>

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
