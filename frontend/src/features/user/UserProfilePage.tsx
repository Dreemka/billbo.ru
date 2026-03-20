import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { Button, Card, Form, Input, Typography } from 'antd'
import { useStore } from '../../app/store/rootStore'
import { notifyError, notifySuccess } from '../../shared/lib/notify'

export const UserProfilePage = observer(function UserProfilePage() {
  const { user, session } = useStore()
  const [fullName, setFullName] = useState(user.profile.fullName)
  const [email, setEmail] = useState(user.profile.email)
  const [phone, setPhone] = useState(user.profile.phone)
  const [avatarUrl, setAvatarUrl] = useState(user.profile.avatarUrl || '')
  const canEdit = session.role === 'user'
  const isValid = fullName.trim().length > 2 && email.includes('@') && phone.trim().length >= 10

  useEffect(() => {
    if (session.role !== 'user') return
    void user.loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.role])

  useEffect(() => {
    setFullName(user.profile.fullName)
    setEmail(user.profile.email)
    setPhone(user.profile.phone)
    setAvatarUrl(user.profile.avatarUrl || '')
  }, [user.profile.fullName, user.profile.email, user.profile.phone, user.profile.avatarUrl])

  return (
    <Card>
      <Typography.Title level={4}>Профиль пользователя</Typography.Title>
      <Form layout="vertical" className="app-form">
        <Form.Item label="ФИО">
          <Input value={fullName} onChange={(event) => setFullName(event.target.value)} disabled={!canEdit} />
        </Form.Item>
        <Form.Item label="Email">
          <Input value={email} onChange={(event) => setEmail(event.target.value)} disabled={!canEdit} />
        </Form.Item>
        <Form.Item label="Телефон">
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} disabled={!canEdit} />
        </Form.Item>
        <Form.Item label="Аватар (URL)">
          <Input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} disabled={!canEdit} />
        </Form.Item>
      </Form>

      {user.lastError ? (
        <Typography.Paragraph type="danger" style={{ marginTop: 12 }}>
          {user.lastError}
        </Typography.Paragraph>
      ) : null}

      <Button
        type="primary"
        disabled={!canEdit || session.isLoading || !isValid || user.isSaving}
        loading={user.isSaving}
        onClick={async () => {
          await user.updateProfile({ fullName, email, phone, avatarUrl: avatarUrl.trim() || undefined })
          if (user.lastError) {
            notifyError('Ошибка сохранения', user.lastError)
            return
          }
          notifySuccess('Профиль сохранен')
        }}
      >
        Сохранить
      </Button>
    </Card>
  )
})
