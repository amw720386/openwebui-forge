// Refresh notices for runtime libraries included in the distributed application.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const root = JSON.parse(await readFile('package.json', 'utf8'));
// Svelte/Kit's compiler and server dependencies are not shipped in this static SPA.
const framework = new Set(['svelte', '@sveltejs/kit']);
const queue = [...Object.keys(root.dependencies), ...framework, 'esm-env', 'devalue'].map(name => ({ name, from: resolve('.') }));
const seen = new Set();
let text = 'Third-party runtime software notices\nInter font: see assets/fonts/OFL.txt.\n\n';
while (queue.length) {
  const { name, from } = queue.shift();
  let path, pkg;
  for (const base of createRequire(join(from, 'package.json')).resolve.paths(name) ?? []) {
    try { path = join(base, name); pkg = JSON.parse(await readFile(join(path, 'package.json'), 'utf8')); break; }
    catch { /* Try the next parent installation directory. */ }
  }
  if (!pkg) throw new Error(`Missing installed package ${name}`);
  if (seen.has(path)) continue;
  seen.add(path);
  if (!framework.has(name)) queue.push(...Object.keys(pkg.dependencies ?? {}).filter(name => !name.startsWith('@types/')).map(name => ({ name, from: path })));
  const files = (await readdir(path)).filter(file => /^(license|licence|copying|notice)(\.|$)/i.test(file));
  if (!files.length) throw new Error(`Missing license for ${name}`);
  text += `${name} ${pkg.version} (${pkg.license ?? 'see license'})\n`;
  for (const file of files) text += `${file}\n${await readFile(join(path, file), 'utf8')}\n`;
  text += '\n----------------------------------------\n\n';
}
await writeFile('static/THIRD_PARTY_NOTICES.txt', text.trimEnd() + '\n');
console.log(`Preserved notices for ${seen.size} runtime packages`);
