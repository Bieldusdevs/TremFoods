import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF9F6',
        surface: '#FFFFFF',
        line: '#E8E4DB',
        ink: '#1C1A16',
        muted: '#6E695F',
        accent: { DEFAULT: '#E9A400', hover: '#F6B50E', ink: '#221800' },
        brand: '#FF7A00',
        danger: '#C43D3D',
        success: '#1F7A4D',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-sora)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,26,22,0.05), 0 8px 24px -12px rgba(28,26,22,0.12)',
        float: '0 12px 40px -12px rgba(28,26,22,0.25)',
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};
export default config;
