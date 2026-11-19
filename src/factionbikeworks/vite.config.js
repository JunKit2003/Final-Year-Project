import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // `npm run dev` proxies API + images to the backend so the browser stays same-origin,
  // exactly like nginx does in the container.
  const backend = env.DEV_BACKEND_URL || "http://localhost:8000";
  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        "/api": { target: backend, changeOrigin: true },
        "/images": { target: backend, changeOrigin: true },
      },
    },
    preview: { port: 3000 },
    build: { outDir: "build", sourcemap: false, chunkSizeWarningLimit: 900 },
    test: { environment: "node", include: ["src/**/*.test.{js,jsx}"] },
  };
});
