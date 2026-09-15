# swift-web-hello-world

A native Swift iOS app that renders a React web application inside a `WKWebView`.

The React build is bundled into the app, so it runs offline, and a small two-way bridge
lets the web page call into Swift and receive a reply.

## Run

```sh
make run
```

`make run` builds `web/`, copies the output into `ios/Resources/web/`, builds the app,
then boots a simulator and installs it.

## Layout

| Path | What it is |
| --- | --- |
| `project.yml` | XcodeGen spec; also the only place Info.plist keys are set |
| `web/` | React app (Vite + TypeScript) |
| `web/src/native.ts` | Typed wrapper over the bridge |
| `ios/Sources/WebView.swift` | `UIViewRepresentable` that builds the `WKWebView` |
| `ios/Sources/AppSchemeHandler.swift` | Serves the bundled build over `app://` |
| `ios/Sources/WebViewCoordinator.swift` | Navigation delegate + JS message handler |
| `ios/Sources/NativeBridge.swift` | Bridge actions (`getDeviceInfo`, `log`) |

## How the web content is served

The bundled build is served over a custom `app://local/` scheme, not `file://`.

A `file://` page has an opaque origin. Vite emits `<script type="module">`, which is
fetched in CORS mode, and an opaque origin can never satisfy that — the scripts are
silently blocked and the app renders as a blank screen. `allowingReadAccessTo` grants
filesystem read permission; it does not change the origin.

`AppSchemeHandler` gives the page a real origin, so ES modules, relative `fetch`, and web
storage all behave as they would behind a normal web server. That custom scheme is what
fixes the blank screen; the `crossorigin`-stripping plugin in `vite.config.ts` was tried
first and did not help, and is kept only as a convenience. `base: './'` keeps asset paths
relative, which matters for both loading modes.

## The bridge

JS to Swift, then Swift back to JS:

```ts
import { getDeviceInfo } from './native'
const info = await getDeviceInfo()   // { model, systemName, systemVersion, appVersion }
```

Under the hood the web page posts `{ id, action, payload }` to
`window.webkit.messageHandlers.nativeBridge`. `WebViewCoordinator` routes `action` through
`NativeBridge` and calls `window.__nativeBridgeResolve(id, response)` back through
`evaluateJavaScript`. Both values are JSON-encoded rather than interpolated as text, so a
payload cannot break out into executable script. Calls time out after 5s.

To add an action, add a `case` to `NativeBridge.handle` and a wrapper in `web/src/native.ts`.

Outside the app (plain `npm run dev` in a desktop browser) the bridge is absent;
`isNative()` returns false and the UI degrades instead of throwing.

## Day-to-day workflow

See [wiki.md](wiki.md) for the two development loops, which command to run for which kind
of change, and the common failure modes.

## Hot reload

```sh
make dev
```

Builds the app once, starts the Vite dev server, then launches the simulator with
`DEV_SERVER_URL` set so the web view loads from the dev server instead of the bundled
build (DEBUG builds only). Edit `web/src/` and save — the change appears with no rebuild.
The real native bridge is attached, so bridge calls work as they do in a shipped build.
Ctrl-C stops the dev server. Swift changes still need `make build` or `make run`.

`make dev` reads `DEV_SERVER_URL` under the hood the same way manual `simctl` launches do:
`simctl` only forwards environment variables to the launched app under the `SIMCTL_CHILD_`
prefix, so the Makefile sets `SIMCTL_CHILD_DEV_SERVER_URL`.

The only App Transport Security exception is `NSAllowsLocalNetworking`, which covers
localhost. It ships in Release too, which is harmless — `DEV_SERVER_URL` is read only under
`#if DEBUG`, so a Release build cannot reach a dev server. There is no
`NSAllowsArbitraryLoads`.

## Debugging

- `make logs` — stream `NSLog` output, including bridge errors.
- Safari > Develop > Simulator > TradingAnalytics — Web Inspector; `isInspectable` is on in DEBUG.

## Other targets

| Target | What it does |
| --- | --- |
| `make web-build` | Build the React app and copy it into the app resources |
| `make build` | The above, then build the app for the simulator |
| `make build-dev` | Build the app for the simulator, without rebuilding web assets |
| `make dev` | Build once, then run the hot-reload loop against the Vite dev server |
| `make clean` | Remove all generated artifacts |

`make run SIM_NAME="iPhone 17 Pro"` picks a specific simulator; by default the first
available iPhone is used.

## Shipping note

App Review guideline 4.2 targets apps that are only a wrapper around a remote website.
This app bundles its content and exposes native capability through the bridge, which is
the shape to keep as the app grows.
