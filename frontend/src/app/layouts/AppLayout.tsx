import { Button, Layout, Menu, Space, Tag, Typography } from 'antd'
import { observer } from 'mobx-react-lite'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/rootStore'

export const AppLayout = observer(function AppLayout() {
  const { session } = useStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const adminItems = [
    { key: '/admin/company', label: 'Компания' },
    { key: '/admin/billboards', label: 'Рекламные элементы' },
  ]

  const userItems = [
    { key: '/user/marketplace', label: 'Маркетплейс' },
    { key: '/user/profile', label: 'Профиль' },
    { key: '/user/wallet', label: 'Кошелек' },
  ]

  const menuItems = session.role === 'admin' ? adminItems : userItems

  const selectedKey =
    menuItems.find((item) => pathname === item.key || pathname.startsWith(`${item.key}/`))?.key ??
    menuItems[0]?.key

  const roleLabel = session.role === 'admin' ? 'Компания' : 'Клиент'

  return (
    <Layout className="app-layout">
      <Layout.Sider width={260} className="app-sider" breakpoint="lg" collapsedWidth={0}>
        <div className="app-brand">
          <Typography.Title level={4}>Billbo.ru</Typography.Title>
          <Typography.Text type="secondary">Платформа наружной рекламы</Typography.Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="app-menu"
        />
      </Layout.Sider>

      <Layout>
        <Layout.Header className="app-header">
          <Space>
            <Typography.Text>Кабинет:</Typography.Text>
            <Tag color={session.role === 'admin' ? 'blue' : 'green'}>{roleLabel}</Tag>
          </Space>
          <Space wrap>
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
            <Button
              danger
              onClick={() => {
                session.logout()
                navigate('/login', { replace: true })
              }}
            >
              Выход
            </Button>
          </Space>
        </Layout.Header>

        <Layout.Content className="app-content">
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  )
})
