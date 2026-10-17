/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f2fbf5',
          100: '#e1f6e8',
          200: '#c5ecd3',
          300: '#97dcb2',
          400: '#61c38b',
          500: '#38a76d',
          600: '#268754',
          700: '#1e6b44',
          800: '#1b5538',
          900: '#17462f',
          950: '#0a2619',
        },
        eco: {
          surface: '#f8fafc',
          panel: '#ffffff',
          border: '#e2e8f0',
          text: '#0f172a',
          muted: '#64748b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
