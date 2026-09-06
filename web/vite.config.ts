import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Vite tags emitted <script type="module"> and <link rel="stylesheet"> with `crossorigin`.
// The attribute buys nothing for assets served from the app's own origin, so drop it.
//
// Not load-bearing: the app is served over the app:// scheme, which has a real origin, and
// it renders correctly with or without this plugin. Stripping the attribute was tried first
// as a fix for a blank screen under file:// and did not help — the opaque file:// origin was
// the actual cause. Kept because it is one less thing to rediscover if the load path ever
// moves back to file://.
function stripCrossorigin(): Plugin {
  return {
    name: 'strip-crossorigin-for-file-url',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin(=("[^"]*"|'[^']*'))?/g, '')
    },
  }
}

// base: './' is required. The production bundle is loaded from the app bundle over
// file://, where the default absolute base ('/') resolves to the filesystem root and
// every asset request 404s.
export default defineConfig({
  base: './',
  plugins: [react(), stripCrossorigin()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
