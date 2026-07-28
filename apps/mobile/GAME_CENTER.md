# Ponggers Game Center

## Feature flags

Game Center synchronization is fail-closed and disabled by default. Statistics and achievement progress continue to accumulate locally in MMKV while it is disabled.

Enable Game Center globally, then enable only the components that already exist in App Store Connect:

```text
EXPO_PUBLIC_GAME_CENTER_ENABLED=true
EXPO_PUBLIC_GAME_CENTER_LEADERBOARDS_ENABLED=true
EXPO_PUBLIC_GAME_CENTER_ACHIEVEMENTS_ENABLED=false
```

Leaderboard synchronization is currently active and achievement synchronization is paused. Existing local scores are synchronized the next time the app launches with both the global and leaderboard flags enabled.

## Leaderboards

Create nine classic leaderboards in App Store Connect using the exact identifiers below. Configure every leaderboard as **Best Score**, **High to Low**, and an integer score.

The leaderboards are organized into these sets:

| Set | Identifier | Included leaderboards |
| --- | --- | --- |
| Rally | `com.ouwargui.ponggers.leaderboard.rally` | Easy, Medium, and Impossible longest rally |
| Wins | `com.ouwargui.ponggers.leaderboard.wins` | Easy, Medium, and Impossible wins |
| Matches | `com.ouwargui.ponggers.leaderboard.matches` | Easy, Medium, and Impossible matches played |

Score submissions use the individual leaderboard identifiers below, not the leaderboard set identifiers.

| Difficulty | Metric | Identifier | Singular suffix | Plural suffix |
| --- | --- | --- | --- | --- |
| Easy | Longest Rally | `com.ouwargui.ponggers.leaderboard.rally.easy` | hit | hits |
| Easy | Most Wins | `com.ouwargui.ponggers.leaderboard.wins.easy` | win | wins |
| Easy | Matches Played | `com.ouwargui.ponggers.leaderboard.matches.easy` | match | matches |
| Medium | Longest Rally | `com.ouwargui.ponggers.leaderboard.rally.medium` | hit | hits |
| Medium | Most Wins | `com.ouwargui.ponggers.leaderboard.wins.medium` | win | wins |
| Medium | Matches Played | `com.ouwargui.ponggers.leaderboard.matches.medium` | match | matches |
| Impossible | Longest Rally | `com.ouwargui.ponggers.leaderboard.rally.impossible` | hit | hits |
| Impossible | Most Wins | `com.ouwargui.ponggers.leaderboard.wins.impossible` | win | wins |
| Impossible | Matches Played | `com.ouwargui.ponggers.leaderboard.matches.impossible` | match | matches |

Only solo matches contribute to these leaderboards. Scores are stored locally first and reported after Game Center authentication. Failed reports remain pending and retry on the next progress update or app activation.

## Achievements

Achievement synchronization remains disabled until `EXPO_PUBLIC_GAME_CENTER_ACHIEVEMENTS_ENABLED=true`. Local achievements and theme rewards continue to work while it is disabled.

Create these achievements in App Store Connect using the exact identifiers below before enabling synchronization. The identifiers and point values become effectively permanent once an achievement ships.

| Achievement | Identifier | Points | Theme reward | Requirement |
| --- | --- | ---: | --- | --- |
| SPARK | `com.ouwargui.ponggers.achievement.spark` | 10 | VOLT | Win a match. |
| LOCKED IN | `com.ouwargui.ponggers.achievement.lockedin` | 10 | GRID | Reach a 10-hit rally. |
| OVERDRIVE | `com.ouwargui.ponggers.achievement.overdrive` | 20 | HYPER | Reach a 20-hit rally. |
| ENDLESS | `com.ouwargui.ponggers.achievement.endless` | 30 | VOID | Reach a 30-hit rally. |
| FLAWLESS | `com.ouwargui.ponggers.achievement.flawless` | 25 | PRISM | Win without conceding a point. |
| MACHINE BREAKER | `com.ouwargui.ponggers.achievement.machinebreaker` | 40 | SYNTH | Beat the Impossible AI. |
| CONNECTED | `com.ouwargui.ponggers.achievement.connected` | 20 | LINK | Win an online match. |
| REVERSE SWEEP | `com.ouwargui.ponggers.achievement.reversesweep` | 35 | ECLIPSE | Win after trailing zero points to the opponent's match point. |

For the current first-to-five rules, REVERSE SWEEP means recovering from 0–4 and winning 5–4. The implementation uses the match's configured winning score rather than hard-coded score values.

All achievements are non-repeatable and visible. Ponggers stores progress locally first and synchronizes it with Game Center after authentication, so temporary Game Center or network failures do not lose earned progress.

Theme rewards are independent from Game Center. Their IDs are reserved in `src/game/themes/theme-rewards.ts`; registering a theme under the matching ID makes the earned reward available without migrating achievement progress.
