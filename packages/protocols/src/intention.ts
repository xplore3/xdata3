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
        生成这个表达式：{extract: string, filter: string}，其中extract用以字段映射，filter用以筛选过滤。
        extract是一个用\`\`括住的包含\${...}的能够进行字段映射的模板字符串表达式string，filter能给'jsonpath-plus'库使用的JSONPath。
        转换后的结果需要至少包含这些字段：
        { 
          id, author, title, content/desc/description, date/timestamp, url,
          collected_count, shared_count, comments_count, likes_count
        }，这些字段可以是原有字段的组合或转换。其中，id是唯一标识符，author是作者，title是标题，content/desc/description是内容描述。
        根据指令要求，还需要对collected_count/shared_count/comments_count/likes_count的数量进行过滤。
        extract和filter需要处理一些边界情况，比如：
        - 如果某个字段不存在，则不包含该字段；
        - filter添加存在性检查（@.note && ...）, filter只需进行数量的过滤，不需要进行关键词匹配；
        - extraxt添加存在性检查（\${item.note && ...}）或使用可选链（?.）和默认值（||）。
        正确输出示例如下：
        {
          "extract": "\`{
            'id': \${item.note?.id || ''},
            'author': \${item.note?.user?.nickname || ''},
            'title': \${item.note?.title || ''},
            'desc': \${item.note?.desc || ''},
            'date': \${item.note?.update_time || item.note?.timestamp || 0},
            'url': \${item.note?.images_list?.[0]?.url || ''},
            'collected_count': \${item.note?.collected_count || 0},
            'shared_count': \${item.note?.shared_count || 0},
            'comments_count': \${item.note?.comments_count || 0},
            'likes_count': \${item.note?.liked_count || 0}
          }\`",
          "filter": $.[?(@.note && (@.note.collected_count || 0) > 1000 && (@.note.shared_count || 0) > 500 && (@.note.comments_count || 0) > 100 && (@.note.liked_count || 0) > 1000)]"
        }
        输出结果用{extract: string, filter: string}只包含string和JSONPath表达式，不要包含其他内容，以便于进行JSON解析。`;
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
        else {
          response = JSON.parse(response);
        }
      }
      catch (e) {
        console.error("Failed to parse JSON from response:", e);
      }
      return {extract: response.extract, filter: response.filter};
    } catch (err) {
      console.log(err);
    }
    return {
      extract: `\`{
            'id': \${item.note?.id || ''},
            'author': \${item.note?.user?.nickname || ''},
            'title': \${item.note?.title || ''},
            'desc': \${item.note?.desc || ''},
            'date': \${item.note?.update_time || item.note?.timestamp || 0},
            'url': \${item.note?.images_list?.[0]?.url || ''},
            'collected_count': \${item.note?.collected_count || 0},
            'shared_count': \${item.note?.shared_count || 0},
            'comments_count': \${item.note?.comments_count || 0},
            'likes_count': \${item.note?.liked_count || 0}
          }\``,
      // Should be a online valid JSONPath expression
      filter: `$.[?(@.note && (@.note.collected_count || 0) > 1000 && (@.note.shared_count || 0) > 500 && (@.note.comments_count || 0) > 100 && (@.note.liked_count || 0) > 1000)]`
    };
  }
}
