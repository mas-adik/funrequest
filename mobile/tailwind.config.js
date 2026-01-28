/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7f1',
          100: '#dceede',
          200: '#bce0c0',
          300: '#8cc896',
          400: '#6B8E6F',
          500: '#4a7350',
          600: '#3a5c3f',
          700: '#2f4a34',
          800: '#273c2b',
          900: '#213226',
        },
        sage: '#6B8E6F',
        warmGray: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
      },
    },
  },
  plugins: [],
}
