import type { ThemeConfig } from 'antd'

export const palette = {
  lavender: '#0f1131',
  indigo: '#9826DB',
  slate: '#0f1131',
  sand: '#ffffff',
  clay: '#0f1131',
  text: '#444444',
} as const

export const appThemeToken: ThemeConfig = {
  // algorithm: antdTheme.darkAlgorithm,
  token: {
    colorPrimary: palette.indigo,
    colorInfo: palette.indigo,
    colorSuccess: palette.lavender,
    colorWarning: palette.clay,
    colorError: palette.clay,
    colorTextBase: palette.text,
    colorBgBase: palette.sand,
    colorBorder: palette.clay,
    borderRadius: 10,
  },
}
