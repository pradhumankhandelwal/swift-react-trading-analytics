# Development Workflow

How to make changes to the React app and see them in the Swift app.

There are two loops. The difference between them is where the `WKWebView` points.

## Dev loop — hot reload

The web view points at the Vite dev server, so web edits appear immediately with no Xcode
rebuild. The native bridge is fully attached, so bridge calls work exactly as they do in a
shipped build.

```sh
make dev
```

This builds the app once, starts `npm --prefix web run dev` in the background, waits for
it to come up, then boots a simulator and launches the app with
`SIMCTL_CHILD_DEV_SERVER_URL` set — `simctl` only forwards environment variables to the
launched app under the `SIMCTL_CHILD_` prefix, and the app itself reads `DEV_SERVER_URL`.
Ctrl-C stops the dev server (and the trap kills it even if the shell is interrupted
mid-wait).

Now edit `web/src/App.tsx` and save. The change appears in the simulator with no Swift
rebuild.

If a dev server is already running at `DEV_URL` (e.g. you started `npm --prefix web run
dev` yourself), `make dev` detects it and reuses it instead of starting a second one.

To do it by hand instead — useful from Xcode, or to point at a non-default port:

```sh
npm --prefix web run dev
make build
xcrun simctl terminate booted com.example.TradingAnalytics
SIMCTL_CHILD_DEV_SERVER_URL=http://localhost:5173 \
  xcrun simctl launch booted com.example.TradingAnalytics
```

From Xcode: Product > Scheme > Edit Scheme > Run > Arguments > Environment Variables, add
`DEV_SERVER_URL` = `http://localhost:5173`, then Run.

The dev-server path is gated by `#if DEBUG` in `ios/Sources/WebView.swift`. A Release build
ignores `DEV_SERVER_URL` entirely and always loads the bundled assets.

## Production loop — bundled assets

Web changes have to be rebuilt and copied into the app bundle. One command does all of it:

```sh
make run
```

That runs `npm run build`, copies `web/dist/` into `ios/Resources/web/` with
`rsync --delete`, runs `xcodegen generate`, builds with `xcodebuild`, then installs and
launches on a simulator.

While iterating, once the project has been generated:

```sh
make build
```

Same chain minus install and launch. `make web-build` on its own only refreshes the copied
assets — Xcode still needs a build to copy them into the `.app`.

## Which loop for which change

| Change | Command |
| --- | --- |
| Web code, iterating | `make dev`; no rebuild |
| Web code, verifying the shipped bundle | `make run` |
| Swift code | `make build` (a rebuild is required either way) |
| New file under `ios/Sources/` | `make gen` first, so XcodeGen re-scans |
| New npm dependency | `make run` (the `deps` target reinstalls) |

## Adding a native capability

Both sides change, in this order:

1. `ios/Sources/NativeBridge.swift` — add a `case "yourAction":` to `handle`.
2. `web/src/native.ts` — add a typed wrapper calling `callNative<T>('yourAction', payload)`.
3. `make build` — the Swift side changed, so a rebuild is required even in the dev loop.
   The dev server picks up the TypeScript side on save.

## Gotchas

- **The two loops can disagree.** The dev server transpiles on the fly; the production
  bundle is minified and tree-shaken. Always do one `make run` before shipping.
- **Never edit `ios/Resources/web/`.** It is generated and gitignored, and the next build
  wipes it with `rsync --delete`. Edit `web/src/` instead.
- **A new Swift file without `make gen`** fails with "cannot find X in scope" — the file is
  not in the Xcode project yet.
- **Stale bundle** (the app shows old UI after `make build`) means `web-build` did not
  rerun. Recover with `make clean && make run`.
- **`make dev` says "dev server did not start"** — port `5173` may be in use by something
  other than Vite. Override with `make dev DEV_PORT=5174`, or free the port and retry.

## Debugging

- `make logs` — stream `NSLog` output, including bridge errors.
- Safari > Develop > Simulator > TradingAnalytics — Web Inspector. `isInspectable` is on in DEBUG.
