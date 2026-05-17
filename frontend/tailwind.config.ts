import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          indigo: {
            light: "#7986CB",
            DEFAULT: "#3F51B5", // Stable Indigo
            dark: "#303F9F",
          },
          azure: {
            light: "#64B5F6",
            DEFAULT: "#2196F3", // Clear Azure
            dark: "#1976D2",
          },
          grey: {
            light: "#F5F7F8",
            DEFAULT: "#ECEFF1", // Soft Cloud Grey
            dark: "#B0BEC5",
          }
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        serif: ["var(--font-alegreya)", "serif"],
      },
      animation: {
        "smooth-height": "smoothHeight 0.3s ease-in-out",
        "loading-pulse": "loadingPulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        smoothHeight: {
          "0%": { height: "0px", opacity: "0" },
          "100%": { height: "auto", opacity: "1" },
        },
        loadingPulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: ".4", transform: "scale(0.98)" },
        }
      }
    },
  },
  plugins: [],
};
export default config;
