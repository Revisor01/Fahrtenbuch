module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {       // Navy Blau
          25: '#f8fafc',
          50: '#f0f5fa',
          100: '#e0eaf5',
          200: '#bcd1e7',
          300: '#8fb0d6',
          400: '#5785bd',
          500: '#395f8f',
          600: '#2d4d77',
          700: '#1a365d',
          800: '#0f2444',
          900: '#0a1a33',
          950: '#060f1f',
        },
        secondary: {     // Weinrot
          25: '#fdf8f8',
          50: '#faf0f0',
          100: '#f2dcdc',
          200: '#e4b5b5',
          300: '#d18585',
          400: '#b84d4d',
          500: '#993333',
          600: '#7a2929',
          700: '#5c1f1f',
          800: '#3d1515',
          900: '#2b0f0f',
          950: '#1a0909',
        }
      }
    },
  },
  plugins: [],
}