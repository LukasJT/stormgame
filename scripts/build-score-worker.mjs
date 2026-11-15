import { build } from 'vite'

await build({
  configFile: false,
  define: {
    'import.meta.env.VITE_REGION_ASSET_BASE': JSON.stringify(
      'https://raw.githubusercontent.com/LukasJT/stormgame/2086448/public/',
    ),
  },
  build: {
    ssr: 'server/sites-worker.mjs',
    outDir: 'dist/server',
    copyPublicDir: false,
    minify: true,
    rollupOptions: { output: { entryFileNames: 'index.js', codeSplitting: false } },
  },
})
