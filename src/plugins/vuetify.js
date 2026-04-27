import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

export default createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'cadenceDark',
    themes: {
      cadenceDark: {
        dark: true,
        colors: {
          background:    '#0D0D0F',
          surface:       '#1A1A1F',
          primary:       '#C8A96E',
          secondary:     '#6E8EAD',
          accent:        '#E8572A',
          error:         '#CF4B4B',
          success:       '#4B9E6F',
          onBackground:  '#E8E8E0',
          onSurface:     '#C4C4BC',
        },
      },
    },
  },
  defaults: {
    VCard: {
      rounded: 'lg',
    },
  },
  display: {
    mobileBreakpoint: 'sm',
  },
})
