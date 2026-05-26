# Dumb Abo (für derstandard.at)

<img src="icons/dumb-abo.svg" alt="Dumb Abo icon" width="96" align="right">

A small Firefox extension that re-enables the comment-sort tabs that
[derstandard.at](https://www.derstandard.at) recently moved behind their
*Smart-Abo* paywall — Plus, Minus, Älteste, and friends.

The fix lives entirely on the client. The comment GraphQL endpoint already
returns the sorted data unauthenticated; only the page's own JS short-circuits
the fetch for non-subscribers and renders a paywall card instead. This
extension flips that short-circuit and lets the fetch through.

## Install

- **Firefox** — [addons.mozilla.org/firefox/addon/dumb-abo-für-derstandard-at](https://addons.mozilla.org/firefox/addon/dumb-abo-für-derstandard-at)
- **Chrome / Chromium / Edge** — [Chrome Web Store listing](https://chromewebstore.google.com/) <!-- TODO: paste CWS URL after review -->

After install, open any `derstandard.at/story/...` article and scroll to
the *Diskussion* section. The previously locked sort tabs now load comments.

## How it works

The forum widget is a Lit custom element (`<dst-forum>`) with an open shadow
root. Two content scripts cooperate:

- An **isolated-world** script ([src/content.js](src/content.js)) watches for
  clicks on the sort tabs (via `event.composedPath()` so it sees through the
  shadow boundary) and forwards them.
- A **main-world** script ([src/inject.js](src/inject.js)) talks to the Lit
  element's instance API: when a sort click triggers the paywall, it clears
  `showSubscriptionNotice`, resets the pagination cursor, and calls the
  element's own `fetchPostings()` method. It also keeps `nextCursor` in
  sync from each response so scroll-pagination stays consistent.

No subscription state is faked — no cookies, localStorage, or
prototype-level overrides. The bypass is limited to one render-time UI flag,
flipped only after a deliberate tab click.

## Permissions & data

- Runs only on `*://*.derstandard.at/story/*` (declared in the manifest).
- No host permissions, no `storage`, no remote servers, no telemetry.
- All network traffic stays between your browser and derstandard.at's
  existing GraphQL endpoint.

## Compatibility

- **Firefox 128+** (verified target).
- **Chrome / Chromium / Edge 111+** — same manifest, same code. The MV3
  `world: "MAIN"` content-script feature landed in Chrome 111 and Firefox 128.
  The Firefox-specific `browser_specific_settings.gecko` block is harmless
  on Chromium (unknown manifest keys are ignored).

## Limitations

- Sort-tab labels are matched against a German regex (`Plus|Minus|Älteste|
  Aktuellste|…`). If derstandard.at adds a new label, widen the regex in
  [src/content.js](src/content.js).
- The unlock recipe depends on `<dst-forum>`'s shadow root staying *open*
  and on the `showSubscriptionNotice` / `fetchPostings` API not being
  renamed. A meaningful frontend rewrite on derstandard.at's side will
  likely break this and require re-inspecting the element.

## Development

No build step, no dependencies. To run from source:

- **Firefox**: `about:debugging#/runtime/this-firefox` → **Load Temporary
  Add-on…** → pick `manifest.json`. Click *Reload* after edits.
- **Chrome / Chromium / Edge**: `chrome://extensions` → enable **Developer
  mode** → **Load unpacked** → pick the repo folder. Click the refresh icon
  on the extension card after edits.

Filter the DevTools Console by `ds-unlock` to follow the extension's
decisions (`paywall detected for sortField=…`, `synced nextCursor`, …).
See [CLAUDE.md](CLAUDE.md) for the architecture deep-dive — including the
cursor-sync subtlety that's easy to miss.

If `icons/dumb-abo.svg` changes, refresh the PNG set (Chromium's manifest
needs PNGs). Use `rsvg-convert` (`brew install librsvg`) — ImageMagick's
built-in SVG renderer silently drops stroked paths:

```sh
for s in 16 32 48 96 128; do
  rsvg-convert -w $s -h $s icons/dumb-abo.svg -o icons/dumb-abo-${s}.png
done
```

## License

MIT — see [LICENSE](LICENSE).

## Disclaimer

Not affiliated with or endorsed by STANDARD Verlagsgesellschaft m.b.H.
"derStandard" and "Smart-Abo" are trademarks of their respective owners;
they appear here for descriptive use only. If you find derstandard.at's
journalism worth paying for, please do — this extension exists for users
who specifically miss the sort-by-likes feature, not as a substitute for
supporting the publication.
