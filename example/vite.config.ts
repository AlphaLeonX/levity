import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, writeFileSync, readFileSync, rmSync } from 'fs';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyDirFirst: true,
    rollupOptions: {
      input: {
        'sidepanel/index': resolve(__dirname, 'src/sidepanel/index.html'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'sidepanel/[name].[ext]';
          }
          return '[name].[ext]';
        },
      },
    },
  },
  resolve: {
    alias: {
      levity: resolve(__dirname, '../packages/core/src/index.ts'),
    },
  },
  plugins: [
    {
      name: 'fix-chrome-extension-paths',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');

        // Move HTML from src/sidepanel to sidepanel
        const srcHtml = resolve(distDir, 'src/sidepanel/index.html');
        const destHtml = resolve(distDir, 'sidepanel/index.html');
        if (existsSync(srcHtml)) {
          // Read and fix paths
          let html = readFileSync(srcHtml, 'utf-8');
          html = html.replace(/src="[^"]*\/sidepanel\/index\.js"/g, 'src="./index.js"');
          html = html.replace(/href="[^"]*\/sidepanel\/index\.css"/g, 'href="./index.css"');
          writeFileSync(destHtml, html);
          rmSync(resolve(distDir, 'src'), { recursive: true });
        }

        // Copy manifest.json
        copyFileSync(
          resolve(__dirname, 'manifest.json'),
          resolve(distDir, 'manifest.json')
        );

        // Create icons directory and generate icons
        const iconsDir = resolve(distDir, 'icons');
        if (!existsSync(iconsDir)) {
          mkdirSync(iconsDir, { recursive: true });
        }

        const sizes = [16, 48, 128];
        for (const size of sizes) {
          const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#2563eb"/>
  <path d="M40 48 L64 32 L88 48 L64 96 Z" fill="white" opacity="0.9"/>
  <circle cx="64" cy="44" r="8" fill="white"/>
</svg>`;
          writeFileSync(resolve(iconsDir, `icon${size}.svg`), svgContent);
        }
      },
    },
  ],
});
