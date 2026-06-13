import { isTauriRuntime } from "./environment.ts";

interface RuntimeStoreOptions {
    autoSave?: boolean
}

type StoreData = Record<string, unknown>

interface TauriStore {
    get<T>(key: string): Promise<T | undefined>
    set(key: string, value: unknown): Promise<void>
    delete(key: string): Promise<void>
    clear(): Promise<void>
    has(key: string): Promise<boolean>
    save(): Promise<void>
}

const memoryStores = new Map<string, StoreData>()

class RuntimeStore {
    private tauriStore?: Promise<TauriStore>

    constructor(
        private readonly name: string,
        private readonly options: RuntimeStoreOptions = {},
    ) {
    }

    async get<T>(key: string) {
        if (isTauriRuntime()) {
            return await (await this.getTauriStore()).get<T>(key)
        }
        return this.readBrowserData()[key] as T | undefined
    }

    async set(key: string, value: unknown) {
        if (isTauriRuntime()) {
            await (await this.getTauriStore()).set(key, value)
            return
        }

        const data = this.readBrowserData()
        data[key] = value
        this.writeBrowserData(data)
    }

    async delete(key: string) {
        if (isTauriRuntime()) {
            await (await this.getTauriStore()).delete(key)
            return
        }

        const data = this.readBrowserData()
        delete data[key]
        this.writeBrowserData(data)
    }

    async clear() {
        if (isTauriRuntime()) {
            await (await this.getTauriStore()).clear()
            return
        }

        this.writeBrowserData({})
    }

    async has(key: string) {
        if (isTauriRuntime()) {
            return await (await this.getTauriStore()).has(key)
        }
        return Object.prototype.hasOwnProperty.call(this.readBrowserData(), key)
    }

    async save() {
        if (isTauriRuntime()) {
            await (await this.getTauriStore()).save()
        }
    }

    private getBrowserStorageKey() {
        return `bili-resource-downloader:${this.name}`
    }

    private readBrowserData(): StoreData {
        if (this.options.autoSave === false) {
            const data = memoryStores.get(this.name) ?? {}
            memoryStores.set(this.name, data)
            return data
        }

        const raw = localStorage.getItem(this.getBrowserStorageKey())
        if (!raw) return {}

        try {
            return JSON.parse(raw) as StoreData
        } catch {
            return {}
        }
    }

    private writeBrowserData(data: StoreData) {
        if (this.options.autoSave === false) {
            memoryStores.set(this.name, data)
            return
        }
        localStorage.setItem(this.getBrowserStorageKey(), JSON.stringify(data))
    }

    private getTauriStore() {
        this.tauriStore ??= import('@tauri-apps/plugin-store').then(({ LazyStore }) => {
            return new LazyStore(this.name, this.options) as unknown as TauriStore
        })
        return this.tauriStore
    }
}

function createRuntimeStore(name: string, options?: RuntimeStoreOptions) {
    return new RuntimeStore(name, options)
}

export { createRuntimeStore }
