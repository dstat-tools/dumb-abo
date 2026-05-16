# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Manifest V3 WebExtension ("Dumb Abo") that re-enables the paywalled
comment sort tabs (Plus, Minus, Älteste, …) in
[derstandard.at](https://www.derstandard.at)'s article forum. No build step,
plain JS. Targets **Firefox 128+** and **Chromium 111+** (both ship MV3
content scripts with `world: "MAIN"`).

## Loading & testing

There is no build, lint, or test suite. To run the extension:

- **Firefox**: `about:debugging#/runtime/this-firefox` → **Load Temporary
  Add-on…** → pick [manifest.json](manifest.json). Removed on restart.
- **Chromium**: `chrome://extensions` → enable Developer mode →
  **Load unpacked** → pick the repo root.

Then open any article (e.g. `https://www.derstandard.at/story/<id>/...`),
scroll to the comment section ("Diskussion"), open DevTools → Console
(filter `ds-unlock`) and Network (filter `forum-serve-graphql`). Click a
paywalled sort tab and expect the trace
`paywall detected for sortField= … — forcing fetch` → a new
`ThreadsByForumQuery` request → `synced nextCursor` (and again on subsequent
paginated fetches). Reload the unpacked extension after edits via the same
debugging page.

### Regenerating icons

If [icons/dumb-abo.svg](icons/dumb-abo.svg) changes, refresh the PNG set
(Chrome's manifest needs PNGs, not SVG). Use `rsvg-convert`
(`brew install librsvg`) — **not** ImageMagick: its built-in SVG renderer
silently drops stroked paths, which is how we shipped a shackle-less
padlock once.

```sh
for s in 16 32 48 96 128; do
  rsvg-convert -w $s -h $s icons/dumb-abo.svg -o icons/dumb-abo-${s}.png
done
```

## Architecture — the non-obvious bits

The forum widget on derstandard.at is a Lit custom element `<dst-forum>` with
an **open shadow root**. Two content scripts cooperate:

- [src/inject.js](src/inject.js) runs in `world: "MAIN"` at `document_start`.
  This is where the Lit element's JS instance properties (`fetchPostings`,
  `showSubscriptionNotice`, `nextCursor`, `sortField`, …) are reachable;
  ISOLATED-world scripts cannot see them.
- [src/content.js](src/content.js) runs in `world: "ISOLATED"` at
  `document_idle`. It only does DOM event detection via
  `event.composedPath()` (which sees through the shadow boundary) and forwards
  via `window.postMessage`.

**Why postMessage and not CustomEvent**: Firefox wraps the `detail` of
isolated-world-dispatched CustomEvents in an Xray, and main-world listeners
do not reliably fire. `window.postMessage({__dsUnlock: …}, '*')` round-trips
through structured cloning and works.

### The unlock recipe

For unsubscribed users, when a paywalled sort is clicked the framework
*already* updates `sortField` correctly, but flips
`f.showSubscriptionNotice = true` and skips the fetch. The fix in
`checkAndOverride()`:

1. `await f.updateComplete` — let the framework's click handler run first.
2. If `f.showSubscriptionNotice` — set it to `false`, reset
   `f.nextCursor = ''`, mark `overrideActive = true`, call
   `f.fetchPostings()`, then `f.requestUpdate()`.
3. Else — `overrideActive = false`.

We do **not** spoof subscription state (no cookies, localStorage, or
prototype-level shenanigans). `showSubscriptionNotice` is a render-time UI
flag; clearing it transiently doesn't make the page think the user is a
subscriber elsewhere.

### Cursor sync (critical for pagination)

The GraphQL `nextCursor` is base64-encoded JSON that contains pointers for
*every* sort order (`meta`, `metaByReplyAndRatingPositive`, etc.). The server
picks the right pointer based on the current request's `sortOrder`. After
our forced fetch, `f.nextCursor` is **not** automatically updated by Apollo
into the element's reactive property — but `loadMorePostings` reads from
`f.nextCursor`. If left stale, scroll-loaded posts come from the wrong slice
of the sorted list.

The wrapped `window.fetch` therefore observes every `ThreadsByForumQuery`
response while `overrideActive` is true, parses
`data.getForumRootPostingsV2.pageInfo.nextCursor`, and writes it back to
`f.nextCursor`.

### Endpoint & operation

- Endpoint: `https://capi.ds.at/forum-serve-graphql/v1/`
- Operation: `ThreadsByForumQuery` (persisted query, hash stable across sorts;
  variables include `sortOrder`, `nextCursor`, `first`, forum `id`).
- `PostingSortOrder` enum: includes `ByTime`, `ByPositiveRatings`,
  `ByPostiveRatings` (typo'd duplicate the framework uses natively), and
  `ByNegativeRatings`. Server accepts unauthenticated requests for any of
  them, so URL rewriting is not needed once the framework's `sortField` is
  set.

### Sort-tab detection (content.js)

`SORT_LABEL_RE` matches button text against known German sort labels
(Plus, Minus, Älteste, Aktuellste, Aktuell, Aktuelles, Zeit). If a tab
exists that doesn't match, click forwarding never happens — widen the
regex rather than rewriting the detector.

## Naming, CI, and trademark notes

- Extension name "Dumb Abo" is an intentional inversion of derstandard.at's
  paid tier "Smart-Abo". Don't put `derStandard` / `derstandard.at` /
  `Standard` in the extension *name* — AMO will reject it on trademark
  grounds. Mentioning the target site in the description (nominative fair
  use) is fine.
- The SVG master at [icons/dumb-abo.svg](icons/dumb-abo.svg) uses
  derStandard's exact digital CI color `#E00085` (sampled from their PWA
  icon at
  `https://b.staticfiles.at/s/icons/nachrichten/android-chrome-192x192.png`).
  The manifest references PNG renders (16/32/48/96/128) because Chromium
  doesn't accept SVG in `manifest.icons` — regenerate them with the
  ImageMagick one-liner above whenever the SVG changes.

## Useful console snippets when inspecting dst-forum

```js
const f = document.querySelector('dst-forum');
// public method names
Object.getOwnPropertyNames(Object.getPrototypeOf(f)).filter(n => n !== 'constructor');
// current sort state
({ sortField: f.sortField, sortDirection: f.sortDirection,
   showSubscriptionNotice: f.showSubscriptionNotice, nextCursor: f.nextCursor });
// inspect a specific method's source if behaviour is unclear
f.loadMorePostings.toString();
```
