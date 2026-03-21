import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#080808',
        surface: {
          DEFAULT: '#111111',
          2: '#1C1C1C',
        },
        border: {
          DEFAULT: '#222222',
          med: '#333333',
        },
        accent: {
          DEFAULT: '#C2F000',
          dim: 'rgba(194,240,0,0.10)',
          glow: 'rgba(194,240,0,0.25)',
        },
        text: {
          DEFAULT: '#FFFFFF',
          med: '#AAAAAA',
        },
        muted: '#888888',
        dim: '#444444',
        danger: {
          DEFAULT: '#FF453A',
          dim: 'rgba(255,69,58,0.10)',
        },
        warning: {
          DEFAULT: '#F59E0B',
          dim: 'rgba(245,158,11,0.15)',
        },
        info: {
          DEFAULT: '#3B82F6',
          dim: 'rgba(59,130,246,0.15)',
        },
      },
      fontFamily: {
        display: ['BebasNeue'],
        ui: ['Syne'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        pill: '100px',
      },
    },
  },
  plugins: [],
} satisfies Config
