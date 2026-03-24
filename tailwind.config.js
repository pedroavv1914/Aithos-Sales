/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          deep: "#050a14",
          accent: "#3b6ff0",
          bright: "#6b9dff"
        }
      }
    }
  },
  plugins: []
};
