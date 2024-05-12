import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        blue_primary: "#003A4E",
        blue_darkest_variation: "#041D26",
        blue_dark_variation: "#385A66",
        blue_medium_variation: "#5B808C",
        blue_light_variation: "#B2CFD9",
        blue_lightest_variation: "#D1E0E5",
      },
    },
  },
  plugins: [],
};
export default config;
