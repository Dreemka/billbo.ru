import { App } from 'antd'
import { useEffect } from 'react'

import { bindNotificationApi } from '../shared/lib/notify'

/** Подключает контекстные notification API из antd `App` к модулю `notify.ts`. */
export function NotificationBridge() {
  const { notification } = App.useApp()

  useEffect(() => {
    bindNotificationApi(notification)
    return () => bindNotificationApi(null)
  }, [notification])

  return null
}
