import { FileImageOutlined } from '@ant-design/icons'
import { Button } from 'antd'

import { openPhotoByUrl } from '../lib/photoLinkBehavior'

type BillboardPhotoIconButtonProps = {
  url: string
  onOpenModal: (url: string) => void
  className?: string
}

export function BillboardPhotoIconButton({ url, onOpenModal, className }: BillboardPhotoIconButtonProps) {
  const trimmed = url.trim()
  const disabled = !trimmed
  return (
    <Button
      type="text"
      className={className ?? 'app-map-focus-btn'}
      icon={<FileImageOutlined />}
      disabled={disabled}
      aria-label={disabled ? 'Нет фото' : 'Фото'}
      onClick={() => openPhotoByUrl(trimmed, onOpenModal)}
    />
  )
}
