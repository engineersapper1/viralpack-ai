/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "!./app/api/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  blocklist: [
    "[-:.TZ]",
    "[oaicite:2]",
    "[oaicite:3]",
    "[oaicite:4]",
    "[oaicite:5]"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101014"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(15,23,42,0.12)"
      }
    }
  },
  plugins: []
};
