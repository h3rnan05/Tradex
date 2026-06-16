import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ganancia: "#16a34a",
        perdida: "#dc2626",
      },
    },
  },
  plugins: [],
};

export default config;
