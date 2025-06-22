import {
  type IAgentRuntime,
} from "@data3os/agentcontext";

const API_DATA_CACHE = "_api_data_cache_";

export class DataCache {

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

  static async setApiCacheData(runtime: IAgentRuntime, api: string, data: string) {
    try {
      await this.setCachedData(runtime, API_DATA_CACHE + api, data);
    }
    catch (err) {
      console.log(`setApiCacheData ${api}`);
      console.error(err);
    }
  }

  static async getApiCacheData(runtime: IAgentRuntime, api: string): Promise<string> {
    try {
      return await this.getCachedData(runtime, API_DATA_CACHE + api);
    }
    catch (err) {
      console.log(`getApiCacheData ${api}`);
      console.error(err);
    }
    return "";
  }
}
