import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Pin Tailwind's import-resolution base to this project directory. Next's dev
// server can otherwise infer the wrong workspace root (the parent folder, which
// has no node_modules), making `@import "tailwindcss"` fail to resolve.
const projectRoot = dirname(fileURLToPath(import.meta.url));

const config = {
  plugins: {
    "@tailwindcss/postcss": { base: projectRoot },
  },
};

export default config;
