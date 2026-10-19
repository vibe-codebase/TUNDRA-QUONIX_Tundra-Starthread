# Tundra Starthread

By **TUNDRA QUONIX** · package `com.tundraquonix.tundrastarthread` · Expo owner `899-903`.

A calm line-drawing puzzle for Android: draw every constellation in a single unbroken thread of light.

**How it plays.**
- Touch a star and slide to the next along a dotted line. The line lights up behind your finger.
- Light every line exactly once without lifting the thread from the sky. Lift your finger whenever you like: the thread waits at its last star.
- If the thread reaches a star with nothing left to trace while lines remain, it is stuck. Undo a step, or begin again.
- **Comet lines** go one way only, the way their arrows point. **Double lines** must be traced twice, once along each strand.
- Stars: three for a constellation drawn without getting stuck, two for a slip or two (or with a hint).
- A hint lights the next star, and takes the thread back first if it can no longer be finished.

**Content.**
- 24 star charts in three skies:
  - **First Light:** dusk.
  - **Comet Paths:** a moonlit midnight.
  - **Double Stars:** an aurora night.
- Every chart is generated and checked:
  - It can always be drawn in one thread.
  - Lines never cross, never graze another star, and never meet at a narrow angle.
  - Charts are ordered by how often a thread of random choices gets stuck.

**Look and sound.**
- Visuals: a painted night sky with the Milky Way, twinkling stars and pine hills. Constellation stars have glows and diffraction spikes, and lit lines glow with a white core. A shooting star crosses the sky when a constellation is complete, and its name rises beneath it.
- Sound: every star rings a celesta note, higher for higher stars, and the thread hums as it is drawn. A finished constellation plays its stars back in the order you drew them. Under it all is a slow pad and the night air.

## Structure

| Path | What it is |
| --- | --- |
| `web/src/game/sim.ts` | The thread, comet and double lines, the depth-first solver, the trickiness measure |
| `web/src/game/skies.json` | The 24 generated charts |
| `web/tools/gen.ts` | The chart generator |
| `web/src/game/scene.ts` | The Phaser sky |
| `web/brand/` | Icon, splash and feature graphic |
| `Delivery/` | Play Store icon, feature graphic and screenshots |
| `src/native/` | Expo WebView shell |

```bash
npm install && npm run web:install
npm run web:test     # 35 tests
npm run build:game && npm run validate:assets && npm run android
```

## Release builds

The Android release is configured for Google Play: target and compile SDK 36, R8 minification and resource shrinking, a non-debuggable release build, no Internet permission, and the game served offline from the app's own assets. Builds run on EAS; `eas.json` has two profiles:

```bash
npm install -g eas-cli && eas login
eas init                     # once: links this folder to your Expo project
npm run eas:apk              # preview profile: a signed APK for testing on devices
npm run eas:aab              # production profile: an AAB for Google Play (versionCode auto-increments)
```
