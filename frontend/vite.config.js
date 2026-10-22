import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Same-origin API calls in dev; no CORS needed.
    proxy: { "/api": "http://localhost:5050" },
  },
});
