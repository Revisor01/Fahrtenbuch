module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {       // Königsblau
          25: '#f7f8fc',
          50: '#eef0f9',
          100: '#d9ddf2',
          200: '#b7c0e6',
          300: '#8c9ad7',
          400: '#6374c8',
          500: '#4555b9',
          600: '#374494',
          700: '#29336f',
          800: '#1c224a',
          900: '#131835',
          950: '#0c0f20',
        },
        secondary: {     // Pflaume
          25: '#fcf7fa',
          50: '#f8eef5',
          100: '#f0d9ea',
          200: '#e1b8d6',
          300: '#ce8dbd',
          400: '#b65c9e',
          500: '#9c3f81',
          600: '#7d3267',
          700: '#5e254d',
          800: '#3e1934',
          900: '#2d1226',
          950: '#1b0b17',
        }
      }
    },
  },
  plugins: [],
}