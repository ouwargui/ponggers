# Ponggers

A neon, peer-to-peer Pong game built with Expo, React Native, Skia, and WebRTC.

## Workspace

The Expo application remains at the repository root. Supporting services and
shared packages live in Bun workspaces:

```text
apps/signaling/              WebSocket room and WebRTC signaling service
packages/signaling-protocol/ Shared, validated signaling messages
src/                         Expo application
```

Install everything from the repository root:

```bash
bun install
```

## Development

Start the signaling Worker, which listens on port `8787` and all local network
interfaces:

```bash
bun --filter @ponggers/signaling dev
```

Start the Expo development client in another terminal:

```bash
bun run dev
```

In development, the app derives the signaling hostname from the Expo dev-server
host and uses port `8787`. To override it—required for deployed builds—copy
`.env.example` to `.env.local` and configure:

```bash
EXPO_PUBLIC_SIGNALING_URL=wss://your-signaling-service.example/ws
```

The signaling service exposes `GET /health` and upgrades WebSocket connections
at `/ws`. It only exchanges room and WebRTC negotiation messages; gameplay uses
the peer-to-peer WebRTC DataChannels.

## Verification

```bash
bun test
bunx tsc --noEmit
bun --filter @ponggers/signaling typecheck
```
