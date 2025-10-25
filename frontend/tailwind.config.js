
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'handshake-red': '#D43521',
      },
      fontFamily: {
        sans: ['Roboto Condensed', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
