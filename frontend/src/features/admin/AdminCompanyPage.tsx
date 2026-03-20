import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { Button, Card, Input, Space, Typography } from 'antd'
import { useStore } from '../../app/store/rootStore'
import { notifyError, notifySuccess } from '../../shared/lib/notify'

export const AdminCompanyPage = observer(function AdminCompanyPage() {
  const { company, session, user } = useStore()
  const [companyEditing, setCompanyEditing] = useState(false)
  const [companyNameDraft, setCompanyNameDraft] = useState(company.profile.name)
  const [companyCityDraft, setCompanyCityDraft] = useState(company.profile.city)
  const [companyDescriptionDraft, setCompanyDescriptionDraft] = useState(company.profile.description)

  const [repEditing, setRepEditing] = useState(false)
  const [repFullNameDraft, setRepFullNameDraft] = useState(user.profile.fullName)
  const [repEmailDraft, setRepEmailDraft] = useState(user.profile.email)
  const [repPhoneDraft, setRepPhoneDraft] = useState(user.profile.phone)
  const [repAvatarUrlDraft, setRepAvatarUrlDraft] = useState(user.profile.avatarUrl || '')

  const [newPasswordDraft, setNewPasswordDraft] = useState('')
  const [repeatPasswordDraft, setRepeatPasswordDraft] = useState('')

  const canEdit = session.role === 'admin'
  const isValidCompany = companyNameDraft.trim().length > 1 && companyCityDraft.trim().length > 1 && companyDescriptionDraft.trim().length > 10
  const isValidRepEmail = repEmailDraft.includes('@') && repEmailDraft.includes('.')
  const isValidRepProfile = repFullNameDraft.trim().length > 1 && isValidRepEmail && repPhoneDraft.trim().length >= 10

  useEffect(() => {
    if (session.role !== 'admin') return
    void company.loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.role])

  useEffect(() => {
    if (session.role !== 'admin') return
    user.isProfileLoaded = false
    void user.loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.role])

  useEffect(() => {
    if (!companyEditing) {
      setCompanyNameDraft(company.profile.name)
      setCompanyCityDraft(company.profile.city)
      setCompanyDescriptionDraft(company.profile.description)
    }
  }, [company.profile.name, company.profile.city, company.profile.description, companyEditing])

  useEffect(() => {
    if (!repEditing) {
      setRepFullNameDraft(user.profile.fullName)
      setRepEmailDraft(user.profile.email)
      setRepPhoneDraft(user.profile.phone)
      setRepAvatarUrlDraft(user.profile.avatarUrl || '')
      setNewPasswordDraft('')
      setRepeatPasswordDraft('')
    }
  }, [user.profile.fullName, user.profile.email, user.profile.phone, user.profile.avatarUrl, repEditing])

  function resetRepPasswordDrafts() {
    setNewPasswordDraft('')
    setRepeatPasswordDraft('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
      <div style={{ width: '100%', paddingLeft: 20 }}>
        <Typography.Title level={4}>Профиль компании</Typography.Title>
        <Typography.Paragraph>
          Раздел для настройки информации о компании-операторе рекламных поверхностей.
        </Typography.Paragraph>
      </div>
      <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap', width: '100%' }}>
        <div style={{ flex: '1 1 0', minWidth: 320 }}>
          <Card>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              Компания
            </Typography.Title>
            {companyEditing ? (
              <Space orientation="vertical" size={5} style={{ width: '100%' }}>
                <Input
                  placeholder="Название"
                  value={companyNameDraft}
                  onChange={(event) => setCompanyNameDraft(event.target.value)}
                  disabled={!canEdit || company.isSaving}
                />
                <Input
                  placeholder="Город"
                  value={companyCityDraft}
                  onChange={(event) => setCompanyCityDraft(event.target.value)}
                  disabled={!canEdit || company.isSaving}
                />
                <Input.TextArea
                  placeholder="Описание"
                  value={companyDescriptionDraft}
                  onChange={(event) => setCompanyDescriptionDraft(event.target.value)}
                  rows={4}
                  disabled={!canEdit || company.isSaving}
                />

                {company.lastError ? (
                  <Typography.Paragraph type="danger" style={{ marginTop: 2, marginBottom: 0 }}>
                    {company.lastError}
                  </Typography.Paragraph>
                ) : null}

                <Space orientation="horizontal" size={5}>
                  <Button
                    type="primary"
                    disabled={!canEdit || session.isLoading || !isValidCompany || company.isSaving}
                    loading={company.isSaving}
                    onClick={async () => {
                      await company.updateProfile({ name: companyNameDraft, city: companyCityDraft, description: companyDescriptionDraft })
                      if (company.lastError) {
                        notifyError('Ошибка сохранения', company.lastError)
                        return
                      }
                      notifySuccess('Профиль компании сохранен')
                      setCompanyEditing(false)
                    }}
                  >
                    Сохранить
                  </Button>
                  <Button
                    onClick={() => {
                      setCompanyNameDraft(company.profile.name)
                      setCompanyCityDraft(company.profile.city)
                      setCompanyDescriptionDraft(company.profile.description)
                      setCompanyEditing(false)
                    }}
                    disabled={company.isSaving}
                  >
                    Отменить
                  </Button>
                </Space>
              </Space>
            ) : (
              <Space orientation="vertical" size={5}>
                <Typography.Paragraph style={{ marginBottom: 0 }}>Название: {company.profile.name || '—'}</Typography.Paragraph>
                <Typography.Paragraph style={{ marginBottom: 0 }}>Город: {company.profile.city || '—'}</Typography.Paragraph>
                <Typography.Paragraph style={{ marginBottom: 0 }}>Описание: {company.profile.description || '—'}</Typography.Paragraph>
                <Button type="primary" disabled={!canEdit} onClick={() => setCompanyEditing(true)}>
                  Редактировать
                </Button>
              </Space>
            )}
          </Card>
        </div>

        <div style={{ flex: '1 1 0', minWidth: 320 }}>
          <Card>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              Представитель
            </Typography.Title>
            {repEditing ? (
              <Space orientation="vertical" size={5} style={{ width: '100%' }}>
                <Input
                  placeholder="ФИО"
                  value={repFullNameDraft}
                  onChange={(event) => setRepFullNameDraft(event.target.value)}
                  disabled={!canEdit || user.isSaving}
                />
                <Input
                  placeholder="Email"
                  value={repEmailDraft}
                  onChange={(event) => setRepEmailDraft(event.target.value)}
                  disabled={!canEdit || user.isSaving}
                />
                <Input
                  placeholder="Телефон"
                  value={repPhoneDraft}
                  onChange={(event) => setRepPhoneDraft(event.target.value)}
                  disabled={!canEdit || user.isSaving}
                />

                <Input
                  placeholder="Аватар (URL)"
                  value={repAvatarUrlDraft}
                  onChange={(event) => setRepAvatarUrlDraft(event.target.value)}
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
                    disabled={!canEdit || session.isLoading || !isValidRepProfile || user.isSaving}
                    loading={user.isSaving}
                    onClick={async () => {
                      await user.updateProfile({
                        fullName: repFullNameDraft,
                        email: repEmailDraft,
                        phone: repPhoneDraft,
                        avatarUrl: repAvatarUrlDraft.trim() || undefined,
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

                      notifySuccess('Профиль представителя сохранен')
                      setRepEditing(false)
                      resetRepPasswordDrafts()
                    }}
                  >
                    Сохранить
                  </Button>
                  <Button
                    onClick={() => {
                      setRepFullNameDraft(user.profile.fullName)
                      setRepEmailDraft(user.profile.email)
                      setRepPhoneDraft(user.profile.phone)
                      setRepAvatarUrlDraft(user.profile.avatarUrl || '')
                      setRepEditing(false)
                      resetRepPasswordDrafts()
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

                <Button type="primary" disabled={!canEdit} onClick={() => setRepEditing(true)}>
                  Редактировать
                </Button>
              </Space>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
})
