/** @type {import('tailwindcss').Config} */
module.exports = {
    // Toma todo lo que esta dentro de la carpeta src
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};