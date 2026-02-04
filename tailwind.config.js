/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zinc: {
          800: '#27272a',
          900: '#18181b',
        },
      },
      backdropBlur: {
        md: '12px',
      },
    },
  },
  plugins: [],
}
