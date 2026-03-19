import { Button, Layout, Menu, Space, Tag, Typography } from 'antd'
import { observer } from 'mobx-react-lite'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/rootStore'

export const AppLayout = observer(function AppLayout() {
  const { session } = useStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const menuItems = [
    { key: '/', label: 'Главная' },
    { key: '/admin/company', label: 'Компания' },
    { key: '/admin/billboards', label: 'Рекламные элементы' },
    { key: '/user/profile', label: 'Профиль' },
    { key: '/user/wallet', label: 'Кошелек' },
    { key: '/user/marketplace', label: 'Маркетплейс' },
  ]

  const selectedKey =
    menuItems.find((item) => pathname === item.key || pathname.startsWith(`${item.key}/`))?.key ?? '/'

  return (
    <Layout className="app-layout">
      <Layout.Sider width={260} className="app-sider" breakpoint="lg" collapsedWidth={0}>
        <div className="app-brand">
          <Typography.Title level={4}>Billbo.ru</Typography.Title>
          <Typography.Text type="secondary">Платформа наружной рекламы</Typography.Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="app-menu"
        />
      </Layout.Sider>

      <Layout>
        <Layout.Header className="app-header">
          <Space>
            <Typography.Text>Роль:</Typography.Text>
            <Tag color={session.role === 'admin' ? 'blue' : 'green'}>{session.role}</Tag>
          </Space>
          <Space wrap>
            <Button type="primary" disabled={session.isLoading} onClick={() => void session.loginAs('admin')}>
              Вход как компания
            </Button>
            <Button disabled={session.isLoading} onClick={() => void session.loginAs('user')}>
              Вход как клиент
            </Button>
            <Button danger onClick={() => session.logout()}>
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
