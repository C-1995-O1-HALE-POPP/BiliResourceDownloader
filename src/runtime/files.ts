import { isTauriRuntime, isWebRuntime } from "./environment.ts";
import { runtimeFetch } from "./http.ts";

interface DialogFilter {
    name: string
    extensions: string[]
}

interface OpenDialogOptions {
    title?: string
    multiple?: boolean
    directory?: boolean
    defaultPath?: string
    filters?: DialogFilter[]
}

interface SaveDialogOptions {
    defaultPath?: string
    filters?: DialogFilter[]
}

type DownloadProgress = Parameters<Awaited<typeof import('@tauri-apps/plugin-upload')>['download']>[2]

interface WebFileSystemDirectoryHandle {
    name: string
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<WebFileSystemDirectoryHandle>
    getFileHandle(name: string, options?: { create?: boolean }): Promise<WebFileSystemFileHandle>
}

interface WebFileSystemFileHandle {
    createWritable(): Promise<WebFileSystemWritableFileStream>
}

interface WebFileSystemWritableFileStream {
    write(data: Blob | string | ArrayBuffer | ArrayBufferView): Promise<void>
    close(): Promise<void>
}

interface WebWindowWithDirectoryPicker extends Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<WebFileSystemDirectoryHandle>
}

const webDirectoryHandles = new Map<string, WebFileSystemDirectoryHandle>()

function webUnsupported(feature: string) {
    ElMessage({
        message: `Web UI 暂不支持${feature}，请在桌面版中使用。`,
        type: 'warning',
    })
}

async function open(options: OpenDialogOptions): Promise<string | string[] | null> {
    if (isTauriRuntime()) {
        const dialog = await import('@tauri-apps/plugin-dialog')
        return await dialog.open(options)
    }

    if (options.directory) {
        return await openBrowserDirectory()
    }

    return await openBrowserFiles(options)
}

async function save(options: SaveDialogOptions): Promise<string | null> {
    if (isTauriRuntime()) {
        const dialog = await import('@tauri-apps/plugin-dialog')
        return await dialog.save(options)
    }

    return options.defaultPath ?? 'download'
}

async function download(
    url: string,
    path: string,
    progress?: DownloadProgress,
    headers?: Map<string, string>,
) {
    if (isTauriRuntime()) {
        const upload = await import('@tauri-apps/plugin-upload')
        await upload.download(url, path, progress, headers)
        return
    }

    try {
        const response = await runtimeFetch(url, { headers: mapToHeaders(headers) })
        const blob = await response.blob()

        const webPath = resolveWebDirectoryPath(path)
        if (webPath) {
            await writeBlobToWebDirectory(webPath.directoryHandle, webPath.relativePath, blob)
            progress?.({
                progress: blob.size,
                total: blob.size,
            })
            return
        }

        triggerBlobDownload(blob, basename(path))
        progress?.({
            progress: blob.size,
            total: blob.size,
        })
    } catch (error) {
        console.warn('浏览器下载回退为直接打开链接：', error)
        triggerURLDownload(url, basename(path))
    }
}

async function saveDataURL(path: string, data: string) {
    if (isTauriRuntime()) {
        const { invoke } = await import('@tauri-apps/api/core')
        return await invoke('save_data_url', { path, data }) === 'ok'
    }

    const webPath = resolveWebDirectoryPath(path)
    if (webPath) {
        await writeBlobToWebDirectory(webPath.directoryHandle, webPath.relativePath, dataURLToBlob(data))
        return true
    }

    triggerURLDownload(data, basename(path))
    return true
}

async function createDir(path: string) {
    if (isTauriRuntime()) {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('create_dir', { path })
        return
    }

    const webPath = resolveWebDirectoryPath(path)
    if (webPath) {
        await getWebDirectoryHandle(webPath.directoryHandle, webPath.relativePath)
        return
    }

    console.debug(`Web UI 忽略创建目录：${path}`)
}

