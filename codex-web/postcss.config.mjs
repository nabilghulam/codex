import tailwindcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";

/** @type {import('postcss').Config} */
const config = {
  plugins: [tailwindcss, autoprefixer],
};

export default config;
