module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {       // Nordisches Blau
          25: '#f7fafc',
          50: '#eff5f9',
          100: '#dbe7f1',
          200: '#bcd2e4',
          300: '#93b5d3',
          400: '#6992bc',
          500: '#4b729e',
          600: '#3c5b7e',
          700: '#2d445f',
          800: '#1e2d3f',
          900: '#14202c',
          950: '#0c131a',
        },
        secondary: {     // Warmes Rostrot
          25: '#fdf8f6',
          50: '#fbf0ec',
          100: '#f6dcd3',
          200: '#edb9a7',
          300: '#e18e72',
          400: '#d15f3d',
          500: '#b64525',
          600: '#92371e',
          700: '#6e2916',
          800: '#491b0f',
          900: '#33130a',
          950: '#1f0c06',
        }
      }
    },
  },
  plugins: [],
}