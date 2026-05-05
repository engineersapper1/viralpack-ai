/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#10131A',
        brass: '#D7A84F',
        fog: '#F4F1EA'
      },
      boxShadow: {
        soft: '0 18px 60px rgba(10, 13, 20, 0.13)'
      }
    }
  },
  plugins: []
};
