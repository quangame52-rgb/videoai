import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const LATEST_URL = 'https://script.google.com/macros/s/AKfycbx_auPCmmiKOAXw_PL7MKIelkk4J9ohSZyyKuAy6N97pAuER_vKtLZVQh7ZDFKRcPkjtg/exec';
  let scriptUrl = env.VITE_APPS_SCRIPT_URL || env.APP_SCRIPT_URL || LATEST_URL;
  
  // Force override if it's the known old/broken URL
  if (scriptUrl.includes('AKfycbyT8jkAupz6dk4T1sqX6ESwHeE92RLRqMuGcxVYyYOiH7Kjkoe2f3AVVCUfOpo9htZCjg') || scriptUrl.includes('AKfycb-ReFLomJvVd7AOFEbCOzqhiuABf7L4yN2F2696n0en48uXYADHt7I7Q8pqbFXRHq6')) {
    scriptUrl = LATEST_URL;
  }
  
  console.log("Vite config: Using Apps Script URL:", scriptUrl);

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      '__APPS_SCRIPT_URL__': JSON.stringify(scriptUrl),
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
