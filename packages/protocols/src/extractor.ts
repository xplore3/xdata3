//extractor.ts
import { JSONPath } from 'jsonpath-plus';
import {
    ModelClass,
    generateText,
    type IAgentRuntime,
} from "@data3os/agentcontext";

//Test
//async function test() {
//  try {
//    const subWords = await DataExtractor.genExtractMapper(runtime, 'instruct', inputJson);
//    console.log('genExtractMapper success: ', subWords);
//  } catch (err: any) {
//    console.error('genExtractMapper failed: ', err.message);
//  }
//}

export class DataExtractor {

  constructor() {}

  /**
   * User intention to jsonpath
   * @param {string} keyword
   * @returns {Promise<JSON>} JSONPath
   */
  static async genExtractMapper(
    runtime: IAgentRuntime,
    instruct: string,
    inputJson: JSON
  ): Promise<JSON> {
    const prompt = `
        根据给定指令：“${instruct}”\r\n，将给定JSON结构体：“${inputJson}”进行结构转换或精简；
        生成一个能给'jsonpath-plus'库使用的JSONPath表达式。
        输出结果只包含JSONPath表达式，不要包含其他内容，以便于进行JSON解析。`;
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
    return inputJson;
  }

}
