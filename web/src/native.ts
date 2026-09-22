// Typed wrapper around the WKWebView message bridge.
//
// JS -> Swift: window.webkit.messageHandlers.nativeBridge.postMessage({ id, action, payload })
// Swift -> JS: window.__nativeBridgeResolve(id, result) via evaluateJavaScript
//
// Outside the native app (plain `npm run dev` in a desktop browser) the bridge is
// absent, so calls fall back to a stub so the React app stays runnable standalone.

interface BridgeResponse<T> {
  ok: boolean
  result?: T
  error?: string
}

type Resolver = (response: BridgeResponse<unknown>) => void

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        nativeBridge?: { postMessage: (message: unknown) => void }
      }
    }
    __nativeBridgeResolvers?: Map<string, Resolver>
    __nativeBridgeResolve?: (id: string, response: BridgeResponse<unknown>) => void
  }
}

const resolvers: Map<string, Resolver> = (window.__nativeBridgeResolvers ??= new Map())

window.__nativeBridgeResolve = (id, response) => {
  const resolve = resolvers.get(id)
  if (!resolve) return
  resolvers.delete(id)
  resolve(response)
}

export function isNative(): boolean {
  return Boolean(window.webkit?.messageHandlers?.nativeBridge)
}

let nextId = 0

export function callNative<T>(action: string, payload: unknown = {}): Promise<T> {
  const handler = window.webkit?.messageHandlers?.nativeBridge
  if (!handler) {
    return Promise.reject(new Error('native bridge unavailable (running in a browser)'))
  }

  const id = `req-${nextId++}`
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      resolvers.delete(id)
      reject(new Error(`native call "${action}" timed out`))
    }, 5000)

    resolvers.set(id, (response) => {
      window.clearTimeout(timeout)
      if (response.ok) resolve(response.result as T)
      else reject(new Error(response.error ?? 'unknown native error'))
    })

    handler.postMessage({ id, action, payload })
  })
}

export function nativeLog(message: string): Promise<void> {
  return callNative<void>('log', { message })
}
