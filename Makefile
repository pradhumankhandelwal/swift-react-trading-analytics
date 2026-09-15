# Boilerplate: a React app rendered by a native Swift iOS app in a WKWebView.
#
#   make run    build everything and launch in the iOS Simulator
#   make dev    hot-reload loop: Vite dev server + app pointed at it

SCHEME      := TradingAnalytics
PROJECT     := TradingAnalytics.xcodeproj
BUNDLE_ID   := com.example.TradingAnalytics
WEB_DEST    := ios/Resources/web
BUILD_DIR   := build
APP         := $(BUILD_DIR)/Build/Products/Debug-iphonesimulator/$(SCHEME).app
DEV_PORT    ?= 5173
DEV_URL     ?= http://localhost:$(DEV_PORT)
SIM_NAME    ?=

.PHONY: all web-build build build-dev run dev logs clean

all: run

## Build the React app and copy it into the app bundle's resources.
web-build:
	npm --prefix web run build
	mkdir -p $(WEB_DEST)
	rsync -a --delete web/dist/ $(WEB_DEST)/

# Shared by `build` and `build-dev`; the only difference is whether the web assets
# were just rebuilt.
define xcodebuild_debug
	xcodebuild \
		-project $(PROJECT) \
		-scheme $(SCHEME) \
		-configuration Debug \
		-destination 'generic/platform=iOS Simulator' \
		-derivedDataPath $(BUILD_DIR) \
		build
endef

build: web-build
	$(xcodebuild_debug)

build-dev:
	$(xcodebuild_debug)

# Resolves a simulator UDID into $$udid. The device name is looked up at run time; do not
# hardcode one, the available devices differ per installed runtime.
define resolve_sim
	if [ -n "$(SIM_NAME)" ]; then \
		udid=$$(xcrun simctl list devices available -j | \
			python3 -c 'import json,sys; d=json.load(sys.stdin)["devices"]; print(next(x["udid"] for v in d.values() for x in v if x["name"]=="$(SIM_NAME)"))'); \
	else \
		udid=$$(xcrun simctl list devices available -j | \
			python3 -c 'import json,sys; d=json.load(sys.stdin)["devices"]; print(next(x["udid"] for k,v in d.items() if "iOS" in k for x in v if "iPhone" in x["name"]))'); \
	fi; \
	echo "simulator: $$udid"; \
	xcrun simctl boot "$$udid" 2>/dev/null || true; \
	open -b com.apple.dt.Devices 2>/dev/null || open -a Simulator 2>/dev/null || true; \
	xcrun simctl install "$$udid" "$(APP)"; \
	xcrun simctl terminate "$$udid" $(BUNDLE_ID) 2>/dev/null || true
endef

## Build, boot a simulator, install and launch the bundled build.
run: build
	@set -e; \
	$(resolve_sim); \
	xcrun simctl launch "$$udid" $(BUNDLE_ID)

## Hot-reload loop. Starts the Vite dev server, then launches the app with
## DEV_SERVER_URL set so the web view loads from it instead of the bundled build
## (see ios/Sources/WebView.swift, DEBUG only). Edits to web/src/ then show up
## without another `make run`. Native (Swift) changes still need a rebuild.
## Ctrl-C stops the dev server.
dev: build-dev
	@set -e; \
	trap 'kill $$vite 2>/dev/null || true' EXIT INT TERM; \
	if curl -sf -o /dev/null $(DEV_URL); then \
		echo "dev server already running at $(DEV_URL)"; \
		vite=; \
	else \
		npm --prefix web run dev -- --port $(DEV_PORT) --strictPort & \
		vite=$$!; \
		printf 'waiting for %s' '$(DEV_URL)'; \
		for i in $$(seq 1 60); do \
			curl -sf -o /dev/null $(DEV_URL) && break; \
			printf '.'; sleep 0.5; \
		done; \
		echo; \
		curl -sf -o /dev/null $(DEV_URL) || { echo "dev server did not start"; exit 1; }; \
	fi; \
	$(resolve_sim); \
	SIMCTL_CHILD_DEV_SERVER_URL=$(DEV_URL) xcrun simctl launch "$$udid" $(BUNDLE_ID); \
	echo "app pointed at $(DEV_URL) — edit web/src/, Ctrl-C to stop"; \
	if [ -n "$$vite" ]; then wait $$vite; fi

## Stream the app's stdout/stderr (NSLog output from the native bridge).
logs:
	xcrun simctl spawn booted log stream --level debug --predicate 'process == "$(SCHEME)"'

clean:
	rm -rf $(BUILD_DIR) $(WEB_DEST) web/dist $(PROJECT) ios/Generated
