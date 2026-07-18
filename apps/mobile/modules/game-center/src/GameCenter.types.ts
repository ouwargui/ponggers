export type GameCenterAuthenticationResult = {
  authenticated: boolean;
};

export type GameCenterAchievementProgress = {
  identifier: string;
  percentComplete: number;
};

export type PonggersGameCenterModule = {
  authenticate(): Promise<GameCenterAuthenticationResult>;
  loadAchievements(): Promise<GameCenterAchievementProgress[]>;
  reportAchievements(
    progress: readonly GameCenterAchievementProgress[],
  ): Promise<void>;
  showAchievements(): Promise<void>;
};
