import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import {
  ACHIEVEMENTS,
  type AchievementDefinition,
  orderAchievementsByProgress,
} from '@/achievements/definitions';
import { useAchievementProgress } from '@/achievements/use-achievement-progress';
import { useGameTheme } from '@/game/themes/game-theme-provider';
import { neonTextGlow } from '@/game/themes/neon/neon-text-glow';
import { getThemeReward } from '@/game/themes/theme-rewards';
import { GameMenu } from '@/menu/game-menu';

type AchievementCardProps = {
  achievement: AchievementDefinition;
  index: number;
  percentComplete: number;
  rawCurrent: number;
};

function withAlpha(color: string, alpha: string) {
  return color.length === 7 ? `${color}${alpha}` : color;
}

function AchievementCard({
  achievement,
  index,
  percentComplete,
  rawCurrent,
}: AchievementCardProps) {
  const { palette } = useGameTheme();
  const completed = percentComplete >= 100;
  const accent = completed ? palette.players.bottom.glow : palette.ball.glow;
  const themeReward = getThemeReward(achievement.themeRewardId);
  const derivedCurrent = Math.floor(
    (percentComplete / 100) * achievement.progress.target,
  );
  const current = Math.min(
    achievement.progress.target,
    Math.max(rawCurrent, derivedCurrent),
  );
  const stateLabel = completed ? 'COMPLETE' : `${percentComplete}%`;

  return (
    <Animated.View
      accessible
      accessibilityLabel={`${achievement.title}. ${achievement.description} ${stateLabel}. Unlocks the ${themeReward.name} theme.`}
      entering={FadeInDown.delay(index * 45)
        .duration(260)
        .reduceMotion(ReduceMotion.Never)}
      style={[
        styles.card,
        {
          backgroundColor: withAlpha(accent, completed ? '13' : '08'),
          borderColor: withAlpha(accent, completed ? '99' : '2b'),
          shadowColor: accent,
          shadowOpacity: completed ? 0.3 : 0.08,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.glyph,
            {
              borderColor: withAlpha(accent, completed ? 'cc' : '40'),
              backgroundColor: withAlpha(accent, completed ? '18' : '0a'),
              shadowColor: accent,
              shadowOpacity: completed ? 0.6 : 0.15,
            },
          ]}
        >
          <Text
            style={[
              styles.glyphText,
              { color: accent },
              completed ? neonTextGlow(accent, 7) : null,
            ]}
          >
            {achievement.glyph}
          </Text>
        </View>

        <View style={styles.cardHeading}>
          <Text
            style={[
              styles.cardTitle,
              { color: completed ? accent : palette.ball.core },
              completed ? neonTextGlow(accent, 4) : null,
            ]}
          >
            {achievement.title}
          </Text>
          <Text
            style={[
              styles.description,
              { color: withAlpha(palette.ball.core, 'a8') },
            ]}
          >
            {achievement.description}
          </Text>
        </View>

        <Text style={[styles.points, { color: accent }]}>
          {achievement.points} PTS
        </Text>
      </View>

      <View style={styles.progressSection}>
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: withAlpha(palette.ball.glow, '16') },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: accent,
                shadowColor: accent,
                width: `${percentComplete}%`,
              },
            ]}
          />
        </View>
        <View style={styles.progressLabels}>
          <Text
            style={[
              styles.progressValue,
              { color: withAlpha(palette.ball.core, 'b8') },
            ]}
          >
            {current} / {achievement.progress.target}
          </Text>
          <Text style={[styles.progressState, { color: accent }]}>
            {stateLabel}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.reward,
          {
            backgroundColor: withAlpha(accent, completed ? '14' : '08'),
            borderColor: withAlpha(accent, completed ? '55' : '20'),
          },
        ]}
      >
        <Text
          style={[
            styles.rewardLabel,
            { color: completed ? accent : withAlpha(palette.ball.core, '80') },
          ]}
        >
          {completed ? 'THEME UNLOCKED' : 'UNLOCKS'}
        </Text>
        <View style={[styles.rewardDot, { backgroundColor: accent }]} />
        <Text style={[styles.rewardName, { color: accent }]}>
          {themeReward.name}
        </Text>
      </View>
    </Animated.View>
  );
}

export function AchievementsScreen() {
  const { palette } = useGameTheme();
  const { achievementProgress, statistics } = useAchievementProgress();
  const orderedAchievements = orderAchievementsByProgress(achievementProgress);
  const completedCount = ACHIEVEMENTS.filter(
    ({ id }) => (achievementProgress[id] ?? 0) >= 100,
  ).length;
  const totalPoints = ACHIEVEMENTS.reduce(
    (total, achievement) => total + achievement.points,
    0,
  );
  const earnedPoints = ACHIEVEMENTS.reduce(
    (total, achievement) =>
      total +
      ((achievementProgress[achievement.id] ?? 0) >= 100
        ? achievement.points
        : 0),
    0,
  );

  return (
    <GameMenu>
      <View
        accessible
        accessibilityLabel={`${completedCount} of ${ACHIEVEMENTS.length} achievements completed. ${earnedPoints} of ${totalPoints} points earned.`}
        style={styles.summary}
      >
        <View style={styles.summaryMetric}>
          <Text
            style={[
              styles.summaryValue,
              { color: palette.players.bottom.glow },
              neonTextGlow(palette.players.bottom.glow, 8),
            ]}
          >
            {completedCount}/{ACHIEVEMENTS.length}
          </Text>
          <Text
            style={[
              styles.summaryLabel,
              { color: withAlpha(palette.ball.core, '8f') },
            ]}
          >
            COMPLETE
          </Text>
        </View>
        <View
          style={[
            styles.summaryDivider,
            { backgroundColor: withAlpha(palette.ball.glow, '2b') },
          ]}
        />
        <View style={styles.summaryMetric}>
          <Text
            style={[
              styles.summaryValue,
              { color: palette.ball.core },
              neonTextGlow(palette.ball.glow, 5),
            ]}
          >
            {earnedPoints}/{totalPoints}
          </Text>
          <Text
            style={[
              styles.summaryLabel,
              { color: withAlpha(palette.ball.core, '8f') },
            ]}
          >
            POINTS
          </Text>
        </View>
      </View>

      <View style={styles.cards}>
        {orderedAchievements.map((achievement, index) => (
          <AchievementCard
            achievement={achievement}
            index={index}
            key={achievement.id}
            percentComplete={achievementProgress[achievement.id] ?? 0}
            rawCurrent={achievement.progress.current(statistics)}
          />
        ))}
      </View>
    </GameMenu>
  );
}

const styles = StyleSheet.create({
  summary: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryMetric: {
    minWidth: 112,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  summaryLabel: {
    marginTop: 5,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 3,
  },
  summaryDivider: {
    width: 1,
    height: 38,
    marginHorizontal: 8,
  },
  cards: {
    gap: 12,
  },
  card: {
    minHeight: 170,
    padding: 16,
    borderWidth: 1,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  glyph: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
  },
  glyphText: {
    fontSize: 24,
    fontWeight: '800',
  },
  cardHeading: {
    flex: 1,
    minWidth: 0,
    marginLeft: 13,
    paddingTop: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  description: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  points: {
    marginLeft: 8,
    paddingTop: 3,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  progressSection: {
    marginTop: 16,
  },
  progressTrack: {
    height: 3,
    overflow: 'hidden',
    borderRadius: 2,
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  progressValue: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  progressState: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  reward: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 999,
  },
  rewardLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  rewardDot: {
    width: 3,
    height: 3,
    marginHorizontal: 7,
    borderRadius: 2,
  },
  rewardName: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
