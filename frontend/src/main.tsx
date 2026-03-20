import 'antd/dist/reset.css'
import './index.scss'

import App from './App.tsx'
import { App as AntdApp, ConfigProvider } from 'antd'
import { appThemeToken } from './shared/theme/tokens'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <AntdApp>
    <ConfigProvider theme={appThemeToken}>
      <App />
    </ConfigProvider>
  </AntdApp>,
)
