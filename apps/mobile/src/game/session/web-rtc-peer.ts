import type { IceServerConfig } from '@ponggers/signaling-protocol';
import { RTCPeerConnection } from 'react-native-webrtc';

import type { OnlineSessionRole } from '@/game/session/definition';
import {
  decodeWebRtcSignal,
  encodeWebRtcSignal,
  type WebRtcSessionDescription,
} from '@/game/session/web-rtc-signal';
import {
  type SessionDataChannel,
  type SessionDataChannelKind,
  WebRtcSessionTransport,
} from '@/game/session/web-rtc-transport';

const RELIABLE_DATA_CHANNEL_LABEL = 'ponggers-reliable';
const REALTIME_DATA_CHANNEL_LABEL = 'ponggers-realtime';
const ICE_GATHERING_SETTLE_MS = 1_500;
const ICE_GATHERING_TIMEOUT_MS = 8_000;

export type WebRtcIceServer = IceServerConfig;

type WebRtcSessionPeerOptions = {
  iceServers?: WebRtcIceServer[];
  iceTransportPolicy?: 'all' | 'relay';
};

type PeerConnectionEventTarget = {
  addEventListener(type: string, listener: (...args: never[]) => unknown): void;
  removeEventListener(
    type: string,
    listener: (...args: never[]) => unknown,
  ): void;
};

const DEVELOPMENT_ICE_SERVERS: WebRtcIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302'] },
];

export class WebRtcSessionPeer {
  readonly transport = new WebRtcSessionTransport();
  readonly #role: OnlineSessionRole;
  readonly #peerConnection: RTCPeerConnection;
  readonly #peerConnectionEvents: PeerConnectionEventTarget;
  #closed = false;

  constructor(
    role: OnlineSessionRole,
    {
      iceServers = DEVELOPMENT_ICE_SERVERS,
      iceTransportPolicy = 'all',
    }: WebRtcSessionPeerOptions = {},
  ) {
    this.#role = role;
    this.#peerConnection = new RTCPeerConnection({
      iceServers,
      iceTransportPolicy,
    });
    this.#peerConnectionEvents = getPeerConnectionEvents(this.#peerConnection);
    this.#peerConnectionEvents.addEventListener(
      'connectionstatechange',
      this.#handleConnectionStateChange,
    );

    if (role === 'host') {
      this.transport.attachDataChannel(
        'reliable',
        this.#peerConnection.createDataChannel(
          RELIABLE_DATA_CHANNEL_LABEL,
        ) as unknown as SessionDataChannel,
      );
      this.transport.attachDataChannel(
        'realtime',
        this.#peerConnection.createDataChannel(REALTIME_DATA_CHANNEL_LABEL, {
          ordered: false,
          maxRetransmits: 0,
        }) as unknown as SessionDataChannel,
      );
    } else {
      this.#peerConnectionEvents.addEventListener(
        'datachannel',
        this.#handleDataChannel,
      );
    }
  }

  async createOfferSignal() {
    this.#assertRole('host');

    try {
      const offer = await this.#peerConnection.createOffer();
      await this.#peerConnection.setLocalDescription(offer);
      await waitForIceGathering(this.#peerConnection);
      return encodeWebRtcSignal(this.#getLocalDescription('offer'));
    } catch (error) {
      this.transport.fail();
      throw error;
    }
  }

  async acceptOfferAndCreateAnswerSignal(offerSignal: string) {
    this.#assertRole('guest');
    const offer = decodeWebRtcSignal(offerSignal, 'offer');

    if (!offer) {
      throw new Error('The host offer is not a valid Ponggers RTC signal');
    }

    try {
      await this.#peerConnection.setRemoteDescription(offer.description);
      const answer = await this.#peerConnection.createAnswer();
      await this.#peerConnection.setLocalDescription(answer);
      await waitForIceGathering(this.#peerConnection);
      return encodeWebRtcSignal(this.#getLocalDescription('answer'));
    } catch (error) {
      this.transport.fail();
      throw error;
    }
  }

  async acceptAnswerSignal(answerSignal: string) {
    this.#assertRole('host');
    const answer = decodeWebRtcSignal(answerSignal, 'answer');

    if (!answer) {
      throw new Error('The guest answer is not a valid Ponggers RTC signal');
    }

    try {
      await this.#peerConnection.setRemoteDescription(answer.description);
    } catch (error) {
      this.transport.fail();
      throw error;
    }
  }

  close() {
    if (this.#closed) {
      return;
    }

    this.#closed = true;
    this.#peerConnectionEvents.removeEventListener(
      'connectionstatechange',
      this.#handleConnectionStateChange,
    );

    if (this.#role === 'guest') {
      this.#peerConnectionEvents.removeEventListener(
        'datachannel',
        this.#handleDataChannel,
      );
    }

    this.transport.close();
    this.#peerConnection.close();
  }

  #handleConnectionStateChange = () => {
    this.transport.handlePeerConnectionState(
      this.#peerConnection.connectionState,
    );
  };

  #handleDataChannel = (event: { channel: SessionDataChannel }) => {
    const kind = getDataChannelKind(event.channel.label);

    if (!kind) {
      event.channel.close();
      return;
    }

    this.transport.attachDataChannel(kind, event.channel);
  };

  #getLocalDescription(
    expectedType: WebRtcSessionDescription['type'],
  ): WebRtcSessionDescription {
    const description = this.#peerConnection.localDescription;

    if (
      !description ||
      description.type !== expectedType ||
      description.sdp.length === 0
    ) {
      throw new Error(`WebRTC did not produce a complete ${expectedType}`);
    }

    return {
      type: expectedType,
      sdp: description.sdp,
    };
  }

  #assertRole(expectedRole: OnlineSessionRole) {
    if (this.#closed) {
      throw new Error('The WebRTC session is already closed');
    }

    if (this.#role !== expectedRole) {
      throw new Error(
        `Only the ${expectedRole} can perform this signaling operation`,
      );
    }
  }
}

