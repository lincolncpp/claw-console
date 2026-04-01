<div align="center">

# 🦞 Claw Console

**The web console for the [OpenClaw](https://openclaw.ai/) Gateway.**

Monitor system health · Manage AI agent sessions · Chat with agents in real time · Administer cron jobs, logs & approvals

<br>

<img width="1902" height="1078" alt="Claw Console screenshot" src="https://github.com/user-attachments/assets/11768e0a-e71c-47c4-81a6-97e32c5e00a8" />

</div>

<br>

## Getting Started

> **Requires** [Node.js](https://nodejs.org/) 20+ and [OpenClaw Gateway](https://docs.openclaw.ai) **v2026.3.31** or later

```bash
git clone https://github.com/lincolncpp/claw-console.git
cd claw-console
npm install
cp .env.example .env   # edit with your gateway host/port/token
npm run dev
```

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `VITE_GATEWAY_HOST` | Gateway hostname or IP | `127.0.0.1` |
| `VITE_GATEWAY_PORT` | Gateway port | `18789` |
| `VITE_GATEWAY_TOKEN` | Bearer token (if auth is enabled) | — |

### Gateway Token

If your Gateway has authentication enabled, generate a token on the Gateway host:

```bash
openclaw doctor --generate-gateway-token
```

Or set one manually:

```bash
openclaw config set gateway.auth.token "your-token-here"
```

Then paste the same token into your `.env` as `VITE_GATEWAY_TOKEN`. See the [Gateway Security docs](https://docs.openclaw.ai/gateway/security) for details.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check & build for production |
| `npm run preview` | Preview production build |
| `npm run check` | Format check + lint + build |
| `npm test` | Run tests |

## License

[MIT](LICENSE)
