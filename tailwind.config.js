/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ZRP Government Blue Palette
        primary: {
          DEFAULT: "#0F4C81",
          hover: "#0C416E",
          pressed: "#09365B",
          light: "#EBF2FA",
        },
        // Semantic colors
        success: "#0E9F6E",
        warning: "#F59E0B",
        danger: "#DC2626",
        info: "#2563EB",
        // ZRP brand
        zrp: {
          navy: "#0F4C81",
          gold: "#D97706",
          dark: "#0B1220",
        },
      },
      fontFamily: {
        sans: ["Inter", "System"],
      },
    },
  },
  plugins: [],
};