function getDataChannelKind(label: string): SessionDataChannelKind | null {
  if (label === RELIABLE_DATA_CHANNEL_LABEL) {
    return 'reliable';
  }

  return label === REALTIME_DATA_CHANNEL_LABEL ? 'realtime' : null;
}

function waitForIceGathering(peerConnection: RTCPeerConnection) {
  if (peerConnection.iceGatheringState === 'complete') {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const peerConnectionEvents = getPeerConnectionEvents(peerConnection);
    let settleTimeout: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve();
    };
    const scheduleCandidateSettle = () => {
      if (!hasGatheredIceCandidate(peerConnection)) {
        return;
      }

      if (settleTimeout) {
        clearTimeout(settleTimeout);
      }

      // Some react-native-webrtc builds never report `complete`. Once candidate
      // events go quiet, the candidates gathered so far are already embedded in
      // localDescription and are safe to exchange in our non-trickle signal.
      settleTimeout = setTimeout(finish, ICE_GATHERING_SETTLE_MS);
    };
    const handleStateChange = () => {
      if (peerConnection.iceGatheringState !== 'complete') {
        return;
      }

      finish();
    };
    const handleIceCandidate = (event: { candidate?: unknown }) => {
      if (event.candidate == null) {
        finish();
        return;
      }

      scheduleCandidateSettle();
    };
    const timeout = setTimeout(() => {
      if (hasGatheredIceCandidate(peerConnection)) {
        finish();
        return;
      }

      settled = true;
      cleanup();
      reject(
        new Error(
          `WebRTC did not gather any ICE candidates (state: ${peerConnection.iceGatheringState})`,
        ),
      );
    }, ICE_GATHERING_TIMEOUT_MS);
    const cleanup = () => {
      clearTimeout(timeout);

      if (settleTimeout) {
        clearTimeout(settleTimeout);
      }

      peerConnectionEvents.removeEventListener(
        'icegatheringstatechange',
        handleStateChange,
      );
      peerConnectionEvents.removeEventListener(
        'icecandidate',
        handleIceCandidate,
      );
    };

    peerConnectionEvents.addEventListener(
      'icegatheringstatechange',
      handleStateChange,
    );
    peerConnectionEvents.addEventListener('icecandidate', handleIceCandidate);
    handleStateChange();
    scheduleCandidateSettle();
  });
}

function hasGatheredIceCandidate(peerConnection: RTCPeerConnection) {
  return /^a=candidate:/m.test(peerConnection.localDescription?.sdp ?? '');
}

function getPeerConnectionEvents(
  peerConnection: RTCPeerConnection,
): PeerConnectionEventTarget {
  // react-native-webrtc implements EventTarget at runtime, but its inherited
  // methods are absent from the public TypeScript surface with Expo 57's
  // TypeScript version.
  return peerConnection as unknown as PeerConnectionEventTarget;
}
