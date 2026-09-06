import SwiftUI

struct ContentView: View {
    @StateObject private var coordinator = WebViewCoordinator()

    var body: some View {
        ZStack {
            WebView(coordinator: coordinator)
                .ignoresSafeArea(edges: .bottom)

            if coordinator.isLoading {
                ProgressView()
                    .controlSize(.large)
            }

            if let message = coordinator.loadError {
                VStack(spacing: 12) {
                    Text("Failed to load web content")
                        .font(.headline)
                    Text(message)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
            }
        }
    }
}
