import Foundation
import UIKit
import WebKit

/// Bridges the web view to SwiftUI state, and routes JS messages to `NativeBridge`.
///
/// The web view reference is `weak`. WKWebView retains its configuration, which retains
/// the user content controller, which retains this object as a script message handler.
/// A strong back reference would close that cycle and `deinit` would never run.
final class WebViewCoordinator: NSObject, ObservableObject {
    @Published var isLoading = true
    @Published var loadError: String?

    private weak var webView: WKWebView?

    func attach(to webView: WKWebView) {
        self.webView = webView
    }

    func detach() {
        webView?.configuration.userContentController
            .removeScriptMessageHandler(forName: NativeBridge.handlerName)
        webView = nil
    }

    deinit {
        detach()
    }
}

// MARK: - JS -> Swift

extension WebViewCoordinator: WKScriptMessageHandler {
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == NativeBridge.handlerName,
              let body = message.body as? [String: Any],
              let id = body["id"] as? String,
              let action = body["action"] as? String
        else {
            NSLog("[NativeBridge] dropped malformed message: %@", String(describing: message.body))
            return
        }

        let payload = body["payload"] as? [String: Any] ?? [:]
        let response = NativeBridge.handle(action: action, payload: payload)
        respond(id: id, response: response)
    }

    /// Swift -> JS. Both values are JSON-encoded rather than interpolated as raw text, so
    /// that quotes or backslashes in a payload cannot break out into executable script.
    private func respond(id: String, response: [String: Any]) {
        guard let webView else { return }
        guard let idJSON = Self.jsonLiteral(id),
              let responseJSON = Self.jsonLiteral(response)
        else {
            NSLog("[NativeBridge] failed to encode response for %@", id)
            return
        }

        let script = "window.__nativeBridgeResolve && window.__nativeBridgeResolve(\(idJSON), \(responseJSON))"
        webView.evaluateJavaScript(script) { _, error in
            if let error {
                NSLog("[NativeBridge] evaluateJavaScript failed: %@", error.localizedDescription)
            }
        }
    }

    private static func jsonLiteral(_ value: Any) -> String? {
        guard JSONSerialization.isValidJSONObject([value]),
              let data = try? JSONSerialization.data(withJSONObject: [value]),
              let array = String(data: data, encoding: .utf8)
        else { return nil }
        // Strip the wrapping array that made a bare string a valid top-level object.
        return String(array.dropFirst().dropLast())
    }
}

// MARK: - Navigation

extension WebViewCoordinator: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        isLoading = true
        loadError = nil
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        isLoading = false
    }

    func webView(
        _ webView: WKWebView,
        didFail navigation: WKNavigation!,
        withError error: Error
    ) {
        isLoading = false
        loadError = error.localizedDescription
    }

    func webView(
        _ webView: WKWebView,
        didFailProvisionalNavigation navigation: WKNavigation!,
        withError error: Error
    ) {
        isLoading = false
        loadError = error.localizedDescription
    }

    /// Keep app content in the web view; send outbound web links to Safari.
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }

        let isAppContent = url.scheme == AppSchemeHandler.scheme
            || url.host == "localhost"
            || url.host == "127.0.0.1"
        if navigationAction.navigationType == .linkActivated,
           !isAppContent,
           url.scheme == "http" || url.scheme == "https" {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }

        decisionHandler(.allow)
    }
}
