import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          50: 'var(--color-accent-50)',
          600: 'var(--color-accent-600)',
        },
      },
      borderRadius: {
        xl: '0.875rem',
      },
    },
  },
  plugins: [],
};
export default config;
