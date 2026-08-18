import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    allowedHosts: [
      "localhost",
      "a079-2001-16b8-ba99-6600-dd8b-5691-4384-a60b.ngrok-free.app",
    ],
  },
});
