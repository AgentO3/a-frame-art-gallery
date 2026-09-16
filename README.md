# Roomkey

A different state of art. An independent digital gallery pairing an editorial collection with an immersive A-Frame exhibition.

The original eight Deep Dream artworks, artist credits, and source images are preserved. This edition adds responsive layouts, artwork deep links, a keyboard-accessible viewer, artist filters, private browser-local favorites, and a sky-lit 3D gallery with guided navigation.

## Run locally

Use Node.js 22.12+ (Node 24 LTS recommended).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The gallery and collection require no API keys, account, or backend. All fonts, artwork, and the pinned A-Frame engine are served locally. The engine loads only when a visitor opens the immersive gallery.

```sh
npm run build    # Generate a deployable static site in dist/
npm run preview  # Preview the production build
npm test         # Desktop + mobile browser and accessibility checks
npm run test:authoring # Isolated room-authoring and subpath deployment checks
npm run format   # Format the maintained application code
```

Tests use installed Google Chrome locally. In CI they use Playwright Chromium; run `npx playwright install --with-deps chromium` and `CI=1 npm test` to use that configuration elsewhere.

## Exploring

- Select any artwork for its full image, attribution, and an editorial viewing note. Left/right arrow keys browse works; Escape closes the viewer. Links like `#work/crystal-city` open a specific work.
- Save works with the heart button. Favorites stay in this browser's local storage and never leave the device. Private browsing or clearing site data may remove them.
- In the virtual gallery, drag to look and use W/A/S/D to walk. Previous/next buttons move directly to a work on desktop and touchscreens. Select a painting or choose **View artwork** to inspect it.
- Compatible WebXR browsers show **Enter VR** when an immersive session is supported. Controller rays select paintings; thumbsticks move between works. VR requires HTTPS or localhost and a compatible headset. Physical headset behavior needs device testing; desktop/mobile browser verification does not replace it.
- If WebGL cannot start, a recovery screen links back to the complete 2D collection. Closing the gallery pauses its renderer.

## Artwork authoring

`_artworks/*.md` remains the source of truth. Keep original images in `assets/artwork/`; the build validates metadata and creates optimized WebP derivatives without changing those originals.

```yaml
---
image: roomkey/my-work.jpg
title: My Work
created: 2026
artist: Artist Name
room: Roomkey
---
An optional plain-text description of the work.
```

Use a lowercase hyphenated Markdown filename, such as `my-work.md`. Its filename becomes its permanent link. Required fields are `image`, `title`, `created` (a four-digit year), `artist`, and `room`. The image must exist inside `assets/artwork/`. New works appear in the collection and their assigned gallery room automatically; update exhibition copy when changing the curated collection's size or story. Source descriptions are shown as plain text. The original works have no descriptions, so their viewing notes live in `src/main.js`.

To add a room, create `_rooms/my-room.markdown` with front matter containing `title: My Room`. Set an artwork's `room` to that exact title. When there are multiple rooms, a room selector appears in the immersive gallery. Each room gets its own URL, `?gallery=my-room`, plus compatibility redirects at `rooms/my-room.html` and `rooms/my-room/`. Empty rooms have an explicit waiting state. The original room's A-Frame environment markup is preserved in its source file; the redesigned architecture is maintained centrally in `src/gallery.js`.

## Deployment

The checked-in GitHub Actions workflow builds, tests, and deploys the static site to GitHub Pages on pushes to `master` or `main`. Pull requests run verification only. Set the repository's **Settings → Pages → Source** to **GitHub Actions** when ready to publish. Nothing is deployed by running the local commands.

For another static host, upload `dist/`. A relative base path is used by default. For an explicit subpath:

```sh
BASE_PATH=/a-frame-art-gallery/ npm run build
```

Old Roomkey URLs at `rooms/roomkey.html` and `rooms/roomkey/` redirect to the immersive gallery. The root Jekyll configuration, templates, and Ruby files remain as historical source; the maintained site uses Vite and `index.html`. Deploy `dist/` through the provided workflow rather than the old Jekyll branch build. The 404 page supports the original project path and root hosting; adjust its home link when hosting under a different subpath.

## Verification and design

Playwright tests exercise real production output, all eight images, artist filters, favorite persistence, deep links, dialog focus, reduced motion, WebGL fallback, and gallery navigation/pause/resume. Axe checks the landing page and artwork viewer against WCAG A/AA rules. Automated accessibility checks are useful evidence, not a claim of exhaustive accessibility certification.

The design uses warm paper, charcoal green, pale lime, Cormorant Garamond, and Manrope. Source images retain their aspect ratios in the collection and viewer. The 3D gallery uses lightweight geometry, framed works, canvas-rendered labels, skylights, contact shadows, and bounded desktop movement.

See `artifacts/` for captured visual verification, and `VERIFICATION.md` for the final checks. `npm test` also produces a local Playwright report (ignored by Git).

## Credits

Original gallery and artwork collection: [AgentO3/a-frame-art-gallery](https://github.com/AgentO3/a-frame-art-gallery). Art credits are carried from the original Markdown files; uncredited works remain marked Unknown. The original `Uknown` typo is corrected.

A-Frame 1.8.0 is vendored from `https://aframe.io/releases/1.8.0/aframe.min.js`, with its MIT license in `assets/vendor/AFRAME-LICENSE`. The unavailable source-map reference is removed; engine code is unchanged. Manrope and Cormorant Garamond are distributed through Fontsource under the SIL Open Font License. The production build includes `THIRD-PARTY-LICENSES.txt`. No new license or rights claim is made for the original artworks.
