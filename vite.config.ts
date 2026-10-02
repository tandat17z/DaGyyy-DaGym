import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Static SPA → dist/, deployed as Workers static assets (wrangler.jsonc) → gym.tandat17z.workers.dev.
//
// Local data source is chosen by the Vite mode (see "Local data" in CLAUDE.md):
//   --mode demo  .env.demo  frontend :5176 → API :8787 (local sample DB), called cross-origin
//   --mode real  .env.real  frontend :5177 → /api proxied to the API on :8789 (REAL production data)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = mode === 'real' && env.VITE_API_PROXY ? { '/api': { target: env.VITE_API_PROXY, changeOrigin: true, rewrite: (path: string) => path.replace(/^\/api/, '') } } : undefined
  return {
    plugins: [react(), tailwindcss()],
    server: { port: mode === 'real' ? 5177 : 5176, proxy },
  }
})
