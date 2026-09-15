import Foundation

/// Routes bridge actions sent from the React app.
///
/// Every handler returns the same envelope so the JS side has one shape to parse:
/// `{ ok: true, result: ... }` or `{ ok: false, error: "..." }`.
enum NativeBridge {
    static let handlerName = "nativeBridge"

    static func handle(action: String, payload: [String: Any]) -> [String: Any] {
        switch action {
        case "log":
            let message = payload["message"] as? String ?? ""
            NSLog("[web] %@", message)
            return success([:])

        default:
            return failure("unknown action: \(action)")
        }
    }

    private static func success(_ result: [String: Any]) -> [String: Any] {
        ["ok": true, "result": result]
    }

    private static func failure(_ message: String) -> [String: Any] {
        ["ok": false, "error": message]
    }
}
