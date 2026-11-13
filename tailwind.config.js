/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        civic: {
          50: '#f0f6fc',
          100: '#ddebf7',
          200: '#c0dbf1',
          300: '#94c3e7',
          400: '#60a3da',
          500: '#3783c8',
          600: '#1a64ab',
          700: '#004880', // Official City of Independence Brand Blue
          800: '#003b69',
          900: '#063156',
          950: '#041e37',
        },
        spirit: {
          600: '#9e1427',
          700: '#860F1F', // Official City of Independence Brand Crimson
          800: '#6d0c19',
        },
      },
    },
  },
  plugins: [],
};
