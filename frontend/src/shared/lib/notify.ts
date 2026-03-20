import { notification } from 'antd'

export function notifySuccess(title: string, description?: string) {
  notification.success({ title, description })
}

export function notifyError(title: string, description?: string) {
  notification.error({ title, description })
}

