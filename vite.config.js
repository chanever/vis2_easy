import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Serve existing local ./data directory at /data during dev
function serveLocalData() {
  return {
    name: 'serve-local-data',
    configureServer(server) {
      server.middlewares.use('/data', (req, res, next) => {
        try {
          const rel = decodeURIComponent((req.url || '').replace(/^\/+/, ''))
          const filePath = path.join(process.cwd(), 'data', rel)
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            if (/\.geojson$|\.json$/i.test(filePath)) {
              res.setHeader('Content-Type', 'application/json')
            }
            res.setHeader('Cache-Control', 'no-cache')
            fs.createReadStream(filePath).pipe(res)
            return
          }
        } catch (e) {
          // fall-through to next middleware
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), serveLocalData()],
  server: {
    fs: {
      strict: false
    }
  }
})

