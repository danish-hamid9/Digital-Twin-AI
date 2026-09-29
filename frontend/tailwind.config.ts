import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        finance: {
          light: "#34d399",
          DEFAULT: "#10b981",
          dark: "#059669",
        },
        study: {
          light: "#818cf8",
          DEFAULT: "#6366f1",
          dark: "#4f46e5",
        },
        habit: {
          light: "#fbbf24",
          DEFAULT: "#f59e0b",
          dark: "#d97706",
        },
        twin: {
          light: "#38bdf8",
          DEFAULT: "#0284c7",
          dark: "#0369a1",
        }
      },
    },
  },
  plugins: [],
};
export default config;
