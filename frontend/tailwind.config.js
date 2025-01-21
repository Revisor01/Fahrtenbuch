module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {       // Waldgrün
          25: '#f6faf7',
          50: '#ecf5ee',
          100: '#d5e8d9',
          200: '#afd3b6',
          300: '#80b68c',
          400: '#569462',
          500: '#3c7748',
          600: '#305f3a',
          700: '#24472b',
          800: '#182f1d',
          900: '#112214',
          950: '#0a140c',
        },
        secondary: {     // Bernstein
          25: '#fefbf6',
          50: '#fdf6eb',
          100: '#faebd2',
          200: '#f5d599',
          300: '#efb957',
          400: '#e69620',
          500: '#cc7f10',
          600: '#a3650d',
          700: '#7a4c0a',
          800: '#523306',
          900: '#392404',
          950: '#231503',
        }
      }
    },
  },
  plugins: [],
}