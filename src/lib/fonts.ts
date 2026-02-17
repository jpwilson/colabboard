export const BOARD_FONTS = [
  { label: 'Sans Serif', value: 'Inter, sans-serif' },
  { label: 'Handwritten', value: 'Caveat, cursive' },
  { label: 'Monospace', value: "'IBM Plex Mono', monospace" },
  { label: 'Rounded', value: 'Nunito, sans-serif' },
] as const

export type BoardFontFamily = (typeof BOARD_FONTS)[number]['value']
