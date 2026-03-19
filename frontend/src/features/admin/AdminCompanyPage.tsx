import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { Button, Card, Form, Input, Typography } from 'antd'
import { useStore } from '../../app/store/rootStore'

export const AdminCompanyPage = observer(function AdminCompanyPage() {
  const { company, session, user } = useStore()
  const [name, setName] = useState(company.profile.name)
  const [city, setCity] = useState(company.profile.city)
  const [description, setDescription] = useState(company.profile.description)

  const canEdit = session.role === 'admin'
  const isValid = name.trim().length > 1 && city.trim().length > 1 && description.trim().length > 10

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
    setName(company.profile.name)
    setCity(company.profile.city)
    setDescription(company.profile.description)
  }, [company.profile.name, company.profile.city, company.profile.description])

  return (
    <>
      <Card>
      <Typography.Title level={4}>Профиль компании</Typography.Title>
      <Typography.Paragraph>
        Раздел для настройки информации о компании-операторе рекламных поверхностей.
      </Typography.Paragraph>

      <Form layout="vertical">
        <Form.Item label="Название">
          <Input value={name} onChange={(event) => setName(event.target.value)} disabled={!canEdit} />
        </Form.Item>
        <Form.Item label="Город">
          <Input value={city} onChange={(event) => setCity(event.target.value)} disabled={!canEdit} />
        </Form.Item>
        <Form.Item label="Описание">
          <Input.TextArea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            disabled={!canEdit}
          />
        </Form.Item>
      </Form>

      {company.lastError ? (
        <Typography.Paragraph type="danger" style={{ marginTop: 12 }}>
          {company.lastError}
        </Typography.Paragraph>
      ) : null}

      <Button
        type="primary"
        disabled={!canEdit || session.isLoading || !isValid || company.isSaving}
        loading={company.isSaving}
        onClick={() => void company.updateProfile({ name, city, description })}
      >
        Сохранить
      </Button>
    </Card>

    <Card style={{ marginTop: 16 }}>
      <Typography.Title level={4}>Профиль представителя</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Данные, которые были указаны при регистрации аккаунта компании.
      </Typography.Paragraph>

      <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
        ФИО: {user.profile.fullName || '—'}
      </Typography.Paragraph>
      <Typography.Paragraph style={{ marginBottom: 0 }}>Email: {user.profile.email || '—'}</Typography.Paragraph>
      <Typography.Paragraph style={{ marginBottom: 0 }}>
        Телефон: {user.profile.phone || '—'}
      </Typography.Paragraph>

      {user.lastError ? (
        <Typography.Paragraph type="danger" style={{ marginTop: 12, marginBottom: 0 }}>
          {user.lastError}
        </Typography.Paragraph>
      ) : null}
    </Card>
    </>
  )
})
