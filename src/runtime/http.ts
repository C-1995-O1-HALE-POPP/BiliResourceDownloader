import { isTauriRuntime, isWebRuntime } from "./environment.ts";

const proxyPrefixes: Record<string, string> = {
    'https://api.bilibili.com': '/__bili_api',
    'https://app.bilibili.com': '/__bili_app_api',
    'https://api.live.bilibili.com': '/__bili_live_api',
    'https://passport.bilibili.com': '/__bili_passport_api',
    'https://space.bilibili.com': '/__bili_space',
    'https://i0.hdslb.com': '/__bili_static_i0',
    'https://i1.hdslb.com': '/__bili_static_i1',
    'https://i2.hdslb.com': '/__bili_static_i2',
    'https://s1.hdslb.com': '/__bili_static_s1',
    'https://b23.tv': '/__bili_b23',
    'https://bili2233.cn': '/__bili_2233',
}

const browserForbiddenHeaders = new Set([
    'cookie',
    'host',
    'origin',
    'referer',
    'user-agent',
])

function getProxyPrefix(url: URL) {
    return proxyPrefixes[url.origin]
}

function runtimeURL(input: URL | string) {
    const url = input instanceof URL ? input : new URL(input)
    if (!isWebRuntime()) return url

    const prefix = getProxyPrefix(url)
    if (!prefix) return url

    return new URL(`${prefix}${url.pathname}${url.search}${url.hash}`, window.location.origin)
}

function sanitizeBrowserInit(input: URL | string, init?: RequestInit): RequestInit | undefined {
    if (!init?.headers) return init

    const url = input instanceof URL ? input : new URL(input)
    const shouldProxy = Boolean(getProxyPrefix(url))
    const headers = new Headers(init.headers)

    const cookie = headers.get('cookie')
    if (shouldProxy && cookie) {
        headers.set('X-Bili-Cookie', cookie)
    }

    browserForbiddenHeaders.forEach(header => headers.delete(header))
    return {
        ...init,
        headers,
    }
}

async function runtimeFetch(input: URL | string, init?: RequestInit) {
    if (isTauriRuntime()) {
        const { fetch } = await import('@tauri-apps/plugin-http')
        return fetch(input, init)
    }

    return fetch(runtimeURL(input), sanitizeBrowserInit(input, init))
}

export { runtimeFetch, runtimeURL }
