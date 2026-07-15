import type {
  IceServerConfig,
  SessionConfig,
} from '@ponggers/signaling-protocol';

const DEFAULT_CREDENTIAL_TTL_SECONDS = 60 * 60;
const MIN_CREDENTIAL_TTL_SECONDS = 5 * 60;
const MAX_CREDENTIAL_TTL_SECONDS = 24 * 60 * 60;
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_ICE_URLS_PER_SERVER = 4;

export type CloudflareTurnEnvironment = {
  TURN_CREDENTIAL_TTL_SECONDS?: string;
  TURN_KEY_API_TOKEN?: string;
  TURN_KEY_ID?: string;
};

type IssueCloudflareTurnConfigOptions = {
  fetch?: typeof globalThis.fetch;
  now?: number;
};

export async function issueCloudflareTurnConfig(
  environment: CloudflareTurnEnvironment,
  {
    fetch: fetchImplementation = globalThis.fetch,
    now = Date.now(),
  }: IssueCloudflareTurnConfigOptions = {},
): Promise<SessionConfig> {
  const keyId = environment.TURN_KEY_ID?.trim();
  const apiToken = environment.TURN_KEY_API_TOKEN?.trim();

  if (!keyId || !apiToken) {
    throw new Error('Cloudflare TURN credentials are not configured');
  }

  const ttl = parseCredentialTtl(environment.TURN_CREDENTIAL_TTL_SECONDS);
  const response = await fetchImplementation(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ttl }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Cloudflare TURN credential request failed (${response.status})`,
    );
  }

  const body: unknown = await response.json();
  const iceServers = parseIceServers(body);

  if (!iceServers) {
    throw new Error('Cloudflare TURN returned an invalid ICE configuration');
  }

  return {
    expiresAt: Math.floor(now / 1000) + ttl,
    iceServers,
  };
}

function parseIceServers(value: unknown): IceServerConfig[] | null {
  if (!isRecord(value) || !Array.isArray(value.iceServers)) {
    return null;
  }

  const iceServers: IceServerConfig[] = [];

  for (const rawServer of value.iceServers) {
    if (!isRecord(rawServer)) {
      return null;
    }

    const rawUrls = Array.isArray(rawServer.urls)
      ? rawServer.urls
      : [rawServer.urls];
    const urls = rawUrls.filter(
      (url): url is string =>
        typeof url === 'string' && /^(stun|stuns|turn|turns):/i.test(url),
    );

    if (urls.length === 0) {
      return null;
    }

    const hasTurnUrl = urls.some((url) => /^turns?:/i.test(url));

    if (!hasTurnUrl) {
      const preferredUrls = urls.filter((url) => !/:53(?:\?|$)/.test(url));
      iceServers.push({
        urls: (preferredUrls.length > 0 ? preferredUrls : urls).slice(
          0,
          MAX_ICE_URLS_PER_SERVER,
        ),
      });
      continue;
    }

    if (
      typeof rawServer.username !== 'string' ||
      rawServer.username.length === 0 ||
      typeof rawServer.credential !== 'string' ||
      rawServer.credential.length === 0
    ) {
      return null;
    }

    const preferredUrls = urls
      .filter((url) => !/:53(?:\?|$)/.test(url))
      .sort(
        (left, right) => getTurnUrlPriority(left) - getTurnUrlPriority(right),
      )
      .slice(0, MAX_ICE_URLS_PER_SERVER);

    if (preferredUrls.length === 0) {
      return null;
    }

    iceServers.push({
      urls: preferredUrls,
      username: rawServer.username,
      credential: rawServer.credential,
    });
  }

  if (
    iceServers.length === 0 ||
    !iceServers.some((server) =>
      server.urls.some((url) => /^turns?:/i.test(url)),
    )
  ) {
    return null;
  }

  return iceServers;
}

function getTurnUrlPriority(url: string) {
  if (/^turns:.*:443\?transport=tcp$/i.test(url)) {
    return 0;
  }

  if (/^turn:.*\?transport=udp$/i.test(url)) {
    return 1;
  }

  if (/^turn:.*:80\?transport=tcp$/i.test(url)) {
    return 2;
  }

  if (/^turns:.*:5349\?transport=tcp$/i.test(url)) {
    return 3;
  }

  return 4;
}

function parseCredentialTtl(rawValue: string | undefined) {
  if (!rawValue) {
    return DEFAULT_CREDENTIAL_TTL_SECONDS;
  }

  const value = Number(rawValue);

  if (
    !Number.isSafeInteger(value) ||
    value < MIN_CREDENTIAL_TTL_SECONDS ||
    value > MAX_CREDENTIAL_TTL_SECONDS
  ) {
    throw new Error(
      `TURN_CREDENTIAL_TTL_SECONDS must be between ${MIN_CREDENTIAL_TTL_SECONDS} and ${MAX_CREDENTIAL_TTL_SECONDS}`,
    );
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}
