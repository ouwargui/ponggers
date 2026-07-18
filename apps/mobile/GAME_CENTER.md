# Ponggers Game Center achievements

## Feature flag

Game Center synchronization is fail-closed and disabled by default. Statistics and achievement progress continue to accumulate locally in MMKV while it is disabled.

Enable authentication, reporting, and the Game Center dashboard by setting this public build variable:

```text
EXPO_PUBLIC_GAME_CENTER_ENABLED=true
```

Only enable it after the achievements below exist in App Store Connect. Existing local progress will be synchronized the next time the app launches with the flag enabled.

Create these achievements in App Store Connect using the exact identifiers below. The identifiers and point values become effectively permanent once an achievement ships.

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
