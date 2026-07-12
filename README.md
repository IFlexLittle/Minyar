# 🌸 Mannou's Garden Quest 🌸

A tiny enchanted-garden adventure, made with love for Mannou.

Mannou arrives in a magical garden where every flower has lost its color.
A glowing butterfly asks her to restore them by completing five relaxing
mini-games. Each victory earns a **Heart Blossom** — collect all five to
awaken the garden's heart and discover the surprise waiting inside it. ❤️

**Playtime:** about 7–10 minutes.

## The five quests

Every quest opens with an illustrated "how to play" card before it starts.

| # | Quest | How it plays |
|---|-------|--------------|
| 1 | 🦋 Butterfly Chase | Tap and catch 15 glowing butterflies |
| 2 | 🌸 Petal Dash | Glide left/right, catch 30 pink petals, dodge brown leaves (3 hearts) |
| 3 | 🌷 Flower Memory | Match six flower pairs — matched pairs stay revealed |
| 4 | 🐝 Bee Rescue | Drag a lost bee through a hedge maze to her flower |
| 5 | ✨ Bloom Challenge | Watch the flowers light up, repeat the melody (5 rounds) |

There are also little secrets: tap the garden's flowers for whispered love
notes, and… try tapping the moon a few times. 🌙

## Tech

- **100 % self-contained** — plain HTML/CSS/JS, zero external dependencies,
  zero image/audio assets. All art is painted procedurally on canvas
  (gradient-shaded flowers in four species, layered sunset sky with god
  rays and parallax clouds, animated grass, fireflies, depth-of-field
  foreground blooms) and the soundtrack (soft piano, birds, wind, bells)
  is synthesized live with the Web Audio API.
- **Adaptive quality** — the game measures its own frame rate on startup
  and quietly reduces decorative layers on weak devices, so it stays
  smooth everywhere.
- **Mobile-first, portrait, touch-only** — designed for phones; desktop gets
  a centered letterboxed stage. Works in mobile Chrome, Safari, Edge and
  Firefox.
- **PWA** — installable, works fully offline after the first load
  (`sw.js` + `manifest.webmanifest`).
- **Local save** — progress survives refreshes and closing the browser
  (`localStorage`). No accounts, no ads, no tracking.

### Files

```
index.html            entry point
css/style.css         UI styling (cards, letter, envelope, memory cards…)
js/audio.js           Web Audio engine — generative music, ambience, SFX
js/art.js             procedural painting: flowers, butterflies, sky, particles
js/games.js           the five mini-games + shared victory sequence
js/main.js            app core: scenes (title/intro/hub/ending), save, input
sw.js                 service worker (offline cache)
manifest.webmanifest  PWA manifest
icons/                generated app icons
tools/make_icons.py   regenerates the icons (pure python, no deps)
```

## Hosting & the QR code

Any static host works. The quickest path with this repo:

1. **GitHub Pages:** repo *Settings → Pages → Deploy from a branch*, pick the
   branch and `/ (root)`. The game will be served at
   `https://<user>.github.io/Minyar/`.
2. Generate a QR code that points at that URL and print it inside a card. 💌

> Serving over **HTTPS** is required for the offline/PWA features
> (GitHub Pages does this automatically).

To run locally: `python3 -m http.server` in the repo folder, then open
`http://localhost:8000` (best in a phone-sized responsive view).

## Development notes

- Bump the `CACHE` version string in `sw.js` whenever files change after
  the first deployment, so returning players get the update.
- `window.__mgq` exposes the app object for automated tests (scene name,
  save state, etc.). It has no effect on gameplay.
