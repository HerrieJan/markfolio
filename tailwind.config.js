/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f5f5f5',
          dark: '#1e1e1e',
          'dark-muted': '#2a2a2a',
        },
        border: {
          DEFAULT: '#e5e5e5',
          dark: '#3a3a3a',
        },
      },
      fontFamily: {
        sans: [
          'Segoe UI',
          'Hiragino Sans',
          'Hiragino Kaku Gothic ProN',
          'Yu Gothic UI',
          'Meiryo',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
