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
import { extractJson } from "./utils";

const TASK_ORIGIN_INPUT_CACHE_KEY = "_task_cache_";
const TASK_OPTION_CACHE_KEY = "_task_option_cache_";
const TASK_STATUS_KEY = "_task_status_cache_";
const TASK_PLATFORM_KEY = "_task_platform_cache_";

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
      console.log(`setTaskOption ${taskId},  ${data}`);
      await this.setCachedData(runtime, TASK_OPTION_CACHE_KEY + taskId, data);
    }
    catch (err) {
      console.log(`setTaskOption ${taskId}`);
      console.error(err);
    }
  }

  static async getTaskOption(runtime: IAgentRuntime, taskId: string): Promise<string> {
    try {
      console.log(`getTaskOption ${taskId}`);
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

  static async setTaskPlatform(runtime: IAgentRuntime, taskId: string, text: string) {
    try {
      if (!taskId) {
        return;
      }
      await this.setCachedData(runtime, TASK_PLATFORM_KEY + taskId, text);
    }
    catch (err) {
      console.log(`setTaskPlatform ${taskId}`);
      console.error(err);
    }
  }

  static async getTaskPlatform(runtime: IAgentRuntime, taskId: string): Promise<string> {
    try {
      return await this.getCachedData(runtime, TASK_PLATFORM_KEY + taskId);
    }
    catch (err) {
      console.log(`getTaskPlatform ${taskId}`);
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
      第一个需求的关联输入：${firstOption}。
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

  static async quickResponse(runtime: IAgentRuntime, message: Memory): Promise<any> {
    try {
      const taskId = message.content?.intention?.taskId;
      console.log(`quickResponse ${taskId}`);
      const intention_examples = UserKnowledge.getUserIntentionExamples(message.userId);
      const options = await this.getTaskOption(runtime, taskId);
      const prompt = `根据用户的输入内容：【${message.content.text}】，
        和之前所提供的关联选项：【${options}】；
        可参考的关联选项示例如下：【${intention_examples}】。
        判断这个内容是不是仅仅是一个打招呼的内容，请返回一个如下JSON：
        {
          'quick': true or false,
          'response': '一个同种语言的打招呼类简短回复，并指导用户明确一下其数据请求'
        }.
        输出须是一个标准的JSON格式，能够使用JSON.parse()进行解析，不需要包含其他内容。
        如果用户输入仅是一个打招呼类的，用户输入与关联选项也没有关系，
        且用户输入也不是一个有关的数据获取或数据处理类请求，则quick为true，否则为false。
        如果用户输入包含了一些数据类对象（如笔记/帖子/评论/达人/账号/商品/KOC等），则quick大概率为false。
        response字段是一个简短回复，可以概率性的附上如下数组内容中的一项：
        [
          "\n\n回复‘模板’获取常用提示词模板",
          "\r\n我是TrendMuse —— 基于自然语言驱动的数据洞察与内容执行助手",
          "\r\n你只需说出需求，我将自动获取社交媒体及短视频数据，输出：
            \r\n1. **--高热趋势内容分析📈**
              \n2. **--竞品账号策略解构📚**
              \n3. **--用户评论兴趣提炼🚀**
              \n4. **--达人合作建议🤖**
              \n5. **--可直接发布的内容文案与评论模版📚**
          \n等任意社媒运营需求.…",
          "\r\n为了更好的实现数据获取和数据处理的功能效果，输入内容须是如下格式：
          \r\n🚩【平台】【时间期限】【关键词】【数量】【过滤条件】【排序相关】
          \r\n如：
          \r\n🚩帮我找一下【小红书】上【一周内】关于【足球】的【100条】内容，要求【点赞数】大于【1000】",
          "......",
          "",
          "🤖"
        ]
      `;
      console.log(prompt);
      let resp = await generateText({
        runtime,
        context: prompt,
        modelClass: ModelClass.LARGE,
      });
      console.log(resp);

      let json = extractJson(resp);
      if (json) {
        return json;
      }
      return resp;
    } catch (err) {
      console.log(err);
    }
  }
}
