# Claw Console

The web console for the [OpenClaw](https://openclaw.ai/) Gateway. Monitor system health, manage AI agent sessions, chat with agents in real time, and administer cron jobs, logs, and approvals.

## Getting Started

**Prerequisites:** [Node.js](https://nodejs.org/) 20+ and a running [OpenClaw Gateway](https://docs.openclaw.ai)

```bash
git clone https://github.com/lincolncpp/ai-dashboard.git
cd ai-dashboard
npm install
cp .env.example .env   # then edit .env with your gateway host/port/token
npm run dev
```

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `VITE_GATEWAY_HOST` | Gateway hostname or IP | `127.0.0.1` |
| `VITE_GATEWAY_PORT` | Gateway port | `18789` |
| `VITE_GATEWAY_TOKEN` | Bearer token (if auth is enabled) | — |

### Gateway Token

If your Gateway has authentication enabled, you need a token. Generate one on the Gateway host:

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
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run check` | Format check + lint + build |
| `npm test` | Run tests |

## Tech Stack

React 19, TypeScript, Vite 8, Tailwind CSS 4, shadcn/ui, Zustand, Recharts, React Router 7

## Contributing

1. Fork the repo
2. Create a feature branch
3. Run `npm run check` before committing
4. Open a pull request

## License

[MIT](LICENSE)

## Links

- [OpenClaw](https://openclaw.ai/) · [Documentation](https://docs.openclaw.ai) · [Gateway Protocol](https://docs.openclaw.ai/gateway/protocol)
