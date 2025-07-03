// intention.ts
import {
  ModelClass,
  Memory,
  generateText,
  type IAgentRuntime,
} from "@data3os/agentcontext";
import { extractJson } from "./utils"
import { TaskHelper } from "./task";


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
    const prompt = `根据用户输入${message.content.text}，生成仿写笔记。
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
  static async handleHotPosts(
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<any> {
    const prompt = `根据我的产品背景，找到对标热文，或通过KOC找到热帖，进行分析和仿写。
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