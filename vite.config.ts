import path from "path"
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_")

  const gatewayHost = env.VITE_GATEWAY_HOST || "127.0.0.1"
  const gatewayPort = env.VITE_GATEWAY_PORT || "18789"
  const gatewayTarget = `http://${gatewayHost}:${gatewayPort}`

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: gatewayTarget,
          changeOrigin: true,
        },
        "/healthz": {
          target: gatewayTarget,
          changeOrigin: true,
        },
        "/readyz": {
          target: gatewayTarget,
          changeOrigin: true,
        },
        "/ws": {
          target: gatewayTarget.replace("http", "ws"),
          ws: true,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/ws/, ""),
        },
      },
    },
  }
})
