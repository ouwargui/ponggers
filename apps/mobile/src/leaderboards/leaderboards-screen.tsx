import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { SoloDifficultyStatistics } from '@/achievements/statistics';
import type { AiDifficultyLevel } from '@/game/ai/ai-difficulty';
import { useGameTheme } from '@/game/themes/game-theme-provider';
import { showGameCenterLeaderboards } from '@/game-center/game-center-client';
import { GAME_CENTER_LEADERBOARDS_ENABLED } from '@/game-center/game-center-config';
import { useLeaderboardStatistics } from '@/leaderboards/use-leaderboard-statistics';
import { GameMenu, GameMenuButton } from '@/menu/game-menu';

const DIFFICULTIES: readonly {
  id: AiDifficultyLevel;
  label: string;
  color: 'bottom' | 'neutral' | 'top';
}[] = [
  { id: 'easy', label: 'EASY', color: 'bottom' },
  { id: 'medium', label: 'MEDIUM', color: 'neutral' },
  { id: 'hard', label: 'IMPOSSIBLE', color: 'top' },
];

function withAlpha(color: string, alpha: string) {
  return color.length === 7 ? `${color}${alpha}` : color;
}

function DifficultyCard({
  label,
  statistics,
  accent,
}: {
  label: string;
  statistics: SoloDifficultyStatistics;
  accent: string;
}) {
  const { effects, palette } = useGameTheme();
  const metrics = [
    { label: 'RALLY', value: statistics.longestRally },
    { label: 'WINS', value: statistics.matchesWon },
    { label: 'PLAYED', value: statistics.matchesPlayed },
  ];

  return (
    <View
      accessible
      accessibilityLabel={`${label}. Longest rally ${statistics.longestRally}. ${statistics.matchesWon} wins. ${statistics.matchesPlayed} matches played.`}
      style={[
        styles.card,
        {
          backgroundColor: withAlpha(accent, '0a'),
          borderColor: withAlpha(accent, '45'),
          shadowColor: accent,
        },
      ]}
    >
      <Text
        style={[
          styles.difficulty,
          { color: accent },
          effects.textGlow(accent, 5),
        ]}
      >
        {label}
      </Text>
      <View style={styles.metrics}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <Text
              style={[
                styles.metricValue,
                { color: palette.ball.core },
                effects.textGlow(accent, 3),
              ]}
            >
              {metric.value}
            </Text>
            <Text
              style={[
                styles.metricLabel,
                { color: withAlpha(palette.ball.core, '8f') },
              ]}
            >
              {metric.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function LeaderboardsScreen() {
  const { palette } = useGameTheme();
  const statistics = useLeaderboardStatistics();
  const [opening, setOpening] = useState(false);
  const [message, setMessage] = useState<string | null>(
    GAME_CENTER_LEADERBOARDS_ENABLED
      ? null
      : 'GAME CENTER IS DISABLED IN THIS BUILD',
  );
  const openGameCenter = useCallback(async () => {
    if (opening) {
      return;
    }

    setOpening(true);
    setMessage(null);

    try {
      const shown = await showGameCenterLeaderboards();

      if (!shown) {
        setMessage('SIGN IN TO GAME CENTER TO VIEW GLOBAL RANKINGS');
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('[Game Center] Could not open leaderboards', error);
      }

      setMessage('GAME CENTER IS UNAVAILABLE RIGHT NOW');
    } finally {
      setOpening(false);
    }
  }, [opening]);

  return (
    <GameMenu>
      <View style={styles.cards}>
        {DIFFICULTIES.map(({ color, id, label }) => {
          const accent =
            color === 'top'
              ? palette.players.top.glow
              : color === 'bottom'
                ? palette.players.bottom.glow
                : palette.ball.glow;

          return (
            <DifficultyCard
              accent={accent}
              key={id}
              label={label}
              statistics={statistics.soloByDifficulty[id]}
            />
          );
        })}
      </View>

      <GameMenuButton
        accessibilityHint="Opens the global Ponggers rankings in Game Center"
        label={opening ? 'OPENING...' : 'GLOBAL RANKINGS'}
        onPress={openGameCenter}
      />

      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[
            styles.message,
            { color: withAlpha(palette.ball.core, 'a0') },
          ]}
        >
          {message}
        </Text>
      ) : null}
    </GameMenu>
  );
}

const styles = StyleSheet.create({
  cards: {
    gap: 12,
  },
  card: {
    minHeight: 120,
    padding: 16,
    borderWidth: 1,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
  },
  difficulty: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 4,
  },
  metrics: {
    flexDirection: 'row',
    marginTop: 18,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2,
  },
  message: {
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
