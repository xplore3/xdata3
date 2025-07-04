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
        const prompt = `根据我的产品背景：${userProfile}，
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
        const prompt = `根据我的产品背景：${userProfile}，
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
    const prompt = `根据用户背景，查找KOC，并对其进行合作评估。
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