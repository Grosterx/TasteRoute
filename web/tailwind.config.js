/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0d0b09',
          900: '#14110e',
          850: '#1a1612',
          800: '#211c17',
          700: '#332b23',
          600: '#4b4035',
        },
        cream: {
          50: '#fffaf1',
          100: '#f8efdf',
          200: '#eadbc4',
          300: '#d6c1a3',
        },
        saffron: {
          300: '#ffd37a',
          400: '#f7b84b',
          500: '#e79a20',
          600: '#c77a10',
        },
        basil: {
          400: '#6fbf8b',
          500: '#4a9f6a',
        },
        tomato: {
          400: '#f07d63',
          500: '#d95f45',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Georgia', 'Cambria', 'serif'],
      },
      boxShadow: {
        card: '0 24px 80px -28px rgba(0,0,0,0.75)',
        glow: '0 0 0 1px rgba(247,184,75,0.18), 0 18px 60px -20px rgba(231,154,32,0.32)',
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
