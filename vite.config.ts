import path from "path"
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_")

  const gatewayHost = env.VITE_GATEWAY_HOST || "127.0.0.1"
  const gatewayPort = env.VITE_GATEWAY_PORT || "18789"
  const gatewayTarget = `http://${gatewayHost}:${gatewayPort}`

  // Optional machine-local dev-server overrides, set in .env (gitignored):
  // VITE_DEV_LAN=true binds beyond localhost, VITE_DEV_PORT pins a port
  // (strict), VITE_DEV_ALLOWED_HOSTS allow-lists reverse-proxied Host
  // headers (comma-separated).
  const devPort = env.VITE_DEV_PORT ? Number(env.VITE_DEV_PORT) : undefined
  const allowedHosts = env.VITE_DEV_ALLOWED_HOSTS
    ? env.VITE_DEV_ALLOWED_HOSTS.split(",")
        .map((h) => h.trim())
        .filter(Boolean)
    : undefined

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      ...(env.VITE_DEV_LAN === "true" ? { host: true } : {}),
      ...(devPort ? { port: devPort, strictPort: true } : {}),
      ...(allowedHosts ? { allowedHosts } : {}),
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
