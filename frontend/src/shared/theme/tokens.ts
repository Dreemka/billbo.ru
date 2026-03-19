import type { ThemeConfig } from 'antd'

export const palette = {
  lavender: '#F5B0F0',
  indigo: '#7365A6',
  slate: '#6D6F8C',
  sand: '#F2CCB6',
  clay: '#BF8D7A',
} as const

export const appThemeToken: ThemeConfig = {
  // algorithm: antdTheme.darkAlgorithm,
  token: {
    colorPrimary: palette.indigo,
    colorInfo: palette.indigo,
    colorSuccess: palette.lavender,
    colorWarning: palette.clay,
    colorError: palette.clay,
    colorTextBase: palette.indigo,
    colorBgBase: palette.sand,
    colorBorder: palette.clay,
    borderRadius: 10,
  },
}
