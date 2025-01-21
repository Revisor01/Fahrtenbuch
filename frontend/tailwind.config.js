module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {       // Moosgrün
          25: '#f8faf8',
          50: '#f0f4f0',
          100: '#dce5dc',
          200: '#beccbe',
          300: '#96ac96',
          400: '#6e866e',
          500: '#526952',
          600: '#415441',
          700: '#313f31',
          800: '#212921',
          900: '#171d17',
          950: '#0d100d',
        },
        secondary: {     // Beerenrot
          25: '#fdf6f8',
          50: '#fbedf1',
          100: '#f5d7e0',
          200: '#ebb4c3',
          300: '#dd869e',
          400: '#cc536f',
          500: '#b33651',
          600: '#8f2b41',
          700: '#6b2031',
          800: '#471520',
          900: '#321017',
          950: '#1e0a0e',
        }
      }
    },
  },
  plugins: [],
}