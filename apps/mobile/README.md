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

## Production iOS release

The `Build and submit mobile app` GitHub workflow runs after relevant changes
land on `main`, or manually from the Actions tab. It installs the monorepo from
the root with Bun, runs the test and typecheck suites, then runs EAS CLI from
`apps/mobile` as required for a monorepo project. A successful production build
is submitted to TestFlight automatically.

Add an `EXPO_TOKEN` secret to the GitHub `production` environment. The EAS
project's `production` environment must also define the public runtime values,
including:

```text
EXPO_PUBLIC_SIGNALING_URL=wss://your-production-worker.example/ws
EXPO_PUBLIC_FORCE_TURN_RELAY=false
```

Before relying on non-interactive CI, complete one successful production iOS
build locally so EAS has the Apple signing credentials and App Store Connect
application information it needs.
