# Ponggers signaling Worker

Production and local development both run on Cloudflare Workers through
Wrangler. A hibernating Durable Object coordinates rooms and relays WebRTC
negotiation messages; gameplay remains peer-to-peer over WebRTC DataChannels.

Cloudflare Realtime supplies STUN and TURN over UDP, TCP, and TLS. The Worker
requests short-lived credentials for each signaling connection, so TURN API
secrets never reach the mobile application.

## Cloudflare setup

1. Create a Realtime TURN key in the Cloudflare dashboard.
2. Copy `.dev.vars.example` to `.dev.vars` and add the TURN key ID and API
   token. `.dev.vars` is ignored by Git.
3. Start the Worker from the repository root:

   ```bash
   bun --filter @ponggers/signaling dev
   ```

Wrangler serves the Worker on all local network interfaces at port `8787`. The
signaling WebSocket is `ws://localhost:8787/ws` from a simulator and
`ws://<computer-lan-ip>:8787/ws` from a physical phone.

## Deploy

Authenticate Wrangler once, then deploy:

```bash
bunx wrangler login
bun run deploy:signaling
```

The deploy command uploads the two values in the ignored `.dev.vars` file as
encrypted Worker secrets alongside the code. Wrangler also declares them as
required, so deployment fails instead of producing a broken Worker when either
one is missing.

### GitHub Actions

The `Deploy signaling Worker` workflow verifies and deploys the Worker after a
relevant change is pushed to `main`. It can also be started manually from the
Actions tab. The workflow installs Bun canary explicitly and uses the Wrangler
version pinned by this repository.

Add these repository or GitHub environment secrets before running it:

- `CLOUDFLARE_API_TOKEN`: a scoped Cloudflare token that can edit Workers.
- `CLOUDFLARE_ACCOUNT_ID`: the account that owns the Worker and TURN key.
- `TURN_KEY_ID`: the Cloudflare Realtime TURN key ID.
- `TURN_KEY_API_TOKEN`: the matching Realtime TURN API token.

The TURN values are uploaded as encrypted Worker secrets; they are never
written to the repository or printed by the workflow.

`TURN_CREDENTIAL_TTL_SECONDS` is a plain Worker variable in `wrangler.jsonc`
and defaults to 3600 seconds.

After deployment, set the production mobile environment variable to the
Worker URL:

```text
EXPO_PUBLIC_SIGNALING_URL=wss://ponggers-signaling.<account-subdomain>.workers.dev/ws
```

## Endpoints

- `GET /health`: liveness plus anonymous room and connection counts.
- `GET /ready`: readiness; returns `503` until TURN secrets are configured.
- `GET /ws`: WebSocket upgrade endpoint.

## Runtime behavior

- WebSocket attachments preserve connection and room membership while the
  Durable Object hibernates.
- Durable Object alarms expire abandoned waiting rooms and long-running match
  rooms without in-process timers.
- The existing signaling protocol and mobile client flow remain unchanged.
- A single coordinator is intentional while room codes are globally allocated.
  It can handle the portfolio/app-launch scale of this game; sharding room
  coordination can be introduced later without changing the client protocol.
