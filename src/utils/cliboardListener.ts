import { autoJump } from "./linkResolver.ts";
import { globalConfig } from "./globalConfig.ts";
import { onFocusChanged, readClipboardText } from "../runtime/window.ts";
import { isWebRuntime } from "../runtime/environment.ts";

let clipboardCache = ''

if (isWebRuntime()) {
    console.debug('Web UI 不启用自动剪贴板监听')
} else {
onFocusChanged(async ({ payload: focused }) => {
    if (!focused || !globalConfig.value.readClipboard) return

    let text: string
    try {
        text = await readClipboardText()
    } catch {
        return
    }
    if (text !== clipboardCache) {
        clipboardCache = text
        await autoJump(text)
    }
})
}
