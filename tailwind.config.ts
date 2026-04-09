import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        display: ["var(--font-syne)", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#dce6ff",
          200: "#b9ceff",
          300: "#85aaff",
          400: "#527dff",
          500: "#2d52ff",
          600: "#1530f5",
          700: "#1122e1",
          800: "#141db6",
          900: "#161d8f",
          950: "#0e1157",
        },
        surface: {
          50: "#f8f9fc",
          100: "#f0f2f8",
          200: "#dde1ef",
          300: "#c3c9de",
          400: "#9da7c7",
          500: "#7a87b0",
          600: "#616c97",
          700: "#4f587c",
          800: "#424968",
          900: "#393f57",
          950: "#141621",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-mesh":
          "radial-gradient(at 40% 20%, hsla(228,100%,74%,0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(355,100%,93%,0.04) 0px, transparent 50%)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        typing: "typing 1.2s steps(3, end) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        typing: {
          "0%": { content: "''" },
          "33%": { content: "'.'" },
          "66%": { content: "'..'" },
          "100%": { content: "'...'" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
