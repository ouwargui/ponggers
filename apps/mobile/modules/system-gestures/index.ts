// Re-export the native module. On web, it will be resolved to SystemGesturesModule.web.ts
// and on native platforms to SystemGesturesModule.ts

export * from './src/SystemGestures.types';
export { default } from './src/SystemGesturesModule';
export * from './src/use-deferred-system-gestures';
