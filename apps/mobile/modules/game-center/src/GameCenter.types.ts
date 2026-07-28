export type GameCenterAuthenticationResult = {
  authenticated: boolean;
};

export type GameCenterAchievementProgress = {
  identifier: string;
  percentComplete: number;
};

export type GameCenterLeaderboardScore = {
  identifier: string;
  value: number;
};

export type PonggersGameCenterModule = {
  authenticate(): Promise<GameCenterAuthenticationResult>;
  loadAchievements(): Promise<GameCenterAchievementProgress[]>;
  reportAchievements(
    progress: readonly GameCenterAchievementProgress[],
  ): Promise<void>;
  reportLeaderboardScores(
    scores: readonly GameCenterLeaderboardScore[],
  ): Promise<void>;
  showAchievements(): Promise<void>;
  showLeaderboards(): Promise<void>;
};
