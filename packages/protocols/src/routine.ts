// intention.ts
import {
  ModelClass,
  Memory,
  generateText,
  type IAgentRuntime,
} from "@data3os/agentcontext";
import { extractJson } from "./utils"
import { TaskHelper } from "./task";
import { ApiDb } from "./apis";
import { ApiExecution } from "./apiexecution";
import { UserKnowledge } from "./userknowledge";


export class RountineHandler {
  runtime: IAgentRuntime = null;
  message: Memory = null;

  constructor() { }

  /**
   * 
   * @param {string} 
   * @returns {Promise<string>[]} 
   */
  static async handlePositioningAnalysis(
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<any> {
    try {
      const taskId = message.content.intention?.taskId || "";
      const api1 = await ApiDb.getApi('notes_search');
      message.content.text = '找到10篇与品牌定位相关的热帖，按照热度排序。';
      let execParam = await ApiExecution.getApiQueryParam(runtime, message, api1, '');
      if (execParam) {
        api1.query_params = execParam.query_params;
        const execCount = 10;
        const result = await ApiExecution.executeApi(runtime, message, api1, execCount);
        await TaskHelper.setTaskStatus(runtime, taskId, `获取品牌定位热文${result.length}篇`);

        const userProfile = await UserKnowledge.getUserKnowledge(runtime, message.userId);
        const prompt = `你是一个专业的品牌策划师，十年小红书平台达人合作投放的营销专家/内容策略分析专家，
          请根据我的产品背景：${userProfile}，结合找到热帖：${JSON.stringify(result)}，
          给出我的品牌定位分析报告，主要包括如下一些内容：
          1.- 定位分析：输出品牌愿景、使命、价值观、个性、目标人群（即品牌屋）
          2.- 故事梳理：帮助形成创始人故事或品牌故事
          3.- 人群洞察：输出目标人群画像
          4.- 品牌视觉建议：品牌色、logo、账号头像
          另外给出进一步操作的选项约为5个，如下示例：[
            ‘改一下定位分析’，
            ‘故事中加入【***】元素’，
            ‘调整一下人群洞察’，
          ].
          -----------------------------
          输出格式如下：
          {
            "process_result": "以专业的报告的形式，给出定位分析报告",
            "option_description": "简要描述",
            "intention_options": ["改一下定位分析", "修改一下品牌调性", "......"],
            "taskId": "${taskId}"
          }
        `;
        try {
          let response = await generateText({
            runtime,
            context: await UserKnowledge.composePrompt(runtime, prompt, message.userId),
            modelClass: ModelClass.LARGE,
          });
          console.log(response);
          let execJson = extractJson(response);
          if (execJson) {
            if (execJson.intention_options) {
              await TaskHelper.setTaskOption(runtime, taskId, execJson.intention_options);
            }
            if (execJson.process_result) {
              await TaskHelper.setTaskStatus(runtime, taskId, JSON.stringify(execJson), true);
              return JSON.stringify(execJson);
            }
          }
          await TaskHelper.setTaskStatus(runtime, taskId, response, true);
          return response;
        } catch (err) {
          console.log(err);
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * 
   * @param {string} 
   * @returns {Promise<string>[]} 
   */
  static async handleTodayPosts(
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<any> {
     try {
      const taskId = message.content.intention?.taskId || "";
      const api1 = await ApiDb.getApi('notes_search');
      message.content.text = '找到10篇与我的产品相关的热帖，按照热度排序。';
      let execParam = await ApiExecution.getApiQueryParam(runtime, message, api1, '');
      if (execParam) {
        api1.query_params = execParam.query_params;
        const notesCount = 10;
        const notesResult = await ApiExecution.executeApi(runtime, message, api1, notesCount);
        await TaskHelper.setTaskStatus(runtime, taskId, `获取热文${notesResult.length}篇`);

        const api2 = await ApiDb.getApi('top_trend');
        message.content.text = '找到热门话题、热搜词等。';
        execParam = await ApiExecution.getApiQueryParam(runtime, message, api2, '');
        if(!execParam) {
            return "";
        }
        api2.query_params = execParam.query_params;
        const hotsCount = 30;
        const hotsResult = await ApiExecution.executeApi(runtime, message, api2, hotsCount);
        await TaskHelper.setTaskStatus(runtime, taskId, `获取热门信息${hotsResult.length}篇`);

        const userProfile = await UserKnowledge.getUserKnowledge(runtime, message.userId);
        const intention_examples = UserKnowledge.getGenerateIntention(message.userId);
        const prompt = `你是一个专业的小红书运营专家/文案策划师/文案撰写专家，根据我的产品背景：${userProfile}，
          结合找到热帖：${JSON.stringify(notesResult)}， 同时结合热点事件（热搜词和热门话题）${JSON.stringify(hotsResult)}。
          结合一下帖子生成/改写的选项${intention_examples}，给出仿写选项。
          选项个数为5~10个，如下示例：[
            ‘重新仿写’，
            ‘依据我的品牌调性改写’，
          ].
          -----------------------------
          输出格式如下：
          {
            "process_result": "仿写的帖子，标题、摘要、内容等信息",
            "option_description": "简要分析和描述",
            "intention_options": ["重新仿写今日热门", "依据我的品牌调性改写", "......"],
            "taskId": "${taskId}"
          }
        `;
        try {
          let response = await generateText({
            runtime,
            context: await UserKnowledge.composePrompt(runtime, prompt, message.userId),
            modelClass: ModelClass.LARGE,
          });
          console.log(response);
          let execJson = extractJson(response);
          if (execJson) {
            if (execJson.intention_options) {
              await TaskHelper.setTaskOption(runtime, taskId, execJson.intention_options);
            }
            if (execJson.process_result) {
              await TaskHelper.setTaskStatus(runtime, taskId, JSON.stringify(execJson), true);
              return JSON.stringify(execJson);
            }
          }
          await TaskHelper.setTaskStatus(runtime, taskId, response, true);
          return response;
        } catch (err) {
          console.log(err);
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * 
   * @param {string} 
   * @returns {Promise<string>[]} 
   */
  static async handleHotPosts(
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<any> {
    try {
      const taskId = message.content.intention?.taskId || "";
      const api1 = await ApiDb.getApi('notes_search');
      message.content.text = '找到10篇与我的产品相关的热帖，按照热度排序。';
      let execParam = await ApiExecution.getApiQueryParam(runtime, message, api1, '');
      if (execParam) {
        api1.query_params = execParam.query_params;
        const execCount = 10;
        const result = await ApiExecution.executeApi(runtime, message, api1, execCount);
        await TaskHelper.setTaskStatus(runtime, taskId, `获取热文${result.length}篇`);

        const userProfile = await UserKnowledge.getUserKnowledge(runtime, message.userId);
        const intention_examples = UserKnowledge.getGenerateIntention(message.userId);
        const prompt = `你是一个专业的小红书内容策略分析专家/运营专家，根据我的产品背景：${userProfile}，
          结合找到热帖：${JSON.stringify(result)}，以表格的形式对这些帖子进行呈现。
          结合一下帖子生成/改写的选项${intention_examples}，给出按照帖子ID进行的仿写/改写选项。
          选项个数为5~10个，如下示例：[
            ‘仿写【帖子ID1】’，
            ‘依据我的品牌调性改写【帖子ID2】’，
            ‘分析【帖子ID3】为何这么高的互动’，
          ].
          -----------------------------
          输出格式如下：
          {
            "process_result": "帖子信息的表格形式呈现",
            "option_description": "简要分析和描述",
            "intention_options": ["仿写【帖子ID1】", "依据我的品牌调性改写【帖子ID2】", "......"],
            "taskId": "${taskId}"
          }
        `;
        try {
          let response = await generateText({
            runtime,
            context: await UserKnowledge.composePrompt(runtime, prompt, message.userId),
            modelClass: ModelClass.LARGE,
          });
          console.log(response);
          let execJson = extractJson(response);
          if (execJson) {
            if (execJson.intention_options) {
              await TaskHelper.setTaskOption(runtime, taskId, execJson.intention_options);
            }
            if (execJson.process_result) {
              await TaskHelper.setTaskStatus(runtime, taskId, JSON.stringify(execJson), true);
              return JSON.stringify(execJson);
            }
          }
          await TaskHelper.setTaskStatus(runtime, taskId, response, true);
          return response;
        } catch (err) {
          console.log(err);
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * 
   * @param {string} 
   * @returns {Promise<string>[]} 
   */
  static async handleSearchKoc(
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<any> {
    try {
      const taskId = message.content.intention?.taskId || "";
      const api1 = await ApiDb.getApi('koc_search');
      message.content.text = '找到10个与我的产品及运营背景类似的达人/KOC，按照热度排序。';
      let execParam = await ApiExecution.getApiQueryParam(runtime, message, api1, '');
      if (execParam) {
        api1.query_params = execParam.query_params;
        const execCount = 10;
        const result = await ApiExecution.executeApi(runtime, message, api1, execCount);
        await TaskHelper.setTaskStatus(runtime, taskId, `获取达人${result.length}位`);

        const userProfile = await UserKnowledge.getUserKnowledge(runtime, message.userId);
        const intention_examples = UserKnowledge.getEvaluationIntention(message.userId);
        const prompt = `你是一个专业的小红书平台达人合作投放的营销专家/内容策略分析专家，
          根据我的产品背景：${userProfile}，结合找到达人账号：${JSON.stringify(result)}，
          以表格的形式对这些运营达人的基本信息/画像进行呈现，以及如下内容：
          1. 根据达人内容与互动质量，评估每位达人的合作优先级（
          - 高：调性高度契合 + 内容稳定 + 互动率高
          - 中：部分调性契合 + 内容有潜力
          - 低：调性边缘或互动一般，待观察）；
          2. 达人内容调性分析与匹配判断，输出“内容调性匹配度打分”+ 内容风格简评；
          3. 合作投放建议，包括合作形式、内容方向、适合投放时间段、预算建议等
          结合达人评估的相关选项${intention_examples}，给出下一步选项，选项个数为5~10个。
          -----------------------------
          输出格式如下：
          {
            "process_result": "达人信息和分析的表格形式呈现",
            "option_description": "简要描述",
            "intention_options": ["详细评估【达人ID1】", "评估每位达人的合作优先级", "......"],
            "taskId": "${taskId}"
          }
        `;
        try {
          let response = await generateText({
            runtime,
            context: await UserKnowledge.composePrompt(runtime, prompt, message.userId),
            modelClass: ModelClass.LARGE,
          });
          console.log(response);
          let execJson = extractJson(response);
          if (execJson) {
            if (execJson.intention_options) {
              await TaskHelper.setTaskOption(runtime, taskId, execJson.intention_options);
            }
            if (execJson.process_result) {
              await TaskHelper.setTaskStatus(runtime, taskId, JSON.stringify(execJson), true);
              return JSON.stringify(execJson);
            }
          }
          await TaskHelper.setTaskStatus(runtime, taskId, response, true);
          return response;
        } catch (err) {
          console.log(err);
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * 
   * @param {string} 
   * @returns {Promise<string>[]} 
   */
  static async handleTrendPrediction(
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<any> {
    const prompt = `根据最新热点、爆文、新闻事件等，预测下周热点事件。
      -----------------------------
    `;
    try {
      let response = await generateText({
        runtime,
        context: prompt,
        modelClass: ModelClass.LARGE,
      });
      console.log(response);
      let execJson = extractJson(response);
      const taskId = message.content.intention?.taskId || "";
      await TaskHelper.setTaskStatus(runtime, taskId, execJson || response, true);
      if (execJson) {
        return execJson;
      }
      return response;
    } catch (err) {
      console.log(err);
    }
  }
}