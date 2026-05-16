import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#07080f',
        card: '#101325',
        accent: '#5577ff',
      },
      boxShadow: {
        glow: '0 0 40px rgba(85, 119, 255, 0.25)',
      },
      borderRadius: {
        xl2: '1rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
