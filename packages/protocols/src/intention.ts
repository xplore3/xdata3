// intention.ts
import {
    ModelClass,
    Memory,
    UUID,
    generateText,
    type IAgentRuntime,
} from "@data3os/agentcontext";


export class IntentionHandler {
  runtime: IAgentRuntime = null;
  message: Memory = null;

  constructor() {}

  /**
   * 
   * @param {string} 
   * @returns {Promise<string>[]} 
   */
  static async parseIntention(
    runtime: IAgentRuntime,
    message: Memory
  ): Promise<JSON> {
    const prompt = ``;
    try {
      let response = await generateText({
        runtime,
        context: prompt,
        modelClass: ModelClass.SMALL,
      });
      console.log(response);
      return response;
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * User intention to jsonpath
   * @param {string} keyword
   * @returns {Promise<JSON>} JSONPath
   */
  static async genExtractMapper(
    runtime: IAgentRuntime,
    message: Memory,
    inputJson: JSON
  ): Promise<{extract: string, filter: string}> {
    const prompt = `
        根据给定指令：“${message.content.text}”\r\n，将给定JSON结构体：“${JSON.stringify([inputJson])}”进行结构转换或精简；
        生成两个能给'jsonpath-plus'库使用的JSONPath表达式：{extract: string, filter: string}，其中extract用以字段映射，filter用以筛选过滤。
        转换后的结果需要至少包含这些字段：
        { 
          id, author, title, content/desc/description, date/timestamp, tags/tabs, url,
          collected_count, shared_count, comments_count, likes_count
        }，这些字段可以是原有字段的组合或转换。其中，id是唯一标识符，author是作者，title是标题，content/desc/description是内容描述。
        根据指令要求，还需要对collected_count/shared_count/comments_count/likes_count的数量进行过滤。
        需要处理一些边界情况，比如：
        - 如果某个字段不存在，则不包含该字段；添加存在性检查（@.note && ...）或使用可选链（?.）和默认值（||）。
        输出结果用{extract: string, filter: string}只包含JSONPath表达式，不要包含其他内容，以便于进行JSON解析。`;
    try {
      let response = await generateText({
        runtime,
        context: prompt,
        modelClass: ModelClass.SMALL,
      });
      console.log(response);
      try {
        const match = response.match(/```json\s*([\s\S]*?)```/);
        if (match) {
          const jsonString = match[1];
          response = JSON.parse(jsonString);
        }
        return {extract: response.extract, filter: response.filter};
      }
      catch (e) {
        console.error("Failed to parse JSON from response:", e);
      }
    } catch (err) {
      console.log(err);
    }
    return { extract: "", filter: "" };
  }
}
