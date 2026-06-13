import { isTauriRuntime } from "./environment.ts";

function sep() {
    if (typeof navigator !== 'undefined' && /win/i.test(navigator.platform)) {
        return '\\'
    }
    return '/'
}

async function downloadDir() {
    if (isTauriRuntime()) {
        const path = await import('@tauri-apps/api/path')
        return await path.downloadDir()
    }
    return '浏览器默认下载目录'
}

export { downloadDir, sep }
