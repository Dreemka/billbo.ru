import { Button, Form, Input, Modal, Radio, Space, Switch, Typography } from 'antd'
import { useEffect, useState } from 'react'

import type { SuperadminCreateUserPayload } from '../../entities/types'
import { superadminApi } from '../../shared/api/services'
import { getErrorMessage } from '../../shared/lib/getErrorMessage'
import { notifyError, notifySuccess } from '../../shared/lib/notify'

type FormValues = {
  role: 'USER' | 'COMPANY' | 'SUPERADMIN'
  email: string
  password: string
  fullName: string
  phone: string
  avatarUrl?: string
  companyName?: string
  companyCity?: string
  companyDescription?: string
  companyIsVerified?: boolean
}

interface SuperadminCreateUserModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function SuperadminCreateUserModal({ open, onClose, onCreated }: SuperadminCreateUserModalProps) {
  const [form] = Form.useForm<FormValues>()
  const [submitting, setSubmitting] = useState(false)
  const role = Form.useWatch('role', form)

  useEffect(() => {
    if (!open) return
    form.resetFields()
    form.setFieldsValue({
      role: 'USER',
      companyIsVerified: false,
    })
  }, [open, form])

  async function submit() {
    try {
      await form.validateFields()
    } catch {
      return
    }

    const values = form.getFieldsValue(true) as FormValues
    const payload: SuperadminCreateUserPayload = {
      email: values.email.trim(),
      password: values.password,
      fullName: values.fullName.trim(),
      phone: values.phone.trim(),
      role: values.role,
    }
    const avatar = values.avatarUrl?.trim()
    if (avatar) payload.avatarUrl = avatar

    if (values.role === 'COMPANY') {
      payload.companyName = values.companyName!.trim()
      payload.companyCity = values.companyCity!.trim()
      const desc = values.companyDescription?.trim()
      if (desc) payload.companyDescription = desc
      payload.companyIsVerified = values.companyIsVerified ?? false
    }

    setSubmitting(true)
    try {
      const { data } = await superadminApi.createUser(payload)
      notifySuccess(
        'Пользователь создан',
        `${data.fullName} (${data.email}), роль ${data.role}.`,
      )
      onCreated()
      onClose()
    } catch (e) {
      console.error(e)
      notifyError('Не удалось создать пользователя', getErrorMessage(e, 'Проверьте данные и попробуйте снова.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="Новый пользователь"
      open={open}
      onCancel={onClose}
      width={560}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="primary" loading={submitting} onClick={() => void submit()}>
            Создать
          </Button>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Заполните те же поля, что и при самостоятельной регистрации; для компании доступны описание и признак
        верификации.
      </Typography.Paragraph>

      <Form<FormValues> form={form} layout="vertical" requiredMark="optional">
        <Form.Item
          name="role"
          label="Роль"
          rules={[{ required: true, message: 'Выберите роль' }]}
        >
          <Radio.Group>
            <Radio.Button value="USER">Клиент</Radio.Button>
            <Radio.Button value="COMPANY">Компания</Radio.Button>
            <Radio.Button value="SUPERADMIN">Супер-админ</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Укажите email' },
            { type: 'email', message: 'Некорректный email' },
          ]}
        >
          <Input autoComplete="off" placeholder="user@example.com" />
        </Form.Item>

        <Form.Item
          name="password"
          label="Пароль"
          rules={[
            { required: true, message: 'Укажите пароль' },
            { min: 6, message: 'Не короче 6 символов' },
          ]}
        >
          <Input.Password autoComplete="new-password" placeholder="Минимум 6 символов" />
        </Form.Item>

        <Form.Item
          name="fullName"
          label="Имя (ФИО)"
          rules={[{ required: true, message: 'Укажите имя' }, { min: 2, message: 'Не короче 2 символов' }]}
        >
          <Input placeholder="Как в профиле" />
        </Form.Item>

        <Form.Item
          name="phone"
          label="Телефон"
          rules={[{ required: true, message: 'Укажите телефон' }, { min: 10, message: 'Не короче 10 символов' }]}
        >
          <Input placeholder="+7…" />
        </Form.Item>

        <Form.Item name="avatarUrl" label="Аватар (URL)">
          <Input placeholder="Необязательно, полная ссылка на изображение" />
        </Form.Item>

        {role === 'COMPANY' ? (
          <>
            <Form.Item
              name="companyName"
              label="Название компании"
              rules={[{ required: true, message: 'Укажите название' }, { min: 2, message: 'Не короче 2 символов' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="companyCity"
              label="Город компании"
              rules={[{ required: true, message: 'Укажите город' }, { min: 2, message: 'Не короче 2 символов' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="companyDescription" label="Описание компании">
              <Input.TextArea rows={3} placeholder="Необязательно" maxLength={2000} showCount />
            </Form.Item>
            <Form.Item name="companyIsVerified" label="Верифицирована" valuePropName="checked">
              <Switch />
            </Form.Item>
          </>
        ) : null}
      </Form>
    </Modal>
  )
}
