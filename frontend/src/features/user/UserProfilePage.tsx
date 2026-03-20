import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { Button, Card, Input, Space, Typography } from 'antd'
import { useStore } from '../../app/store/rootStore'
import { notifyError, notifySuccess } from '../../shared/lib/notify'

export const UserProfilePage = observer(function UserProfilePage() {
  const { user, session } = useStore()
  const [editing, setEditing] = useState(false)
  const [fullNameDraft, setFullNameDraft] = useState(user.profile.fullName)
  const [emailDraft, setEmailDraft] = useState(user.profile.email)
  const [phoneDraft, setPhoneDraft] = useState(user.profile.phone)
  const [avatarUrlDraft, setAvatarUrlDraft] = useState(user.profile.avatarUrl || '')

  const [newPasswordDraft, setNewPasswordDraft] = useState('')
  const [repeatPasswordDraft, setRepeatPasswordDraft] = useState('')
  const canEdit = session.role === 'user'
  const isValid = fullNameDraft.trim().length > 2 && emailDraft.includes('@') && phoneDraft.trim().length >= 10

  useEffect(() => {
    if (session.role !== 'user') return
    void user.loadProfile()
  }, [session.role, user])

  useEffect(() => {
    if (editing) return
    setFullNameDraft(user.profile.fullName)
    setEmailDraft(user.profile.email)
    setPhoneDraft(user.profile.phone)
    setAvatarUrlDraft(user.profile.avatarUrl || '')
    setNewPasswordDraft('')
    setRepeatPasswordDraft('')
  }, [editing, user.profile.fullName, user.profile.email, user.profile.phone, user.profile.avatarUrl])

  function resetPasswordDrafts() {
    setNewPasswordDraft('')
    setRepeatPasswordDraft('')
  }

  return (
    <>
      <div style={{ paddingLeft: 20 }}>
        <Typography.Title level={4}>Профиль пользователя</Typography.Title>
      </div>

      <Card>
        {editing ? (
          <Space orientation="vertical" size={5} style={{ width: '100%' }}>
            <Input
              placeholder="ФИО"
              value={fullNameDraft}
              onChange={(event) => setFullNameDraft(event.target.value)}
              disabled={!canEdit || user.isSaving}
            />
            <Input
              placeholder="Email"
              value={emailDraft}
              onChange={(event) => setEmailDraft(event.target.value)}
              disabled={!canEdit || user.isSaving}
            />
            <Input
              placeholder="Телефон"
              value={phoneDraft}
              onChange={(event) => setPhoneDraft(event.target.value)}
              disabled={!canEdit || user.isSaving}
            />
            <Input
              placeholder="Аватар (URL)"
              value={avatarUrlDraft}
              onChange={(event) => setAvatarUrlDraft(event.target.value)}
              disabled={!canEdit || user.isSaving}
            />

            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Пароли
            </Typography.Paragraph>
            <Input.Password
              placeholder="Новый пароль"
              value={newPasswordDraft}
              onChange={(event) => setNewPasswordDraft(event.target.value)}
              disabled={!canEdit || user.isSaving}
            />
            <Input.Password
              placeholder="Повторите пароль"
              value={repeatPasswordDraft}
              onChange={(event) => setRepeatPasswordDraft(event.target.value)}
              disabled={!canEdit || user.isSaving}
            />

            {user.lastError ? (
              <Typography.Paragraph type="danger" style={{ marginTop: 2, marginBottom: 0 }}>
                {user.lastError}
              </Typography.Paragraph>
            ) : null}

            <Space orientation="horizontal" size={5}>
              <Button
                type="primary"
                disabled={!canEdit || session.isLoading || !isValid || user.isSaving}
                loading={user.isSaving}
                onClick={async () => {
                  await user.updateProfile({
                    fullName: fullNameDraft,
                    email: emailDraft,
                    phone: phoneDraft,
                    avatarUrl: avatarUrlDraft.trim() || undefined,
                  })
                  if (user.lastError) {
                    notifyError('Ошибка сохранения', user.lastError)
                    return
                  }

                  const hasPassword = newPasswordDraft.trim().length > 0 || repeatPasswordDraft.trim().length > 0
                  if (hasPassword) {
                    if (newPasswordDraft !== repeatPasswordDraft) {
                      notifyError('Ошибка сохранения', 'Пароли не совпадают')
                      return
                    }
                    await user.changePassword(newPasswordDraft, repeatPasswordDraft)
                    if (user.lastError) {
                      notifyError('Ошибка сохранения', user.lastError)
                      return
                    }
                  }

                  notifySuccess('Профиль сохранен')
                  setEditing(false)
                  resetPasswordDrafts()
                }}
              >
                Сохранить
              </Button>

              <Button
                onClick={() => {
                  setFullNameDraft(user.profile.fullName)
                  setEmailDraft(user.profile.email)
                  setPhoneDraft(user.profile.phone)
                  setAvatarUrlDraft(user.profile.avatarUrl || '')
                  setEditing(false)
                  resetPasswordDrafts()
                }}
                disabled={user.isSaving}
              >
                Отменить
              </Button>
            </Space>
          </Space>
        ) : (
          <Space orientation="vertical" size={5}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>ФИО: {user.profile.fullName || '—'}</Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 0 }}>Email: {user.profile.email || '—'}</Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 0 }}>Телефон: {user.profile.phone || '—'}</Typography.Paragraph>

            {user.lastError ? (
              <Typography.Paragraph type="danger" style={{ marginTop: 2, marginBottom: 0 }}>
                {user.lastError}
              </Typography.Paragraph>
            ) : null}

            <Button type="primary" disabled={!canEdit} onClick={() => setEditing(true)}>
              Редактировать
            </Button>
          </Space>
        )}

      </Card>
    </>
  )
})
