import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { crx } from "@crxjs/vite-plugin";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const pkgDir = (name: string) => dirname(require.resolve(`${name}/package.json`));
import manifest from "./manifest";

export default defineConfig({
  root: resolve(__dirname, ".."),
  plugins: [react(), tailwindcss(), crx({ manifest })],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      react: pkgDir("react"),
      "react-dom": pkgDir("react-dom"),
      "@popup": resolve(__dirname, "../apps/popup/src"),
      "@side-panel": resolve(__dirname, "../apps/side-panel/src"),
      "@options": resolve(__dirname, "../apps/options/src"),
    },
  },
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "../apps/popup/index.html"),
        "side-panel": resolve(__dirname, "../apps/side-panel/index.html"),
        options: resolve(__dirname, "../apps/options/index.html"),
      },
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    hmr: { port: 5174 },
  },
});
