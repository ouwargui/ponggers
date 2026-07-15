export const WEB_RTC_SIGNAL_VERSION = 1;

export type WebRtcSignalType = 'offer' | 'answer';

export type WebRtcSessionDescription = {
  type: WebRtcSignalType;
  sdp: string;
};

export type WebRtcSignal = {
  version: typeof WEB_RTC_SIGNAL_VERSION;
  description: WebRtcSessionDescription;
};

export function encodeWebRtcSignal(
  description: WebRtcSessionDescription,
): string {
  return JSON.stringify({
    version: WEB_RTC_SIGNAL_VERSION,
    description,
  } satisfies WebRtcSignal);
}

export function decodeWebRtcSignal(
  payload: string,
  expectedType?: WebRtcSignalType,
): WebRtcSignal | null {
  try {
    return parseWebRtcSignal(JSON.parse(payload), expectedType);
  } catch {
    return null;
  }
}

export function parseWebRtcSignal(
  value: unknown,
  expectedType?: WebRtcSignalType,
): WebRtcSignal | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const signal = value as Record<string, unknown>;

  if (
    signal.version !== WEB_RTC_SIGNAL_VERSION ||
    !signal.description ||
    typeof signal.description !== 'object'
  ) {
    return null;
  }

  const description = signal.description as Record<string, unknown>;
  const type = description.type;

  if (
    (type !== 'offer' && type !== 'answer') ||
    (expectedType !== undefined && type !== expectedType) ||
    typeof description.sdp !== 'string' ||
    description.sdp.length === 0
  ) {
    return null;
  }

  return {
    version: WEB_RTC_SIGNAL_VERSION,
    description: {
      type,
      sdp: description.sdp,
    },
  };
}
