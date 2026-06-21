import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ganancia: "#007a2e",
        perdida: "#cc1a1a",
        canvas: "#faf6ed",
        ink: "#1a0e00",
        fg: "#1a0e00",
        panel: "#f2ece0",
        accent: "#ff6600",
        term: "#1a0e00",
        "term-green": "#007a2e",
        "term-amber": "#ff6600",
        "term-red": "#cc1a1a",
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        serif: ['"Playfair Display"', "Georgia", "Cambria", '"Times New Roman"', "serif"],
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "crisis-flash": {
          "0%, 100%": { backgroundColor: "rgba(204,26,26,0.06)" },
          "50%": { backgroundColor: "rgba(204,26,26,0.18)" },
        },
      },
      animation: {
        ticker: "ticker 35s linear infinite",
        "crisis-flash": "crisis-flash 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
