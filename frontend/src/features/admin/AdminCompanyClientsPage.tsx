import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'

import type { CompanyBookingClientRow } from '../../entities/types'
import { companyApi } from '../../shared/api/services'
import { getErrorMessage } from '../../shared/lib/getErrorMessage'
import { notifyError } from '../../shared/lib/notify'
import { useStore } from '../../app/store/rootStore'

export const AdminCompanyClientsPage = observer(function AdminCompanyClientsPage() {
  const { session } = useStore()
  const [rows, setRows] = useState<CompanyBookingClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const seqRef = useRef(0)

  const load = useCallback(async () => {
    if (session.role !== 'admin') return
    const seq = ++seqRef.current
    setLoading(true)
    try {
      const { data } = await companyApi.listBookingClients()
      if (seq !== seqRef.current) return
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      if (seq !== seqRef.current) return
      setRows([])
      notifyError('Не удалось загрузить клиентов', getErrorMessage(e, 'Проверьте сеть и права доступа.'))
    } finally {
      if (seq === seqRef.current) setLoading(false)
    }
  }, [session.role])

  useEffect(() => {
    void load()
  }, [load])

  const columns: ColumnsType<CompanyBookingClientRow> = useMemo(
    () => [
      {
        title: 'ФИО',
        dataIndex: 'fullName',
        key: 'fullName',
        ellipsis: true,
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
        ellipsis: true,
      },
      {
        title: 'Телефон',
        dataIndex: 'phone',
        key: 'phone',
        width: 160,
        render: (v: string | null) => v ?? '—',
      },
      {
        title: 'Бронь',
        dataIndex: 'bookingsWithCompany',
        key: 'bookingsWithCompany',
        width: 100,
        align: 'right',
      },
    ],
    [],
  )

  if (session.role !== 'admin') {
    return null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 15, width: '100%', paddingLeft: 20 }}>
      <div>
        <Typography.Title level={4} style={{ marginBottom: 8 }}>
          Клиенты
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Контакты и число бронирований ваших конструкций (только по этой компании).
        </Typography.Paragraph>
      </div>

      <Table<CompanyBookingClientRow>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 20, showSizeChanger: true }}
      />
    </div>
  )
})
