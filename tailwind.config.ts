import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        wine: "#722F37",
        cream: "#FDFCFB",
        gold: "#D4AF37",
        ink: "#2C2021",
      },
      fontFamily: {
        script: ["Great Vibes", "cursive"],
        accent: ["Great Vibes", "cursive"],
        flavinda: ["Flavinda", "Great Vibes", "cursive"],
        body: ["Montserrat", "Arial", "sans-serif"],
        vietnam: ["Be Vietnam Pro", "Arial", "sans-serif"],
        display: ["Playfair Display", "Georgia", "serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["Montserrat", "Arial", "sans-serif"],
      },
      boxShadow: {
        soft: "0 24px 80px rgba(72, 31, 35, 0.12)",
      },
      backgroundImage: {
        "paper-grain": "radial-gradient(rgba(114,47,55,.07) .7px, transparent .7px)",
      },
    },
  },
  plugins: [],
};

export default config;
