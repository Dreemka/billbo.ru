import { Typography } from 'antd'
import logoFullUrl from '../../assets/imgages/logo-full.svg'

export type AuthCardHeaderProps = {
  /** Подзаголовок под логотипом (если не передан — не показывается) */
  subtitle?: string
  /** Максимальная высота логотипа в px */
  logoMaxHeight?: number
}

export function AuthCardHeader({ subtitle, logoMaxHeight = 56 }: AuthCardHeaderProps) {
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <img
          src={logoFullUrl}
          alt="Billbo.ru"
          style={{
            maxWidth: '100%',
            height: 'auto',
            maxHeight: logoMaxHeight,
            display: 'inline-block',
          }}
        />
      </div>
      {subtitle ? (
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 0 }}>
          {subtitle}
        </Typography.Paragraph>
      ) : null}
    </>
  )
}
