# Audio Assets

Third-party audio currently used by the production build:

Sound effects:

- `attack_explosion.mp3`
- `card_shuffle.wav`
- `impact.wav`
- `projectile.wav`
- `ui_click.wav`
- `unlock.wav`
- `lightning-strike.mp3`

Source:

- Mixkit Free Stock Music and Free Sound Effects
- Music page: `https://mixkit.co/free-stock-music/`
- SFX page: `https://mixkit.co/free-sound-effects/`
- License page: `https://mixkit.co/license/`

Additional combat opening source:

- `lightning-strike.mp3`
- Source: user-provided file in `assets/sfx`.

Chapter 6 siege source:

- `assets/Historia/foso-viento-negro-asedio/assets/missile-flyby-cc0.mp3`
- Source: `Rocket Fly By (8-bit)` by `Person` on OpenGameArt.
- Source page: `https://opengameart.org/content/rocket-fly-8-bit`
- Original file: `https://opengameart.org/sites/default/files/rocket.wav`
- License: `CC0 1.0 Universal` (`https://creativecommons.org/publicdomain/zero/1.0/`)
- Processing: converted from WAV to MP3 with short fade-in/fade-out for web playback.

Usage note:

- The sound effects were added for in-game UI, impact, projectile, and explosion feedback.
- The project uses them alongside existing procedural audio already present in the game code.

Current production integration:

- `poker_combat_bot_ONLINE.html`
