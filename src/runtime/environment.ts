declare global {
    interface Window {
        __TAURI__?: unknown
        __TAURI_INTERNALS__?: unknown
    }
}

function isTauriRuntime() {
    return typeof window !== 'undefined'
        && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window)
}

function isWebRuntime() {
    return !isTauriRuntime()
}

export { isTauriRuntime, isWebRuntime }
