# Verification record

This is the local verification record for the Roomkey upgrade, refreshed on September 16, 2026.

## Passed

- `npm run build` — Vite production build completed; optimized WebP artwork, local fonts, vendored A-Frame, room compatibility pages, and `THIRD-PARTY-LICENSES.txt` emitted to `dist/`.
- `npm test` — 35 Playwright checks passed across desktop Chrome and mobile emulation; one touch-only check was intentionally skipped on desktop. The suite rebuilt the production site before running. Movement regressions cover all WASD and arrow keys at four camera headings while a gallery button has focus, stopping on window blur, and clearing held keys through artwork-dialog pause/resume. Additional checks cover gallery shortcuts, reflection caching and rendering, and the mobile walking pad.
- Development-server browser check (`http://127.0.0.1:4173`) — holding W for 400 ms moved the camera forward from z=5 to z=3.32; after turning toward an artwork, W correctly moved left from x=-1.8 to x=-3.48 with z unchanged. Vite development mode was confirmed.
- `git diff --check` — no whitespace errors.
- `npm install` — 0 reported vulnerabilities after upgrading Sharp to `0.35.4`.
- Visual browser inspection — desktop landing page, mobile landing page, 3D gallery, guided work view, and responsive collection screenshots are in `artifacts/`.

The browser suite covers all eight original works and loaded images, responsive overflow, artist filtering, private favorites and persistence, deep-linked artwork viewing, keyboard navigation, dialog focus trapping and focus return, WCAG A/AA Axe checks, reduced motion, malformed storage and hashes, WebGL fallback, real 3D painting picking, gallery navigation, pause/resume, context interruption recovery, legacy room URLs, and repeated loading clicks.

## Authoring verifier

`npm run test:authoring` passed end to end on September 16, 2026. It validates room and artwork front matter, generated subpath URLs, bundled licenses, safe descriptions, empty rooms, room switching, a 20-work room, legacy URLs, optimized images, and invalid room references. The development checks also passed for live Markdown refresh and 3D startup, with no browser errors or HTTP error responses.

The managed sandbox initially blocked local preview ports with `listen EPERM`. Both browser suites completed after being rerun with approved execution outside the sandbox. That rerun exposed a fixture-only issue: symlinked font packages were outside Vite's allowed filesystem root and returned HTTP 403 in development mode. The fixture now copies those small packages locally while sharing build dependencies; the complete authoring rerun passed. The verifier also passed its Prettier formatting check.

The earlier network audit endpoint was unavailable (`ENOTFOUND`) after the local install had reported zero vulnerabilities. The dependency audit was not rerun during this verification refresh.

Physical headset tracking and controller ergonomics still need device-level testing on a compatible WebXR headset. Browser-level WebXR capability detection, controller markup, fallback behavior, and navigation are covered by the application and automated checks.
