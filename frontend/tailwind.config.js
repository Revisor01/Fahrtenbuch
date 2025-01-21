module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {       // Schiefergrau
          25: '#f8f9fa',
          50: '#f0f2f4',
          100: '#dce1e6',
          200: '#bdc6cf',
          300: '#95a3b2',
          400: '#6d7f91',
          500: '#526275',
          600: '#424f5e',
          700: '#313b47',
          800: '#21272f',
          900: '#171b21',
          950: '#0d0f13',
        },
        secondary: {     // Kupfer
          25: '#fdf9f7',
          50: '#fbf2ee',
          100: '#f5e0d7',
          200: '#ebc0af',
          300: '#dea08d',
          400: '#cc7358',
          500: '#b85636',
          600: '#93452b',
          700: '#6f3320',
          800: '#4a2216',
          900: '#34180f',
          950: '#1f0e09',
        }
      }
    },
  },
  plugins: [],
}