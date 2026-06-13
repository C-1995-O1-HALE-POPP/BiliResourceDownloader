import { isTauriRuntime } from "./environment.ts";

interface FocusPayload {
    payload: boolean
}

function getCurrentAppWindow() {
    return {
        async minimize() {
            if (isTauriRuntime()) {
                const { getCurrentWindow } = await import('@tauri-apps/api/window')
                await getCurrentWindow().minimize()
            }
        },
        async toggleMaximize() {
            if (isTauriRuntime()) {
                const { getCurrentWindow } = await import('@tauri-apps/api/window')
                await getCurrentWindow().toggleMaximize()
            }
        },
        async close() {
            if (isTauriRuntime()) {
                const { getCurrentWindow } = await import('@tauri-apps/api/window')
                await getCurrentWindow().close()
            } else {
                window.close()
            }
        },
    }
}

async function onFocusChanged(callback: (event: FocusPayload) => void) {
    if (isTauriRuntime()) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        return await getCurrentWindow().onFocusChanged(callback)
    }

    const onFocus = () => callback({ payload: true })
    const onBlur = () => callback({ payload: false })
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    return () => {
        window.removeEventListener('focus', onFocus)
        window.removeEventListener('blur', onBlur)
    }
}

async function readClipboardText() {
    if (isTauriRuntime()) {
        const { readText } = await import('@tauri-apps/plugin-clipboard-manager')
        return await readText()
    }

    if (!navigator.clipboard?.readText) {
        throw new Error('浏览器不允许读取剪贴板')
    }
    return await navigator.clipboard.readText()
}

export { getCurrentAppWindow, onFocusChanged, readClipboardText }
