module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {       // Tiefes Petrol/Türkis
          25: '#f6fbfc',
          50: '#edf7f8',
          100: '#d6ebee',
          200: '#b3d9df',
          300: '#85bec8',
          400: '#569cab',
          500: '#357f8f',
          600: '#2a6674',
          700: '#1f4c57',
          800: '#15333a',
          900: '#0f252a',
          950: '#091619',
        },
        secondary: {     // Warmes Rubinrot
          25: '#fdf6f6',
          50: '#fbecec',
          100: '#f5d5d5',
          200: '#eba7a7',
          300: '#de7070',
          400: '#cc4040',
          500: '#b42626',
          600: '#911f1f',
          700: '#6d1717',
          800: '#491010',
          900: '#330b0b',
          950: '#1f0707',
        }
      }
    },
  },
  plugins: [],
}