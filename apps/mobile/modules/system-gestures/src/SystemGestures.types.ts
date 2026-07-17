export type GameplaySystemGestureDeferral = {
  acquireGameplayDeferral(owner: string): Promise<void>;
  releaseGameplayDeferral(owner: string): Promise<void>;
};
