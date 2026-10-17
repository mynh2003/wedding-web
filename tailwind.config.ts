import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        wine: "#722F37",
        cream: "#FDFBF7",
        gold: "#D4AF37",
        ink: "#2C2021",
      },
      fontFamily: {
        script: ["Dancing Script", "Brush Script MT", "Segoe Script", "cursive"],
        display: ["Cormorant Garamond", "Georgia", "Times New Roman", "serif"],
        serif: ["Cormorant Garamond", "Georgia", "Times New Roman", "serif"],
        sans: ["Manrope", "Arial", "Helvetica", "sans-serif"],
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
