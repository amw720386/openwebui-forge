# Upstream baseline

Base: Open WebUI v0.6.5, `07d8460126a686de9a99e2662d06106e22c3f6b6`.
Verified with `git ls-remote --tags https://github.com/open-webui/open-webui.git refs/tags/v0.6.5`.
Full upstream history was cloned, without `--depth`. No later Open WebUI source was copied.
The tag's LICENSE is BSD-3-Clause and remains unchanged.

| Area | v0.6.5 source |
| --- | --- |
| Framework / routing | Svelte 4, SvelteKit 2; `src/routes`, static SPA adapter |
| Chat / conversation state | `Chat.svelte`, `Messages.svelte`, writable stores, parent/child message history |
| Rendering | Recursive MarkdownTokens / MarkdownInlineTokens, marked, KaTeX, CodeBlock |
| Streaming | `src/lib/apis/streaming`, TextDecoderStream + eventsource-parser |
| Models / settings | ModelSelector, SettingsModal; provider and user settings API |
| Backend / persistence | FastAPI routers, SQLAlchemy / Alembic SQLite, legacy Peewee migrations |
| Authentication | JWT, local users, OAuth, LDAP and permissions |
| Integrations | Ollama/OpenAI routers, retrieval/vector stores, audio/images, tools, sockets |
| Deployment / tests | Dockerfiles/compose, Python packaging, Vite/npm, Cypress, Vitest, pytest |

## Windows baseline commands

Used Node 22.23.3 and Python 3.12.14. The system Node 24 is outside upstream's
supported range; Python 3.10 fails on `logging.getLevelNamesMapping`.

```powershell
git clone --branch v0.6.5 https://github.com/open-webui/open-webui.git .
git switch -c main
git remote rename origin upstream
git remote add origin https://github.com/amw720386/openwebui-forge.git
$env:CYPRESS_INSTALL_BINARY = '0'
npm ci --legacy-peer-deps
npm install lowlight@3 --legacy-peer-deps
node node_modules/esbuild/install.js
node scripts/prepare-pyodide.js
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5175 --strictPort
```

The missing `lowlight` peer dependency was added. Vite's dependency scan was
restricted to the Svelte routes, excluding the isolated Python environments.
Frontend `WEBUI_HOSTNAME` was set to port 8081 because Forge already uses 8080.

In a second terminal, using Python 3.12:

```powershell
python -m venv .baseline
uv pip install --python .baseline/Scripts/python.exe -r backend/requirements.txt
$env:PYTHONUTF8 = '1'
$env:WEBUI_AUTH = 'False'
$env:WEBUI_SECRET_KEY = 'local-baseline-only'
$env:OPENAI_API_BASE_URLS = 'http://127.0.0.1:8080/v1'
$env:OPENAI_API_KEYS = ''
$env:ENABLE_OLLAMA_API = 'False'
$env:RAG_EMBEDDING_MODEL = ''
$env:OFFLINE_MODE = 'True'
$env:ANONYMIZED_TELEMETRY = 'False'
$env:DO_NOT_TRACK = 'True'
$env:SCARF_NO_ANALYTICS = 'True'
$env:CORS_ALLOW_ORIGIN = 'http://127.0.0.1:5175'
cd backend
../.baseline/Scripts/python.exe -u -m uvicorn open_webui.main:app --host 127.0.0.1 --port 8081
```

Verified HTTP 200 from frontend and backend health, model discovery via
`/api/models`, non-streaming completion via `/openai/chat/completions`, and a
streamed “Hello!” reply in the original browser UI before deleting features.
Upstream's automatic title request exceeded Forge's default 1024-token context.
These baseline commands describe the historical setup, not the final quickstart.

Forge API inspected read-only at commit `1c68f56a3ffd0f55f9d75922ae4986ceb8975749`:
`api/internal/server/chat.go` and `api/cmd/forge-server/main.go`.
Strict unknown-field validation, optional initial system message, alternating
user/assistant turns ending in user, output limit 1–2048, SSE error objects,
role/content/finish chunks and `[DONE]`. No Forge source is included here.
