//keywords.ts
import {
    ModelClass,
    generateText,
    type IAgentRuntime,
} from "@data3os/agentcontext";

//Test
//async function test() {
//  try {
//    const subWords = await KeyWordGenerator.generateMore(runtime, 'keyword');
//    console.log('KeyGen success: ', subWords);
//  } catch (err: any) {
//    console.error('KeyGen failed: ', err.message);
//  }
//}

export class KeyWordGenerator {

  constructor() {}

  /**
   * Keyword to a sub key array
   * @param {string} keyword
   * @returns {Promise<string>[]} Keywords
   */
  static async generateMore(runtime: IAgentRuntime, keyword: string): Promise<string[]> {
    const prompt = `请把“${keyword}”这个用以搜索的关键词，从某个维度分解为大概5个关键词；
        这些新的关键词搜索出来的内容都属于“${keyword}”这个总的范围，
        并且其并集大致同于原关键词的范围，各个关键词之间又没有交集。
        另外，该关键词主要用以在小红书/抖音等上搜索相关帖子/视频等。
        比如，“中药”关键词，可以分为[“中药 养生”， “中药 养颜”， “中药 调理”， “中药 治疗”， “中药 预防”]等。
        以如下JSON的形式输出结果：
        {
          "dimension": "dimension string",
          "original_keyword": "${keyword}",
          "sub_keywords": [
            "${keyword} sub_key_0",
            "${keyword} sub_key_1",
            "${keyword} sub_key_2",
            "${keyword} sub_key_3",
            "${keyword} sub_key_4"
          ],
          "note": "description for the output"
        }
        输出结果只包含JSON结构体不要包含其他内容，以便于进行JSON解析。`;
    try {
      let response = await generateText({
        runtime,
        context: prompt,
        modelClass: ModelClass.SMALL,
      });
      console.log(response);
      response = response.replace(/```json/g, "").replace(/```/g, "");

      let json = JSON.parse(response);
      return json.sub_keywords;
    } catch (err) {
      console.log(err);
    }
    return [keyword];
  }

}
