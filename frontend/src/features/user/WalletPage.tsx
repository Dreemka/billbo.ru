import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { Card, InputNumber, Button, Space, Typography } from 'antd'
import { useStore } from '../../app/store/rootStore'

export const WalletPage = observer(function WalletPage() {
  const { user, session } = useStore()
  const [topUpValue, setTopUpValue] = useState(10000)
  const canEdit = session.role === 'user'

  useEffect(() => {
    if (session.role !== 'user') return
    void user.loadWallet()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.role])

  return (
    <Card>
      <Typography.Title level={4}>Кошелек</Typography.Title>
      <Typography.Paragraph>
        Текущий баланс: {user.walletBalance.toLocaleString('ru-RU')} RUB
      </Typography.Paragraph>
      {user.lastError ? (
        <Typography.Paragraph type="danger" style={{ marginTop: 12 }}>
          {user.lastError}
        </Typography.Paragraph>
      ) : null}
      <Space>
        <InputNumber
          value={topUpValue}
          onChange={(value) => setTopUpValue(value ?? 0)}
          disabled={!canEdit}
          min={0}
        />
        <Button
          type="primary"
          disabled={!canEdit || session.isLoading || topUpValue <= 0 || user.isSaving}
          loading={user.isSaving}
          onClick={() => void user.topUp(topUpValue)}
        >
          Пополнить
        </Button>
      </Space>
    </Card>
  )
})
