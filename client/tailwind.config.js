/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aggroso: {
          bg: '#07171D',
          'bg-soft': '#101F25',
          'bg-teal': '#0D2630',
          cream: '#FBF8F1',
          'cream-soft': '#F2EDE3',
          mint: '#A9DFCB',
          coral: '#F4A78E',
          text: '#FFFDF8',
          'text-dark': '#102025',
          muted: '#89857C',
          border: '#DAD3C9',
          'border-dark': '#294047',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
