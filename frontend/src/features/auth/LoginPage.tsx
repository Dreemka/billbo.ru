import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Input, Radio, Tabs, Typography } from 'antd'
import type { Role } from '../../entities/types'
import { useStore } from '../../app/store/rootStore'

function canAccessPathWithRole(path: string, role: Exclude<Role, 'guest'>): boolean {
  if (path.startsWith('/admin')) return role === 'admin'
  if (path.startsWith('/user')) return role === 'user'
  return true
}

function defaultHomeForRole(role: Exclude<Role, 'guest'>) {
  return role === 'admin' ? '/admin/company' : '/user/marketplace'
}

const devLoginEnabled = import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true'

type LoginFields = { email: string; password: string }
type RegisterFields = {
  email: string
  password: string
  fullName: string
  phone?: string
  accountType: 'USER' | 'COMPANY'
}

export const LoginPage = observer(function LoginPage() {
  const { session } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname

  const [loginForm] = Form.useForm<LoginFields>()
  const [registerForm] = Form.useForm<RegisterFields>()

  useEffect(() => {
    if (session.role === 'guest' || !session.token) return
    const target =
      from && canAccessPathWithRole(from, session.role) ? from : defaultHomeForRole(session.role)
    navigate(target, { replace: true })
  }, [session.role, session.token, from, navigate])

  async function onLoginSubmit(values: LoginFields) {
    session.authError = null
    const ok = await session.login(values.email.trim(), values.password)
    if (!ok) return
    const role = session.role as Exclude<Role, 'guest'>
    const target =
      from && canAccessPathWithRole(from, role) ? from : defaultHomeForRole(role)
    navigate(target, { replace: true })
  }

  async function onRegisterSubmit(values: RegisterFields) {
    session.authError = null
    const ok = await session.register({
      email: values.email.trim(),
      password: values.password,
      fullName: values.fullName.trim(),
      phone: values.phone?.trim() || undefined,
      role: values.accountType,
    })
    if (!ok) return
    const role = session.role as Exclude<Role, 'guest'>
    navigate(defaultHomeForRole(role), { replace: true })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--color-bg-body, #0f1419)',
      }}
    >
      <Card style={{ width: '100%', maxWidth: 420 }}>
        <Typography.Title level={3} style={{ marginTop: 0, textAlign: 'center' }}>
          Billbo.ru
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
          Вход для компании и клиентов
        </Typography.Paragraph>

        {session.authError ? (
          <Alert type="error" showIcon message={session.authError} style={{ marginBottom: 16 }} />
        ) : null}

        <Tabs
          defaultActiveKey="login"
          centered
          destroyOnHidden
          items={[
            {
              key: 'login',
              label: 'Вход',
              children: (
                <Form form={loginForm} layout="vertical" onFinish={(v) => void onLoginSubmit(v)}>
                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[{ required: true, type: 'email', message: 'Укажите email' }]}
                  >
                    <Input autoComplete="email" />
                  </Form.Item>
                  <Form.Item
                    label="Пароль"
                    name="password"
                    rules={[{ required: true, min: 6, message: 'Минимум 6 символов' }]}
                  >
                    <Input.Password autoComplete="current-password" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block loading={session.isLoading}>
                    Войти
                  </Button>
                </Form>
              ),
            },
            {
              key: 'register',
              label: 'Регистрация',
              children: (
                <Form
                  form={registerForm}
                  layout="vertical"
                  initialValues={{ accountType: 'USER' as const }}
                  onFinish={(v) => void onRegisterSubmit(v)}
                >
                  <Form.Item label="Тип аккаунта" name="accountType">
                    <Radio.Group optionType="button" buttonStyle="solid">
                      <Radio.Button value="USER">Клиент</Radio.Button>
                      <Radio.Button value="COMPANY">Компания</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item
                    label="ФИО / контактное лицо"
                    name="fullName"
                    rules={[{ required: true, min: 2, message: 'Минимум 2 символа' }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item label="Телефон" name="phone">
                    <Input />
                  </Form.Item>
                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[{ required: true, type: 'email', message: 'Укажите email' }]}
                  >
                    <Input autoComplete="email" />
                  </Form.Item>
                  <Form.Item
                    label="Пароль"
                    name="password"
                    rules={[{ required: true, min: 6, message: 'Минимум 6 символов' }]}
                  >
                    <Input.Password autoComplete="new-password" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block loading={session.isLoading}>
                    Зарегистрироваться
                  </Button>
                </Form>
              ),
            },
          ]}
        />

        {devLoginEnabled ? (
          <Typography.Paragraph type="secondary" style={{ marginTop: 16, fontSize: 12, textAlign: 'center' }}>
            Dev: быстрый вход без пароля
            <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Button
                size="small"
                loading={session.isLoading}
                onClick={async () => {
                  if (await session.loginAs('admin')) {
                    navigate('/admin/company', { replace: true })
                  }
                }}
              >
                Компания
              </Button>
              <Button
                size="small"
                loading={session.isLoading}
                onClick={async () => {
                  if (await session.loginAs('user')) {
                    navigate('/user/marketplace', { replace: true })
                  }
                }}
              >
                Клиент
              </Button>
            </div>
          </Typography.Paragraph>
        ) : null}
      </Card>
    </div>
  )
})
