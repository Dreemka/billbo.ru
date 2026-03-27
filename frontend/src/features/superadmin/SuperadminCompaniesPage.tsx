import { CheckOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons'
import { Alert, Button, Input, Modal, Select, Space, Switch, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'

import type { SuperadminCompanyAccountRow, SuperadminUpdateUserPayload } from '../../entities/types'
import { superadminApi } from '../../shared/api/services'
import { getErrorMessage } from '../../shared/lib/getErrorMessage'
import { notifyError, notifySuccess } from '../../shared/lib/notify'
import { SuperadminCreateUserModal } from './SuperadminCreateUserModal'
import { useSuperadminList } from './useSuperadminList'

const ROLE_OPTIONS = [
  { value: 'USER' as const, label: 'Клиент' },
  { value: 'COMPANY' as const, label: 'Компания' },
  { value: 'SUPERADMIN' as const, label: 'Супер-админ' },
]

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('ru-RU')
  } catch {
    return iso
  }
}

export function SuperadminCompaniesPage() {
  const { rows, loading, load } = useSuperadminList<SuperadminCompanyAccountRow>(
    () => superadminApi.listCompanies(),
    'Проверьте сеть и права доступа.',
  )
  const [createOpen, setCreateOpen] = useState(false)

  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editEmailDraft, setEditEmailDraft] = useState('')
  const [editPasswordDraft, setEditPasswordDraft] = useState('')
  const [editFullNameDraft, setEditFullNameDraft] = useState('')
  const [editPhoneDraft, setEditPhoneDraft] = useState('')
  const [editAvatarDraft, setEditAvatarDraft] = useState('')
  const [editRoleDraft, setEditRoleDraft] = useState<'USER' | 'COMPANY' | 'SUPERADMIN'>('COMPANY')
  const [editCompanyNameDraft, setEditCompanyNameDraft] = useState('')
  const [editCompanyCityDraft, setEditCompanyCityDraft] = useState('')
  const [editCompanyDescDraft, setEditCompanyDescDraft] = useState('')
  const [editCompanyVerifiedDraft, setEditCompanyVerifiedDraft] = useState(false)

  function beginEdit(r: SuperadminCompanyAccountRow) {
    setEditingUserId(r.id)
    setEditEmailDraft(r.email)
    setEditPasswordDraft('')
    setEditFullNameDraft(r.fullName)
    setEditPhoneDraft(r.phone ?? '')
    setEditAvatarDraft(r.avatarUrl ?? '')
    setEditRoleDraft((r.role as 'USER' | 'COMPANY' | 'SUPERADMIN') || 'COMPANY')
    setEditCompanyNameDraft(r.company?.name ?? '')
    setEditCompanyCityDraft(r.company?.city ?? '')
    setEditCompanyDescDraft(r.company?.description ?? '')
    setEditCompanyVerifiedDraft(r.company?.isVerified ?? false)
  }

  function cancelEdit() {
    setEditingUserId(null)
    setEditPasswordDraft('')
  }

  function buildPayload(): SuperadminUpdateUserPayload | null {
    const email = editEmailDraft.trim()
    const fullName = editFullNameDraft.trim()
    const phone = editPhoneDraft.trim()
    if (!email || fullName.length < 2 || phone.length < 10) return null

    const payload: SuperadminUpdateUserPayload = {
      email,
      fullName,
      phone,
      role: editRoleDraft,
    }
    const av = editAvatarDraft.trim()
    if (av) payload.avatarUrl = av
    if (editPasswordDraft.trim()) payload.password = editPasswordDraft.trim()

    if (editRoleDraft === 'COMPANY') {
      const cn = editCompanyNameDraft.trim()
      const cc = editCompanyCityDraft.trim()
      if (cn.length < 2 || cc.length < 2) return null
      payload.companyName = cn
      payload.companyCity = cc
      const d = editCompanyDescDraft.trim()
      if (d) payload.companyDescription = d
      payload.companyIsVerified = editCompanyVerifiedDraft
    }
    return payload
  }

  async function doSave(userId: string) {
    const payload = buildPayload()
    if (!payload) {
      notifyError('Проверьте поля', 'Email, имя, телефон; для компании — название и город.')
      return
    }
    setSaving(true)
    try {
      await superadminApi.updateUser(userId, payload)
      notifySuccess('Сохранено', 'Данные пользователя обновлены.')
      cancelEdit()
      await load()
    } catch (e) {
      console.error(e)
      notifyError('Ошибка сохранения', getErrorMessage(e, 'Не удалось сохранить.'))
    } finally {
      setSaving(false)
    }
  }

  function saveEdit(r: SuperadminCompanyAccountRow) {
    const payload = buildPayload()
    if (!payload) {
      notifyError('Проверьте поля', 'Email, имя, телефон; для компании — название и город.')
      return
    }
    if (r.role === 'COMPANY' && editRoleDraft !== 'COMPANY') {
      Modal.confirm({
        title: 'Сменить роль?',
        content:
          'Профиль компании и все привязанные конструкции будут удалены. Это действие нельзя отменить.',
        okText: 'Продолжить',
        cancelText: 'Отмена',
        okButtonProps: { danger: true },
        onOk: () => void doSave(r.id),
      })
      return
    }
    void doSave(r.id)
  }

  const isEditing = Boolean(editingUserId)

  const columns: ColumnsType<SuperadminCompanyAccountRow> = useMemo(
    () => [
      {
        title: 'ID пользователя',
        dataIndex: 'id',
        key: 'id',
        width: 120,
        ellipsis: true,
        render: (v) => v,
      },
      {
        title: 'Email',
        key: 'email',
        width: isEditing ? 220 : 200,
        render: (_, r) =>
          editingUserId === r.id ? (
            <Space orientation="vertical" size={4} style={{ width: '100%', minWidth: 200 }}>
              <Input value={editEmailDraft} onChange={(e) => setEditEmailDraft(e.target.value)} disabled={saving} />
              <Input.Password
                value={editPasswordDraft}
                onChange={(e) => setEditPasswordDraft(e.target.value)}
                placeholder="Новый пароль (необязательно)"
                disabled={saving}
              />
            </Space>
          ) : (
            r.email
          ),
      },
      {
        title: 'Имя',
        key: 'fullName',
        width: isEditing ? 180 : 160,
        render: (_, r) =>
          editingUserId === r.id ? (
            <Input value={editFullNameDraft} onChange={(e) => setEditFullNameDraft(e.target.value)} disabled={saving} />
          ) : (
            r.fullName
          ),
      },
      {
        title: 'Телефон',
        key: 'phone',
        width: 140,
        render: (_, r) =>
          editingUserId === r.id ? (
            <Input value={editPhoneDraft} onChange={(e) => setEditPhoneDraft(e.target.value)} disabled={saving} />
          ) : (
            r.phone ?? '—'
          ),
      },
      {
        title: 'Аватар (URL)',
        key: 'avatarUrl',
        width: isEditing ? 200 : 160,
        ellipsis: !isEditing,
        render: (_, r) =>
          editingUserId === r.id ? (
            <Input value={editAvatarDraft} onChange={(e) => setEditAvatarDraft(e.target.value)} disabled={saving} />
          ) : (
            r.avatarUrl || '—'
          ),
      },
      {
        title: 'Роль',
        key: 'role',
        width: 140,
        render: (_, r) =>
          editingUserId === r.id ? (
            <Select
              value={editRoleDraft}
              onChange={(v) => setEditRoleDraft(v)}
              disabled={saving}
              style={{ width: '100%', minWidth: 130 }}
              options={ROLE_OPTIONS}
            />
          ) : (
            r.role
          ),
      },
      {
        title: 'Регистрация',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        render: (v: string) => fmtDate(v),
      },
      {
        title: 'Обновлён',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 160,
        render: (v: string) => fmtDate(v),
      },
      {
        title: 'ID компании',
        key: 'companyId',
        width: 120,
        ellipsis: true,
        render: (_, r) => r.company?.id ?? '—',
      },
      {
        title: 'Компания',
        key: 'companyName',
        width: isEditing ? 180 : 160,
        render: (_, r) =>
          editingUserId === r.id && editRoleDraft === 'COMPANY' ? (
            <Input value={editCompanyNameDraft} onChange={(e) => setEditCompanyNameDraft(e.target.value)} disabled={saving} />
          ) : (
            r.company?.name ?? '—'
          ),
      },
      {
        title: 'Город',
        key: 'companyCity',
        width: 140,
        render: (_, r) =>
          editingUserId === r.id && editRoleDraft === 'COMPANY' ? (
            <Input value={editCompanyCityDraft} onChange={(e) => setEditCompanyCityDraft(e.target.value)} disabled={saving} />
          ) : (
            r.company?.city ?? '—'
          ),
      },
      {
        title: 'Описание компании',
        key: 'companyDesc',
        width: isEditing ? 260 : 200,
        render: (_, r) =>
          editingUserId === r.id && editRoleDraft === 'COMPANY' ? (
            <Input.TextArea
              rows={2}
              value={editCompanyDescDraft}
              onChange={(e) => setEditCompanyDescDraft(e.target.value)}
              disabled={saving}
              maxLength={2000}
            />
          ) : (
            r.company?.description ?? '—'
          ),
      },
      {
        title: 'Вериф.',
        key: 'verified',
        width: 100,
        render: (_, r) =>
          editingUserId === r.id && editRoleDraft === 'COMPANY' ? (
            <Switch checked={editCompanyVerifiedDraft} onChange={setEditCompanyVerifiedDraft} disabled={saving} />
          ) : (
            r.company?.isVerified ? 'Да' : 'Нет'
          ),
      },
      {
        title: 'Компания создана',
        key: 'companyCreated',
        width: 160,
        render: (_, r) => (r.company ? fmtDate(r.company.createdAt) : '—'),
      },
      {
        title: 'Компания обновлена',
        key: 'companyUpdated',
        width: 160,
        render: (_, r) => (r.company ? fmtDate(r.company.updatedAt) : '—'),
      },
      {
        title: 'Действия',
        key: 'actions',
        fixed: 'right',
        width: isEditing ? 108 : 88,
        align: 'center',
        render: (_, r) =>
          editingUserId === r.id ? (
            <Space size={8}>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                aria-label="Сохранить"
                loading={saving}
                onClick={() => saveEdit(r)}
              />
              <Button icon={<CloseOutlined />} aria-label="Отменить" disabled={saving} onClick={cancelEdit} />
            </Space>
          ) : (
            <Button type="text" icon={<EditOutlined />} aria-label="Редактировать" onClick={() => beginEdit(r)} />
          ),
      },
    ],
    [
      editingUserId,
      editEmailDraft,
      editPasswordDraft,
      editFullNameDraft,
      editPhoneDraft,
      editAvatarDraft,
      editRoleDraft,
      editCompanyNameDraft,
      editCompanyCityDraft,
      editCompanyDescDraft,
      editCompanyVerifiedDraft,
      saving,
      isEditing,
    ],
  )

  return (
    <div style={{ paddingLeft: 20, paddingRight: 20 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div>
          <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
            Компании
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Все зарегистрированные аккаунты с ролью компании (операторы рекламных поверхностей).
          </Typography.Paragraph>
        </div>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          Добавить пользователя
        </Button>
      </div>
      <SuperadminCreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => void load()} />
      {!loading && rows.length === 0 ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="Нет аккаунтов с ролью «Компания»"
          description="Учётки SUPERADMIN и обычные клиенты (USER) здесь не показываются — смотрите разделы «Супер-админы» и «Клиенты». Добавьте компанию кнопкой выше или зарегистрируйте оператора с типом «Компания»."
        />
      ) : null}
      <Table<SuperadminCompanyAccountRow>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        scroll={editingUserId ? { x: 'max-content' } : { x: 2600 }}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        onRow={(record) => ({
          className: editingUserId === record.id ? 'admin-billboard-table-row--editing' : undefined,
        })}
      />
    </div>
  )
}
