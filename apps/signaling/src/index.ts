import { startSignalingServer } from './server';

const server = startSignalingServer();

console.log(`Ponggers signaling listening on ${server.url}`);
