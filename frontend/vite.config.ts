import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: '../gas',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    },
    // GAS環境での動作を最適化
    minify: 'esbuild',
    sourcemap: false,
    // 単一ファイル出力のため、アセットをインライン化
    cssCodeSplit: false,
    assetsInlineLimit: 100000000 // すべてのアセットをインライン化
  },
  base: './'
})