async function readFile(path: string) {
    if (isTauriRuntime()) {
        const fs = await import('@tauri-apps/plugin-fs')
        return await fs.readFile(path)
    }

    throw new Error('Web UI 无法读取任意本地文件')
}

async function invokeNative<T>(command: string, args?: Record<string, unknown>) {
    if (isTauriRuntime()) {
        const { invoke } = await import('@tauri-apps/api/core')
        return await invoke<T>(command, args)
    }

    throw new Error(`Web UI 暂不支持原生命令：${command}`)
}

async function openBrowserDirectory() {
    const picker = (window as WebWindowWithDirectoryPicker).showDirectoryPicker
    if (!picker) {
        webUnsupported('选择本地目录')
        return null
    }

    try {
        const handle = await picker.call(window, { mode: 'readwrite' })
        const label = `浏览器选择目录：${handle.name}`
        webDirectoryHandles.set(label, handle)
        return label
    } catch (error) {
        if (isAbortError(error)) return null
        throw error
    }
}

async function openBrowserFiles(options: OpenDialogOptions) {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = options.multiple ?? false
    input.accept = formatAccept(options.filters)

    return await new Promise<string | string[] | null>((resolve) => {
        input.onchange = () => {
            const files = Array.from(input.files ?? [])
            if (files.length === 0) {
                resolve(null)
                return
            }

            const urls = files.map(file => URL.createObjectURL(file))
            resolve(options.multiple ? urls : urls[0])
        }
        input.click()
    })
}

function formatAccept(filters?: DialogFilter[]) {
    return filters
        ?.flatMap(filter => filter.extensions.map(extension => `.${extension}`))
        .join(',') ?? ''
}

function triggerBlobDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    triggerURLDownload(url, filename)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function triggerURLDownload(url: string, filename: string) {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.rel = 'noreferrer'
    anchor.target = '_blank'
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
}

function resolveWebDirectoryPath(path: string) {
    for (const [label, directoryHandle] of webDirectoryHandles) {
        if (path !== label && !path.startsWith(`${label}/`) && !path.startsWith(`${label}\\`)) continue

        return {
            directoryHandle,
            relativePath: path.slice(label.length).replace(/^[\\/]+/, '') || 'download',
        }
    }
    return undefined
}

async function writeBlobToWebDirectory(
    rootHandle: WebFileSystemDirectoryHandle,
    relativePath: string,
    blob: Blob,
) {
    const pathParts = splitPath(relativePath)
    const filename = pathParts.pop() || 'download'
    const directoryHandle = await getWebDirectoryHandle(rootHandle, pathParts.join('/'))
    const fileHandle = await directoryHandle.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(blob)
    await writable.close()
}

async function getWebDirectoryHandle(
    rootHandle: WebFileSystemDirectoryHandle,
    relativePath: string,
) {
    let current = rootHandle
    for (const part of splitPath(relativePath)) {
        current = await current.getDirectoryHandle(part, { create: true })
    }
    return current
}

function splitPath(path: string) {
    return path.split(/[\\/]/).filter(Boolean)
}

function dataURLToBlob(dataURL: string) {
    const [header, payload = ''] = dataURL.split(',')
    const mime = header.match(/^data:([^;]+)/)?.[1] ?? 'application/octet-stream'

    if (header.includes(';base64')) {
        const binary = atob(payload)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i)
        }
        return new Blob([bytes], { type: mime })
    }

    return new Blob([decodeURIComponent(payload)], { type: mime })
}

function isAbortError(error: unknown) {
    return error instanceof DOMException && error.name === 'AbortError'
}

function basename(path: string) {
    return path.split(/[\\/]/).pop() || 'download'
}

function mapToHeaders(headers?: Map<string, string>) {
    if (!headers) return undefined
    const next = new Headers()
    headers.forEach((value, key) => next.set(key, value))
    return next
}

export {
    createDir,
    download,
    invokeNative,
    isWebRuntime,
    open,
    readFile,
    save,
    saveDataURL,
    webUnsupported,
}
