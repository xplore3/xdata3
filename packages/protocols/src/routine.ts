// intention.ts
import {
  ModelClass,
  Memory,
  generateText,
  type IAgentRuntime,
} from "@data3os/agentcontext";
import {
  getDynamicTail,
  appendToChatCache,
} from "./filehelper";
import { ApiDb } from "./apis";
import { extractJson } from "./utils"
import { ApiExecution } from "./apiexecution";
import { TaskHelper } from "./task";
import { UserKnowledge } from "./userknowledge";
import { chatWithDeepSeek } from "./aibydeepseek";


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
    const prompt = `
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
    const prompt = `
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
      if (execJson) {
        return execJson;
      }
      return response;
    } catch (err) {
      console.log(err);
    }
  }
}