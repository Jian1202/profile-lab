const path = require('node:path');
const { defineConfig } = require('vite');
const vue = require('@vitejs/plugin-vue');

module.exports = defineConfig({
  root: __dirname,
  plugins: [vue()],
  build: {
    outDir: path.join(__dirname, 'dist'),
    emptyOutDir: true,
    target: 'es2022',
  },
});
