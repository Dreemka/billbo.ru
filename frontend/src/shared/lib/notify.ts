import type { NotificationInstance } from 'antd/es/notification/interface'

/** Заполняется из `NotificationBridge` (App.useApp), чтобы уведомления наследовали тему. */
let notificationApi: NotificationInstance | null = null

export function bindNotificationApi(api: NotificationInstance | null) {
  notificationApi = api
}

export function notifySuccess(title: string, description?: string) {
  notificationApi?.success({ title, description })
}

export function notifyError(title: string, description?: string) {
  notificationApi?.error({ title, description })
}

