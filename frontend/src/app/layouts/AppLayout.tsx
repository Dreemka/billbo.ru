import { Avatar, Button, Layout, Menu, Space, Typography } from 'antd'
import { LogoutOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import { observer } from 'mobx-react-lite'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useStore } from '../store/rootStore'
import { AppstoreOutlined, ShoppingOutlined, UserOutlined, WalletOutlined } from '@ant-design/icons'
import logoUrl from '../../assets/imgages/logo-full.svg'
import logoMinUrl from '../../assets/imgages/logo-min.svg'

export const AppLayout = observer(function AppLayout() {
  const { session, user } = useStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const adminItems = [
    { key: '/admin/company', label: 'Профиль', icon: <UserOutlined /> },
    { key: '/admin/billboards', label: 'Рекламные элементы', icon: <AppstoreOutlined /> },
  ]

  const userItems = [
    { key: '/user/marketplace', label: 'Маркетплейс', icon: <ShoppingOutlined /> },
    { key: '/user/profile', label: 'Профиль', icon: <UserOutlined /> },
    { key: '/user/wallet', label: 'Кошелек', icon: <WalletOutlined /> },
  ]

  const menuItems = session.role === 'admin' ? adminItems : userItems

  const selectedKey =
    menuItems.find((item) => pathname === item.key || pathname.startsWith(`${item.key}/`))?.key ??
    menuItems[0]?.key

  const userName = user.profile.fullName || ''
  const initials = userName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  useEffect(() => {
    if (session.role === 'guest') return
    // чтобы блок "Аватар / Имя / Кабинет" в левой панели всегда показывал данные из бэка
    void user.loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.role])

  return (
    <Layout className="app-layout">
      <Layout.Sider
        width={260}
        className={`app-sider ${collapsed ? 'app-sider--collapsed' : ''}`}
        breakpoint="lg"
        collapsedWidth={72}
        collapsible={false}
        collapsed={collapsed}
      >
        <div className="app-sider-inner">
          <div className="app-brand">
            <img className="app-brand-logo" src={collapsed ? logoMinUrl : logoUrl} alt="Billbo.ru" />
            {!collapsed ? <Typography.Text type="secondary">Платформа наружной рекламы</Typography.Text> : null}
          </div>

          <Menu
            mode="inline"
            selectedKeys={selectedKey ? [selectedKey] : []}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            className="app-menu"
            inlineCollapsed={collapsed}
          />

          <div className="app-sider-bottom">
            <div className="app-user-summary">
              <Avatar size={40} src={user.profile.avatarUrl || undefined}>
                {initials || 'U'}
              </Avatar>
              {!collapsed ? <Typography.Text className="app-user-name">{userName}</Typography.Text> : null}
            </div>

            <div className="app-sider-actions-row">
              <Button
                className="app-exit-btn"
                type="text"
                icon={<LogoutOutlined />}
                aria-label="Выход"
                onClick={() => {
                  session.logout()
                  navigate('/login', { replace: true })
                }}
              />

              <Button
                className="app-toggle-btn"
                type="text"
                onClick={() => setCollapsed((v) => !v)}
                icon={collapsed ? <RightOutlined /> : <LeftOutlined />}
                aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
              />
            </div>
          </div>
        </div>
      </Layout.Sider>

      <Layout className="app-right-layout">
        <Layout.Header className="app-header">
          <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
            {import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true' ? (
              <>
                <Button
                  type="primary"
                  disabled={session.isLoading}
                  onClick={async () => {
                    if (await session.loginAs('admin')) navigate('/admin/company', { replace: true })
                  }}
                >
                  Dev: компания
                </Button>
                <Button
                  disabled={session.isLoading}
                  onClick={async () => {
                    if (await session.loginAs('user')) navigate('/user/marketplace', { replace: true })
                  }}
                >
                  Dev: клиент
                </Button>
              </>
            ) : null}
          </Space>
        </Layout.Header>

        <Layout.Content className="app-content">
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  )
})
