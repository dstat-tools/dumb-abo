# Privacy Policy

**Extension:** Dumb Abo (für derstandard.at)
**Publisher:** dstat-tools
**Last updated:** 2026-05-16

## Data collected

None. The extension does not collect, transmit, or store any user data.

## Network activity

The extension performs no network calls of its own. The only network traffic
it touches is `derstandard.at`'s own GraphQL endpoint (`capi.ds.at`), and only
by observing and forwarding requests that the page itself is already issuing.
No third-party servers are contacted.

## Storage

The extension uses no persistent storage mechanism: no `chrome.storage` /
`browser.storage`, no cookies, no `localStorage`, no `indexedDB`, no
`sessionStorage`. State is held only in memory for the lifetime of the page.

## Scope

The extension runs only on URLs matching `*://*.derstandard.at/story/*`. It is
completely inactive on every other page.

## Permissions

The manifest declares no `permissions` and no `host_permissions`. DOM access on
`derstandard.at` story pages happens via `content_scripts.matches` scoping —
the minimum required for the extension to function and the only place the
extension executes.

## Tracking, analytics, advertising

None of any kind.

## Source code

Reproducible from source. Public repository:
<https://github.com/dstat-tools/dumb-abo>

## Contact

For privacy questions or concerns, open an issue at
<https://github.com/dstat-tools/dumb-abo/issues>.
