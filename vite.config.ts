import { defineConfig, type ProxyOptions } from "vite";
import vue from "@vitejs/plugin-vue";

import { VueRouterAutoImports } from 'unplugin-vue-router'
import VueRouter from 'unplugin-vue-router/vite'
import Components from 'unplugin-vue-components/vite';
import AutoImport from 'unplugin-auto-import/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import vueDevTools from 'vite-plugin-vue-devtools'

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

const configureBiliProxy: ProxyOptions['configure'] = (proxy) => {
    proxy.on('proxyReq', (proxyReq, req) => {
        const cookie = req.headers['x-bili-cookie']
        if (cookie) {
            proxyReq.setHeader('Cookie', Array.isArray(cookie) ? cookie.join('; ') : cookie)
        }

        proxyReq.removeHeader('X-Bili-Cookie')
        proxyReq.removeHeader('x-bili-cookie')
        proxyReq.setHeader('Origin', 'https://www.bilibili.com')
        proxyReq.setHeader('Referer', 'https://www.bilibili.com/')
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0')
    })
}

const createBiliProxy = (target: string, prefix: string): ProxyOptions => ({
    target,
    changeOrigin: true,
    rewrite: (path: string) => path.startsWith(prefix) ? path.slice(prefix.length) : path,
    configure: configureBiliProxy,
})

const proxy = {
    '/__bili_api': createBiliProxy('https://api.bilibili.com', '/__bili_api'),
    '/__bili_app_api': createBiliProxy('https://app.bilibili.com', '/__bili_app_api'),
    '/__bili_live_api': createBiliProxy('https://api.live.bilibili.com', '/__bili_live_api'),
    '/__bili_passport_api': createBiliProxy('https://passport.bilibili.com', '/__bili_passport_api'),
    '/__bili_space': createBiliProxy('https://space.bilibili.com', '/__bili_space'),
    '/__bili_static_i0': createBiliProxy('https://i0.hdslb.com', '/__bili_static_i0'),
    '/__bili_static_i1': createBiliProxy('https://i1.hdslb.com', '/__bili_static_i1'),
    '/__bili_static_i2': createBiliProxy('https://i2.hdslb.com', '/__bili_static_i2'),
    '/__bili_static_s1': createBiliProxy('https://s1.hdslb.com', '/__bili_static_s1'),
    '/__bili_b23': createBiliProxy('https://b23.tv', '/__bili_b23'),
    '/__bili_2233': createBiliProxy('https://bili2233.cn', '/__bili_2233'),
}

// https://vitejs.dev/config/
export default defineConfig(async () => ({
    plugins: [
        VueRouter(),
        AutoImport({
            imports: [
                'vue',
                '@vueuse/core',
                VueRouterAutoImports,
            ],
            resolvers: [
                ElementPlusResolver(),
                IconsResolver({
                    prefix: 'Icon'
                }),
            ],
            vueTemplate: true,
        }),
        vue(),
        Components({
            dts: true,
            dirs: ["src/components"],
            exclude: ["src/pages"],
            resolvers: [
                ElementPlusResolver(),
                IconsResolver({
                    enabledCollections: ['ep'],
                })
            ],
        }),
        Icons({
            autoInstall: true,
        }),
        vueDevTools(),
    ],

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                protocol: "ws",
                host,
                port: 1421,
            }
            : undefined,
        watch: {
            // 3. tell vite to ignore watching `src-tauri`
            ignored: ["**/src-tauri/**"],
        },
        proxy,
    },
    preview: {
        proxy,
    },
}));
