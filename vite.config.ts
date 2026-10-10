import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { forgeProxy, forgeTarget } from './server/proxy.mjs';

export default defineConfig({
 plugins: [sveltekit(), {
  name: 'forge-local-proxy',
  configureServer(server) { server.middlewares.use(forgeProxy(forgeTarget())); }
 }],
 server: { host: '127.0.0.1', port: 5175, strictPort: true, watch: { ignored: ['**/.venv/**', '**/.baseline/**'] } },
 optimizeDeps: { entries: ['src/routes/**/*.svelte'] }
});