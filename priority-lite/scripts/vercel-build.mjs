import { build } from 'esbuild'
import { mkdir, cp, writeFile } from 'fs/promises'
import { execSync } from 'child_process'

// 1. Build the Vite frontend
execSync('npm run build -w client', { stdio: 'inherit' })

// 2. Create Vercel Build Output API structure
await mkdir('.vercel/output/static', { recursive: true })
await mkdir('.vercel/output/functions/api/index.func', { recursive: true })

// 3. Copy frontend static files
await cp('client/dist', '.vercel/output/static', { recursive: true })

// 4. Bundle API with esbuild → function output dir
// footer: Vercel's Nodejs launcher may call require('./index.js') directly;
// ensure module.exports IS the handler, not an { default: handler, __esModule } object.
await build({
  entryPoints: ['api-src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: '.vercel/output/functions/api/index.func/index.js',
  target: 'node20',
  footer: { js: 'if (typeof module.exports.default === "function") module.exports = module.exports.default;' },
})

// 5. Function manifest (required by Build Output API)
await writeFile(
  '.vercel/output/functions/api/index.func/.vc-config.json',
  JSON.stringify({
    runtime: 'nodejs20.x',
    handler: 'index.js',
    launcherType: 'Nodejs',
    shouldAddHelpers: false,
  })
)

// 6. Route config: /api/* → function, then static files, then SPA fallback
await writeFile(
  '.vercel/output/config.json',
  JSON.stringify({
    version: 3,
    routes: [
      { src: '/api/(.*)', dest: '/api/index' },
      { handle: 'filesystem' },
      { src: '/(.*)', dest: '/index.html' },
    ],
  })
)

console.log('Vercel build complete')
