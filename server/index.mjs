import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { forgeProxy, forgeTarget, localRequest } from './proxy.mjs';

const root = resolve(fileURLToPath(new URL('../build/', import.meta.url)));
const port = Number(process.env.PORT ?? 5175);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
try { await stat(resolve(root, 'index.html')); } catch { throw new Error('Run npm run build before npm start.'); }
const target = forgeTarget();
const proxy = forgeProxy(target);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };

export const server = http.createServer((req, res) => {
	if (!localRequest(req)) { res.writeHead(403); res.end('Local requests only'); return; }
	proxy(req, res, async () => {
		if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
		try {
			const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
			const file = path === '/' || /^\/c\/[\w-]+\/?$/.test(path) ? resolve(root, 'index.html') : resolve(root, `.${path}`);
			if (!file.startsWith(root + sep) && file !== resolve(root, 'index.html')) { res.writeHead(403); res.end(); return; }
			const info = await stat(file);
			if (!info.isFile()) { res.writeHead(404); res.end(); return; }
			res.writeHead(200, {
				'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
				'Content-Length': info.size, 'X-Content-Type-Options': 'nosniff',
				'Cache-Control': file.includes(`${sep}_app${sep}immutable${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
				'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
			});
			if (req.method === 'HEAD') { res.end(); return; }
			createReadStream(file).on('error', () => res.destroy()).pipe(res);
		} catch { res.writeHead(404); res.end('Not found'); }
	});
});
server.listen(port, '127.0.0.1', () => console.log(`Forge UI: http://127.0.0.1:${port} (Forge: ${target.origin})`));
