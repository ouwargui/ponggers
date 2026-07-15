import { type Env, SignalingLobby } from './signaling-lobby';

const LOBBY_NAME = 'global';

export { SignalingLobby };

export default {
  async fetch(request: Request, environment: Env) {
    const url = new URL(request.url);
    const lobby = environment.SIGNALING_LOBBY.getByName(LOBBY_NAME);

    if (url.pathname === '/health' || url.pathname === '/ready') {
      const turnConfigured = Boolean(
        environment.TURN_KEY_ID?.trim() &&
          environment.TURN_KEY_API_TOKEN?.trim(),
      );
      const statsResponse = await lobby.fetch('https://lobby.internal/stats');
      const stats: unknown = await statsResponse.json();
      const ready = turnConfigured;

      return jsonResponse(
        {
          ok: url.pathname === '/health' ? true : ready,
          service: 'ponggers-signaling',
          turnConfigured,
          ...(isRecord(stats) ? stats : {}),
        },
        { status: url.pathname === '/ready' && !ready ? 503 : 200 },
      );
    }

    if (url.pathname === '/ws') {
      return lobby.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;

function jsonResponse(body: unknown, { status }: { status: number }) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json',
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}
