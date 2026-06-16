import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ganancia: "#00ff8c",
        perdida: "#ff3b3b",
        canvas: "#05070a",
        ink: "#14161b",
        fg: "#d7dee8",
        panel: "#0d1117",
        accent: "#ffb000",
        term: "#05070a",
        "term-green": "#00ff8c",
        "term-amber": "#ffb000",
        "term-red": "#ff3b3b",
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "crisis-flash": {
          "0%, 100%": { backgroundColor: "rgba(255,59,59,0.08)" },
          "50%": { backgroundColor: "rgba(255,59,59,0.22)" },
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
