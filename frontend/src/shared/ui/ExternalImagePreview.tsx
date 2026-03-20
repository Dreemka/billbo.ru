import { Button, Space, Typography } from 'antd'
import { useState } from 'react'

type ExternalImagePreviewProps = {
  src: string
  alt?: string
}

/**
 * Внешние CDN (в т.ч. preview Яндекс.Диска) часто режут встраивание по Referer.
 * `referrerPolicy="no-referrer"` обычно позволяет открыть картинку в <img>.
 */
export function ExternalImagePreview({ src, alt = 'Фото' }: ExternalImagePreviewProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <Space orientation="vertical" size={8} style={{ width: '100%' }}>
        <Typography.Text type="secondary">
          Не удалось показать изображение здесь (ограничения хостинга ссылки).
        </Typography.Text>
        <Button type="link" href={src} target="_blank" rel="noopener noreferrer" style={{ padding: 0 }}>
          Открыть в новой вкладке
        </Button>
      </Space>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8, display: 'block' }}
      onError={() => setFailed(true)}
    />
  )
}
