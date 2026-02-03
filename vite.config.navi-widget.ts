import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

// Plugin to copy response-stream.css after build
const copyResponseStreamPlugin = () => {
  return {
    name: 'copy-response-stream',
    closeBundle() {
      const src = resolve(__dirname, 'components/templates/navi/response-stream.css')
      const dest = resolve(__dirname, 'dist/navi-widget/response-stream.css')
      fs.copyFileSync(src, dest)
      console.log('✓ Copied response-stream.css to dist/navi-widget/')
    }
  }
}

// https://vitejs.dev/config/
// Build configuration for streamlined NaVi-only widget (v2.0.0)
// This replaces the legacy widget.tsx which included multiple templates
export default defineConfig({
  plugins: [react(), copyResponseStreamPlugin()],
  publicDir: false, // Don't copy public assets to widget build
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': {}
  },
  build: {
    emptyOutDir: true, // Clean the output directory before building
    outDir: 'dist/navi-widget',
    cssCodeSplit: false,
    minify: 'esbuild',
    commonjsOptions: {
      transformMixedEsModules: true
    },
    rollupOptions: {
      input: resolve(__dirname, 'navi-widget.tsx'),
      output: {
        entryFileNames: 'navi-widget.js',
        chunkFileNames: 'navi-widget.js',
        assetFileNames: 'navi-widget.[ext]',
        format: 'iife',
        inlineDynamicImports: true,
        manualChunks: undefined
      },
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
    }
  },
  // Ensure proper module resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})
