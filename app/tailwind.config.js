/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Johnny Decimal inspired colors
        jd: {
          navy: '#1a365d',
          teal: '#0d9488',
          orange: '#ea580c',
          slate: '#475569',
          light: '#f8fafc',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
