import { describe, expect, test } from 'bun:test';

import { issueCloudflareTurnConfig } from './cloudflare-turn';

const CLOUDFLARE_RESPONSE = {
  iceServers: [
    {
      urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'],
    },
    {
      urls: [
        'turn:turn.cloudflare.com:3478?transport=udp',
        'turn:turn.cloudflare.com:53?transport=udp',
        'turn:turn.cloudflare.com:3478?transport=tcp',
        'turn:turn.cloudflare.com:80?transport=tcp',
        'turns:turn.cloudflare.com:5349?transport=tcp',
        'turns:turn.cloudflare.com:443?transport=tcp',
      ],
      username: 'temporary-user',
      credential: 'temporary-credential',
    },
  ],
};

describe('Cloudflare TURN configuration', () => {
  test('requests and normalizes short-lived ICE credentials', async () => {
    let requestedUrl = '';
    let requestedInit: RequestInit | undefined;
    const fetchImplementation = async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      requestedUrl = String(input);
      requestedInit = init;
      return Response.json(CLOUDFLARE_RESPONSE, { status: 201 });
    };

    const config = await issueCloudflareTurnConfig(
      {
        TURN_KEY_ID: 'turn-key',
        TURN_KEY_API_TOKEN: 'secret-token',
        TURN_CREDENTIAL_TTL_SECONDS: '600',
      },
      {
        fetch: fetchImplementation as typeof fetch,
        now: 1_700_000_000_000,
      },
    );

    expect(requestedUrl).toBe(
      'https://rtc.live.cloudflare.com/v1/turn/keys/turn-key/credentials/generate-ice-servers',
    );
    expect(requestedInit?.headers).toEqual({
      authorization: 'Bearer secret-token',
      'content-type': 'application/json',
    });
    expect(requestedInit?.body).toBe('{"ttl":600}');
    expect(config).toEqual({
      expiresAt: 1_700_000_600,
      iceServers: [
        { urls: ['stun:stun.cloudflare.com:3478'] },
        {
          urls: [
            'turns:turn.cloudflare.com:443?transport=tcp',
            'turn:turn.cloudflare.com:3478?transport=udp',
            'turn:turn.cloudflare.com:80?transport=tcp',
            'turns:turn.cloudflare.com:5349?transport=tcp',
          ],
          username: 'temporary-user',
          credential: 'temporary-credential',
        },
      ],
    });
  });

  test('rejects missing secrets and upstream failures', async () => {
    await expect(issueCloudflareTurnConfig({})).rejects.toThrow(
      'not configured',
    );

    const failingFetch = async () => new Response(null, { status: 401 });
    await expect(
      issueCloudflareTurnConfig(
        {
          TURN_KEY_ID: 'turn-key',
          TURN_KEY_API_TOKEN: 'bad-token',
        },
        { fetch: failingFetch as typeof fetch },
      ),
    ).rejects.toThrow('(401)');
  });
});
