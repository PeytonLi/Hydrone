import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        panel: {
          bg: '#0a0a1a',
          border: '#1e2a3a',
          accent: '#22d3ee',
          dim: '#94a3b8',
          warn: '#f59e0b',
          green: '#10b981',
          red: '#ef4444',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      keyframes: {
        'flash-yellow': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '20%': { backgroundColor: 'rgba(234, 179, 8, 0.3)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        'flash-yellow': 'flash-yellow 0.8s ease-out',
        blink: 'blink 0.8s step-end infinite',
      },
    },
  },
  plugins: [],
};

export default config;
