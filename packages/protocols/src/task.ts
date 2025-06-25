import {
  ModelClass,
  Memory,
  UUID,
  composeContext,
  generateText,
  stringToUuid,
  type IAgentRuntime,
} from "@data3os/agentcontext";
import {
  getDynamicTail,
  readCacheFile,
  appendToChatCache,
} from "./filehelper";
import { UserKnowledge } from "./userknowledge";

const TASK_ORIGIN_INPUT_CACHE_KEY = "_task_cache_";
const TASK_OPTION_CACHE_KEY = "_task_option_cache_";
const TASK_STATUS_KEY = "_task_status_cache_";

export class TaskHelper {
  //userId: string = null;
  static TASK_DATA_CACHE_FILE = "_all_data.txt";

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
      await this.setCachedData(runtime, TASK_ORIGIN_INPUT_CACHE_KEY + taskId, data);
    }
    catch (err) {
      console.log(`setTaskOriginInput ${taskId}`);
      console.error(err);
    }
  }

  static async getTaskOriginInput(runtime: IAgentRuntime, taskId: string): Promise<string> {
    try {
      return await this.getCachedData(runtime, TASK_ORIGIN_INPUT_CACHE_KEY + taskId);
    }
    catch (err) {
      console.log(`getTaskOriginInput ${taskId}`);
      console.error(err);
    }
    return "";
  }

  static async setTaskOption(runtime: IAgentRuntime, taskId: string, data: string) {
    try {
      await this.setCachedData(runtime, TASK_OPTION_CACHE_KEY + taskId, data);
    }
    catch (err) {
      console.log(`setTaskOption ${taskId}`);
      console.error(err);
    }
  }

  static async getTaskOption(runtime: IAgentRuntime, taskId: string): Promise<string> {
    try {
      return await this.getCachedData(runtime, TASK_OPTION_CACHE_KEY + taskId);
    }
    catch (err) {
      console.log(`getTaskOption ${taskId}`);
      console.error(err);
    }
    return "";
  }

  static async setTaskStatus(runtime: IAgentRuntime, taskId: string, text: string, completed: boolean = false) {
    try {
      if (!taskId) {
        return;
      }
      const cache = { completed, text };
      await this.setCachedData(runtime, TASK_STATUS_KEY + taskId, JSON.stringify(cache));
    }
    catch (err) {
      console.log(`setTaskStatus ${taskId}`);
      console.error(err);
    }
  }

  static async getTaskStatus(runtime: IAgentRuntime, taskId: string): Promise<string> {
    try {
      return await this.getCachedData(runtime, TASK_STATUS_KEY + taskId);
    }
    catch (err) {
      console.log(`getTaskStatus ${taskId}`);
      console.error(err);
    }
    return "";
  }

  static getTaskAttachment(taskId: string) {
    try {
      let attachment = readCacheFile(taskId + this.TASK_DATA_CACHE_FILE);
      if (!attachment || attachment.length < 1) {
        attachment = readCacheFile(taskId + "_raw_data.txt");
        if (!attachment || attachment.length < 1) {
          attachment = readCacheFile(taskId + "_raw_data1.txt");
          if (attachment) {
            attachment = attachment + readCacheFile(taskId + "_raw_data2.txt");
          }
        }
      }
      if (attachment && attachment.length > 50 * 1024) {
        console.log(`Data Attachment too large ${attachment.length}`);
        attachment = attachment.slice(0, 50 * 1024);
      }
      return attachment;
    }
    catch (err) {
      console.log(err);
    }
    return '';
  }

  static generateTaskId() {
    const timestamp = Date.now().toString(36);
    const seq = Math.floor(Math.random() * 1000)
      .toString(36)
      .padStart(4, "0");
    return `TASK-${timestamp}-${seq}`;
  }

  static async checkNewTask(runtime: IAgentRuntime, message: Memory, taskId: string): Promise<any> {
    console.log(`checkNewTask ${taskId}`);
    const userInput = `${message.content.text}`;
    const firstInput = await this.getTaskOriginInput(runtime, taskId);
    const firstOption = await this.getTaskOption(runtime, taskId);
    const attachment = this.getTaskAttachment(taskId);
    const prompt = `
      你是运营专员/运营数据处理工程师，现在请根据用户的两个输入，判断这两个需求的是否有是同一个数据任务。
      同一个数据任务是指其目标、所用数据、相关处理动作都是一致的。
      用户的第一个需求为：${firstInput}。
      第一个需求的额外输入：${firstOption}。
      第一个需求相关联的数据为：${attachment}
      用户的第二个需求为：${userInput}。
      如果第二个需求跟第一个需求（及其额外输入和关联数据）同一个数据任务则返回true，否则返回false。
      只需要输出须true或false，不需要其他内容。
      -----------------------------
    `;
    try {
      let response = await generateText({
        runtime,
        context: await UserKnowledge.composePrompt(runtime, prompt, message.userId),
        modelClass: ModelClass.LARGE,
      });
      console.log(response);
      if (response == 'true') {
        return true;
      }
      else if (response == 'false') {
        return false;
      }
      return false;
    }
    catch (err) {
      console.log(`checkNewTask err ${err.message}`);
      console.error(err);
    }
    return false;
  }

  static async quickResponse(runtime: IAgentRuntime, message: Memory, taskId: string): Promise<any> {
    console.log(`quickResponse ${taskId}`);
    const userInput = `${message.content.text}`;
    const prompt = `
      根据输入给出一个简短回复：${userInput}。
    `;
    try {
      let response = await generateText({
        runtime,
        context: prompt,
        modelClass: ModelClass.LARGE,
      });
      console.log(response);
      return response;
    }
    catch (err) {
      console.log(`quickResponse err ${err.message}`);
      console.error(err);
    }
    return false;
  }
}
