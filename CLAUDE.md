# Claw Console

Web UI for the [OpenClaw Gateway](https://github.com/openclaw/openclaw).

When investigating gateway behavior (RPC methods, health payloads, config resolution), check if the gateway repo is cloned locally. If not, use Context7 (`/llmstxt/openclaw_ai_llms-full_txt`) or the public docs at https://docs.openclaw.ai. Avoid using `gh api` for reading source files — it burns through GitHub rate limits quickly.

## Key gateway source paths

- `src/gateway/server-methods/` - WebSocket RPC handlers
- `src/infra/heartbeat-summary.ts` - heartbeat config resolution logic
- `src/commands/health.ts` - health snapshot builder
- `src/auto-reply/heartbeat.ts` - heartbeat defaults and prompt
