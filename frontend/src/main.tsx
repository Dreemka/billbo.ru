import 'antd/dist/reset.css'
import './index.scss'

import App from './App.tsx'
import { App as AntdApp, ConfigProvider } from 'antd'
import { appThemeToken } from './shared/theme/tokens'
import { createRoot } from 'react-dom/client'
import { setAuthTokenRefreshHandler } from './shared/api/http'
import { rootStore } from './app/store/rootStore'
import { NotificationBridge } from './app/NotificationBridge'

setAuthTokenRefreshHandler((data) => {
  rootStore.session.applyAuthTokens(data)
})

createRoot(document.getElementById('root')!).render(
  <ConfigProvider theme={appThemeToken}>
    <AntdApp>
      <NotificationBridge />
      <App />
    </AntdApp>
  </ConfigProvider>,
)
