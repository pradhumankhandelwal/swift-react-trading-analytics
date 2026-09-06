import SwiftUI
import WebKit

/// Hosts the React app in a WKWebView.
///
/// In DEBUG builds, setting the `DEV_SERVER_URL` environment variable (via the Xcode
/// scheme, or `SIMCTL_CHILD_DEV_SERVER_URL` when launching through `simctl`) points the
/// web view at the Vite dev server instead of the bundled build, which gives hot reload.
struct WebView: UIViewRepresentable {
    @ObservedObject var coordinator: WebViewCoordinator

    func makeCoordinator() -> WebViewCoordinator { coordinator }

    func makeUIView(context: Context) -> WKWebView {
        let controller = WKUserContentController()
        // The content controller retains the handler strongly. `coordinator` is owned by
        // the SwiftUI view, and it holds the web view weakly, so no cycle forms here.
        controller.add(context.coordinator, name: NativeBridge.handlerName)

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        // Serve the bundled build over app:// so the page gets a real origin. See
        // AppSchemeHandler for why file:// does not work for a module-based bundle.
        let schemeHandler = AppSchemeHandler.makeIfBundled()
        if let schemeHandler {
            configuration.setURLSchemeHandler(schemeHandler, forURLScheme: AppSchemeHandler.scheme)
        }
        // The React app is trusted first-party content; let it open its own windows inline.
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = false
        webView.scrollView.bounces = false
        #if DEBUG
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
        #endif

        context.coordinator.attach(to: webView)
        load(into: webView, coordinator: context.coordinator, hasBundledAssets: schemeHandler != nil)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    static func dismantleUIView(_ webView: WKWebView, coordinator: WebViewCoordinator) {
        coordinator.detach()
    }

    private func load(
        into webView: WKWebView,
        coordinator: WebViewCoordinator,
        hasBundledAssets: Bool
    ) {
        #if DEBUG
        if let dev = ProcessInfo.processInfo.environment["DEV_SERVER_URL"],
           let url = URL(string: dev) {
            NSLog("[WebView] loading dev server: %@", url.absoluteString)
            webView.load(URLRequest(url: url))
            return
        }
        #endif

        guard hasBundledAssets else {
            coordinator.loadError = """
            Bundled web assets are missing. Run `make web-build` so that \
            ios/Resources/web/ exists, then regenerate and rebuild.
            """
            coordinator.isLoading = false
            return
        }

        webView.load(URLRequest(url: AppSchemeHandler.startURL))
    }
}
