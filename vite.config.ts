import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      '__APPS_SCRIPT_URL__': JSON.stringify(env.VITE_APPS_SCRIPT_URL || env.APP_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbw5b01PFyzhy2wHEqWrG5kqv0Js6ioBM7Htec2VZKEopxtKjcS-2yD3yYkq37zWCELgSA/exec'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
