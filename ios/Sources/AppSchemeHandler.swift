import Foundation
import UniformTypeIdentifiers
import WebKit

/// Serves the bundled React build over a custom `app://` scheme.
///
/// Loading the build from a `file://` URL does not work: the page gets an opaque origin,
/// and `<script type="module">` is fetched in CORS mode, which such an origin can never
/// satisfy — the scripts are blocked and the app renders blank. `allowingReadAccessTo`
/// grants filesystem read permission; it does not change the origin.
///
/// A custom scheme gives the page a real, stable origin (`app://local`), so ES modules,
/// relative `fetch`, and web storage all behave the way they do on a normal web server.
final class AppSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "app"
    static let host = "local"

    static var startURL: URL {
        URL(string: "\(scheme)://\(host)/index.html")!
    }

    /// The bundled `web/` directory, resolved once.
    private let root: URL

    /// Nil when the web assets are missing from the bundle (`make web-build` not run).
    static func makeIfBundled() -> AppSchemeHandler? {
        guard let root = Bundle.main.url(forResource: "web", withExtension: nil) else {
            return nil
        }
        return AppSchemeHandler(root: root.standardizedFileURL)
    }

    private init(root: URL) {
        self.root = root
        super.init()
    }

    func webView(_ webView: WKWebView, start task: any WKURLSchemeTask) {
        guard let url = task.request.url, let file = resolve(url) else {
            task.didFailWithError(URLError(.badURL))
            return
        }

        guard let data = try? Data(contentsOf: file) else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }

        let response = HTTPURLResponse(
            url: url,
            statusCode: 200,
            httpVersion: "HTTP/1.1",
            headerFields: [
                "Content-Type": Self.mimeType(for: file),
                "Content-Length": String(data.count),
                // The assets ship inside the app; a stale cached copy can never be correct.
                "Cache-Control": "no-store",
            ]
        )!

        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: any WKURLSchemeTask) {
        // Reads are synchronous and already complete by this point; nothing to cancel.
    }

    /// Maps a request URL to a file inside the bundled web root, refusing anything that
    /// escapes it (for example `app://local/../../Info.plist`).
    private func resolve(_ url: URL) -> URL? {
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }

        let candidate = root.appendingPathComponent(path).standardizedFileURL
        // Compare against root + "/" — a bare prefix test would also admit a sibling
        // directory whose name merely starts with the root's ("…/web-other").
        guard candidate.path == root.path
            || candidate.path.hasPrefix(root.path + "/") else { return nil }
        return candidate
    }

    private static func mimeType(for url: URL) -> String {
        // JavaScript needs a correct JS MIME type or WebKit refuses to run it as a module.
        if let type = UTType(filenameExtension: url.pathExtension),
           let mime = type.preferredMIMEType {
            return mime
        }
        return "application/octet-stream"
    }
}
