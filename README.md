

# 🦞 Claw Console

**The web console for the [OpenClaw](https://openclaw.ai/) Gateway.**
Monitor system health · Manage AI agent sessions · Chat with agents in real time · Administer cron jobs, logs & approvals

<img width="1902" height="1078" alt="Claw Console screenshot" src="https://github.com/user-attachments/assets/11768e0a-e71c-47c4-81a6-97e32c5e00a8" />


<br>

## Features

- **Overview dashboard** — health, token usage, and recent activity
- **Sessions** — browse and manage active agent sessions
- **Agents** — view and configure registered agents
- **Nodes** — monitor node status and presence
- **Cron jobs** — schedule, run, and inspect job history
- **Logs** — real-time streaming with filtering
- **Approvals** — act on pending tool-execution requests
- **Built-in chat** — interact with agents directly

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
| `VITE_GATEWAY_TOKEN` | Browser-exposed bearer token (if auth is enabled) | — |
| `VITE_DEBUG_GATEWAY_FRAMES` | Log gateway frame metadata in local dev without payload bodies | `false` |

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

`VITE_GATEWAY_TOKEN` is compiled into the client runtime and sent from the operator's browser. Treat it like an admin credential: use it only on trusted machines, serve Claw Console only from trusted origins, and avoid deploying it as a public multi-user frontend.

### Running on a Different Machine (LAN Access)

By default the OpenClaw Gateway only listens on loopback (`127.0.0.1`), so it is not reachable from other machines. To run Claw Console from a different machine on the same local network you need to reconfigure the gateway.

**1. Set `gateway.bind` to `lan` on the gateway host:**

```json5
{
  "gateway": {
    "mode": "local",
    "bind": "lan",
    "controlUi": {
      "allowedOrigins": [
        "http://192.168.1.42:5173"
      ]
    },
    "auth": {
      "mode": "token",
      "token": "your-secure-token"
    }
  }
}
```

You can also bind to a specific IP instead of `"lan"` (e.g. `"192.168.1.100"`).

Use exact origins for the machine serving Claw Console instead of `*`. Keep device auth enabled unless you have a short-lived local troubleshooting need and understand the tradeoff.

> **Authentication is mandatory for non-loopback binds.** The gateway will refuse to start without it. Use token auth (`gateway.auth.mode: "token"`) or password auth (`OPENCLAW_GATEWAY_PASSWORD` env var). Generate a token with `openclaw doctor --generate-gateway-token`.

**2. Restart the gateway** — `gateway.*` config changes require a restart.

**3. Point Claw Console to the gateway's LAN IP:**

```env
VITE_GATEWAY_HOST=<gateway-lan-ip>
VITE_GATEWAY_PORT=18789
VITE_GATEWAY_TOKEN=<the-token-you-configured>
```

> **Security notes:** Never expose the gateway unauthenticated on `0.0.0.0`. Firewall the port to a tight allowlist of source IPs. For a more secure alternative, consider [Tailscale Serve](https://docs.openclaw.ai/gateway/security) (`gateway.bind: "tailnet"`), which keeps the gateway on loopback while Tailscale manages access control. See the [Gateway Configuration Reference](https://docs.openclaw.ai/gateway/configuration-reference) for all options.

## License

MIT — see [LICENSE](LICENSE) for details.
