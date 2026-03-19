import { observer } from 'mobx-react-lite'
import { createBrowserRouter } from 'react-router-dom'
import { Card, Space, Typography } from 'antd'
import { AppLayout } from './layouts/AppLayout'
import { useStore } from './store/rootStore'
import { AdminCompanyPage } from '../features/admin/AdminCompanyPage'
import { AdminBillboardsPage } from '../features/admin/AdminBillboardsPage'
import { UserProfilePage } from '../features/user/UserProfilePage'
import { WalletPage } from '../features/user/WalletPage'
import { MarketplacePage } from '../features/user/MarketplacePage'
import { RoleGuard } from './router/RoleGuard'

const HomePage = observer(function HomePage() {
  const { session } = useStore()

  const features = [
    'Компания управляет профилем и карточками рекламных конструкций.',
    'Пользователь находит свободные элементы, бронирует и оплачивает их.',
    'Карточки готовы для интеграции с картой и backend API.',
  ]

  return (
    <Card>
      <Typography.Title level={4}>Платформа аренды наружной рекламы</Typography.Title>
      <Typography.Paragraph>Роль: {session.role}</Typography.Paragraph>
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {features.map((text) => (
          <Typography.Paragraph key={text} style={{ margin: 0 }}>
            {text}
          </Typography.Paragraph>
        ))}
      </Space>
    </Card>
  )
})

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: '/admin/company',
        element: (
          <RoleGuard role="admin">
            <AdminCompanyPage />
          </RoleGuard>
        ),
      },
      {
        path: '/admin/billboards',
        element: (
          <RoleGuard role="admin">
            <AdminBillboardsPage />
          </RoleGuard>
        ),
      },
      {
        path: '/user/profile',
        element: (
          <RoleGuard role="user">
            <UserProfilePage />
          </RoleGuard>
        ),
      },
      {
        path: '/user/wallet',
        element: (
          <RoleGuard role="user">
            <WalletPage />
          </RoleGuard>
        ),
      },
      {
        path: '/user/marketplace',
        element: (
          <RoleGuard role="user">
            <MarketplacePage />
          </RoleGuard>
        ),
      },
    ],
  },
])
