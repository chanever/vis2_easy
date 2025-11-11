/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        country: '#cccccc',
        city: '#ff5722',
        route: '#1e88e5'
      }
    }
  },
  plugins: []
}

