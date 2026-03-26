import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { AdminCompanyPage } from '../features/admin/AdminCompanyPage'
import { AdminBillboardsPage } from '../features/admin/AdminBillboardsPage'
import { UserProfilePage } from '../features/user/UserProfilePage'
import { WalletPage } from '../features/user/WalletPage'
import { MarketplacePage } from '../features/user/MarketplacePage'
import { LoginPage } from '../features/auth/LoginPage'
import { RoleGuard } from './router/RoleGuard'
import { RequireAuth } from './router/RequireAuth'
import { HomeRedirect } from './router/HomeRedirect'
import { SuperAdminGuard } from './router/SuperAdminGuard'
import { SuperadminCompaniesPage } from '../features/superadmin/SuperadminCompaniesPage'
import { SuperadminClientsPage } from '../features/superadmin/SuperadminClientsPage'
import { SuperadminSuperadminsPage } from '../features/superadmin/SuperadminSuperadminsPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
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
        path: '/superadmin/superadmins',
        element: (
          <SuperAdminGuard>
            <SuperadminSuperadminsPage />
          </SuperAdminGuard>
        ),
      },
      {
        path: '/superadmin/companies',
        element: (
          <SuperAdminGuard>
            <SuperadminCompaniesPage />
          </SuperAdminGuard>
        ),
      },
      {
        path: '/superadmin/clients',
        element: (
          <SuperAdminGuard>
            <SuperadminClientsPage />
          </SuperAdminGuard>
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
