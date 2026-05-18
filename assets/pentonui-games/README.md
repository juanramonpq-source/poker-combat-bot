# Pentonúi Games Brand Assets

Logo set for the PoCoBOT project.

## Recommended Files

- `svg/pentonui-games-logo-transparent.svg`: primary scalable logo.
- `svg/pentonui-games-mark-transparent.svg`: standalone emblem/icon.
- `png/pentonui-games-logo-transparent-1600.png`: large transparent logo export.
- `png/pentonui-games-logo-white-1600.png`: white-background logo export.
- `png/pentonui-games-logo-black-1600.png`: black-background logo export.
- `icons/pentonui-games-icon-512.png`: standard square app/social icon.
- `icons/pentonui-games-icon-transparent-512.png`: transparent square icon.
- `icons/pentonui-games-icon-maskable-512.png`: PWA maskable icon.
- `pentonui-games.webmanifest`: optional manifest snippet for web/PWA use.

## Concept

The mark is an abstract 8-petal mechanical flower in blue tones. Three triangular gemstone inlays keep the elemental idea without forming a Triforce-like silhouette:

- Blue gem above for ice.
- Red gem lower-left for fire/lava.
- Green gem lower-right for plant/nature.

## Regeneration

Run this from the project root:

```bash
node assets/pentonui-games/build-pentonui-assets.mjs
```

The script uses macOS `sips` to render the SVG sources into PNG exports.
