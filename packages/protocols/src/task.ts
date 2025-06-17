import {
    type IAgentRuntime
} from "@data3os/agentcontext";

const TASK_CACHE_KEY = "_task_cache_";

export class TaskHelper {
    //userId: string = null;

    private static async readFromCache<T>(runtime: IAgentRuntime, key: string): Promise<T | null> {
        const cached = await runtime.cacheManager.get<T>(key);
        return cached;
    }

    private static async writeToCache<T>(runtime: IAgentRuntime, key: string, data: T): Promise<void> {
        try {
            await runtime.cacheManager.set(key,
                data,
                {
                    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
                }
            );
        }
        catch (err) {
            console.log(`writeToCache key ${key}`);
            console.error(err);
        }
    }

    private static async getCachedData<T>(runtime: IAgentRuntime, key: string): Promise<T | null> {
        const fileCachedData = await this.readFromCache<T>(runtime, key);
        if (fileCachedData) {
            return fileCachedData;
        }

        return null;
    }

    private static async setCachedData<T>(runtime: IAgentRuntime, cacheKey: string, data: T): Promise<void> {
        await this.writeToCache(runtime, cacheKey, data);
    }

    static async setTaskOriginInput(runtime: IAgentRuntime, taskId: string, data: string) {
        try {
            await this.setCachedData(runtime, TASK_CACHE_KEY + taskId, data);
        }
        catch (err) {
            console.log(`setTaskOriginInput ${taskId}`);
            console.error(err);
        }
    }

    static async getTaskOriginInput(runtime: IAgentRuntime, taskId: string) {
        try {
            return await this.getCachedData(runtime, TASK_CACHE_KEY + taskId);
        }
        catch (err) {
            console.log(`getTaskOriginInput ${taskId}`);
            console.error(err);
        }
        return null;
    }
}
