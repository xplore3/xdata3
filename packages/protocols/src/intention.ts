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


export class IntentionHandler {
  runtime: IAgentRuntime = null;
  message: Memory = null;

  constructor() { }

  /**
   * 
   * @param {string} 
   * @returns {Promise<string>[]} 
   */
  static async analysisDataPlatform(
    runtime: IAgentRuntime,
    message: Memory,
    existData: string = '',
  ): Promise<any> {
    const my_data_platforms = await ApiDb.getUserDataPlatform(message.userId);
    const prompt = `
      你是一个数据获取专家，能够基于用户的输入，获取到用户请求的数据平台是哪个。
      用户输入：${message.content.text}.
      可用数据平台：${my_data_platforms}。
      -----------------------------
      输出格式如下：{
        "platform": 'platform key',
        "platform_count": "用户输入中的数据平台数量"
      }
      输出须是一个标准的JSON格式，能够使用JSON.parse()进行解析。
      主要有如下一些情况：
        (1). 如果用户的输入里，只有一个数据平台，则输出：{
          "platform": 'platform key',
          "platform_count": 1
        };
        (2). 如果用户的输入里，有多个数据平台，则输出：{
          "platform": 'the first platform key',
          "platform_count": "用户输入中的数据平台数量"
        };
        (3). 如果用户的输入里，没有指定的这些数据平台，则输出：{
          "platform": 'others',
          "platform_count": 0
        };
      platform不要有指定数据平台范围外的数据。
      输出示例如下：{
        "platform": 'rednote',
        "platform_count": 1
      }
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
  static async handleDataCollectAPI(
    runtime: IAgentRuntime,
    message: Memory,
    existData: string = '',
  ): Promise<string> {
    let my_data_platform = process.env.FIX_PLATFORM || '';
    if (!my_data_platform || my_data_platform == '') {
      const analysisJson = await this.analysisDataPlatform(runtime, message, existData);
      if (analysisJson && analysisJson.platform && analysisJson.platform != 'others') {
        my_data_platform = analysisJson.platform;
      }
      else if (analysisJson && analysisJson.platform == 'others') {
        my_data_platform = '';
      }
    }
    if (!my_data_platform || my_data_platform == '') {
        const taskId = message.content.intention?.taskId || "";
        const data_result = "哎呀，无法获知你要操作的数据平台，请明确说明，或回复【人工】获取支持~";
        const analysisJson = {
          data_result: data_result,
          intention_options: [],
        };
        await TaskHelper.setTaskStatus(runtime, taskId, JSON.stringify(analysisJson), true);
        return JSON.stringify(analysisJson);
    }
    //const my_data_platform = await ApiDb.getUserDataPlatform(message.userId);
    const my_data_source = await ApiDb.getUserDataSource(my_data_platform, message.userId);
    const intention_examples = UserKnowledge.getUserIntentionExamples(message.userId);
    const prompt = `
      你是一个程序员兼产品经理，能根据用户的请求，提取出其数据获取需求，并根据可用API列表给出其需要调用的API。
      主要有如下一些情况：
        (1). 如果用户的输入里，除了有进行数据获取的需求外，还有其他需求，则将这些需求以意图选项的形式输出出来。
        (2). 如果用户的输入里，不包含数据获取的内容，则将这些内容进行拆解，找到其中的意图选项，输出出来。
        (3). 如果用户的输入里，既不包含数据获取需求，也没有明确的数据处理意图，也无其他意图，则参考最近的消息，给出相关的意图选项。
        (4). 如果用户的输入跟数据获取或数据处理都没有关系，则参考上下文给出简短回答，且不需要意图选项。
        (5). 如果用户需要获取的数据在可用数据源${my_data_source}里不存在，则data_result须提示用户不存在这些数据，稍后会提供，请用户耐心等待；intention_params和intention_options为空。
      用户输入：${message.content.text}.
      可用数据平台：${my_data_platform}。
      可用数据源/数据获取API：${my_data_source}。
      已有数据：${existData}。
      -----------------------------
      你需要输出如下：
      {
        "intention_params": {
          "data_source": "rednote",
          "data_action": "notes_search",
          "request_count": 20,
          "filter_desc": "the description of the data filter"
        },
        "data_result": "简短任务描述，不是结果描述",
        "intention_options": ["使用数据的意图1", "使用数据的意图2", "......"],
      }
      输出须是一个标准的JSON格式，能够使用JSON.parse()进行解析。
      data_result不要包含API/接口字样，需要使用非开发人员能够理解的语言，只是任务描述，不是数据结果。
      data_action的可选项是各个可用的API列表my_data_source中的关键字，如果不在这个列表里，输出为others。
      intention_options是根据用户输入而得出的选项，以用户明确输入的选项为优先，
          且结合用户自身的产品和背景（不要有‘搜索小红书笔记’这样的选项，需要是‘搜索小红书关于***的笔记’），
          其数量约为5~10个，其可参考的示例如下：【${intention_examples}】；
      -----------------------------
    `;
    try {
      let response = await generateText({
        runtime,
        context: await UserKnowledge.composePrompt(runtime, prompt, message.userId),
        modelClass: ModelClass.LARGE,
      });
      console.log(response);
      let execJson = extractJson(response);
      const taskId = message.content.intention?.taskId || "";
      if (execJson && execJson.intention_params) {
        if (execJson.intention_options) {
          await TaskHelper.setTaskOption(runtime, taskId, execJson.intention_options);
        }
        let execParam = execJson.intention_params;
        {
          if (execParam.data_action && execParam.data_action != 'others') {
            await TaskHelper.setTaskStatus(runtime, taskId, execParam.data_result);
            const dataResponse = await this.handleDataCollectInputParam(runtime, message,
              execParam.data_result, execParam.data_action);
            // TODO
            execJson.data_result += "\r\n\r\n" + dataResponse + "\n";
          }
        }
        execJson.taskId = taskId;
      }
      else if (execJson) {
        execJson.taskId = taskId;
        if (execJson.intention_options) {
          await TaskHelper.setTaskOption(runtime, taskId, execJson.intention_options);
        }
      }
      else {
        execJson = response;
      }
      await TaskHelper.setTaskStatus(runtime, taskId, execJson, true);
      return execJson;
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * 
   * @param {string} 
   * @returns {Promise<string>[]} 
   */
  static async handleDataCollectInputParam(
    runtime: IAgentRuntime,
    message: Memory,
    data_desc: string,
    api_desc: string
  ): Promise<string> {
    const api = await ApiDb.getApi(api_desc);
    try {
      const txtfilelist = [];
      const excelfilelist = [];
      const results = [];
      const taskId = message.content.intention?.taskId || "";
      let execJson = await ApiExecution.getApiQueryParam(runtime, message, api, '');
      if (execJson) {
        if (execJson.query_params) {
          api.query_params = execJson.query_params;
          const execCount = execJson.request_count <= 100 ? execJson.request_count : 100;
          const { result, txtfilename, excelfilename } = await ApiExecution.executeApiChainLoop(
            runtime, message, api, execCount
          );
          if (result && result.length > 0) {
            results.push(result);
            const filename = taskId + TaskHelper.TASK_DATA_CACHE_FILE;
            appendToChatCache(JSON.stringify(result), filename, (err) => {
              console.error("Custom error handling:", err);
            });
          }
          // console.log(`return after, len: ${result.length}, txt: ${txtfilename} , excel: ${excelfilename}`);  
          if (txtfilename) {
            if (Array.isArray(txtfilename)) {
              for (const item of txtfilename) {
                if (item)
                  txtfilelist.push(item);
              }
            } else {
              txtfilelist.push(txtfilename);
            }
          }
          if (excelfilename) {
            if (Array.isArray(excelfilename)) {
              for (const item of excelfilename) {
                if (item)
                  excelfilelist.push(item);
              }
            } else {
              excelfilelist.push(excelfilename);
            }
          }
          //console.log(result);
          if (results.length > 0 && txtfilelist.length > 0) {
            const summary = await this.dataSummary(runtime, message, JSON.stringify(results[0]));
            return summary + "\r\n\r\n" + getDynamicTail(txtfilelist, excelfilelist);
          }
          else {
            return `哎呀，这个数据暂时无法获取，你可以稍后重试，或回复【人工】联系工程师进行支持~`;
          }
        }
      }
      return execJson;
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * 
   * @param {string} 
   * @returns {Promise<string>[]} 
   */
  static async handleDataProcess(
    runtime: IAgentRuntime,
    message: Memory,
    origin_input: string
  ): Promise<string> {
    const taskId = message.content?.intention?.taskId;
    const userInput = `根据已有数据，${message.content.text}`;
    const platform = await TaskHelper.getTaskPlatform(runtime, taskId);
    const my_data_source = ApiDb.getUserDataSource(platform, message.userId);
    const attachment = TaskHelper.getTaskAttachment(taskId);
    const intention_examples = UserKnowledge.getUserIntentionExamples(message.userId);
    const userProfile = await UserKnowledge.getUserKnowledge(runtime, message.userId);
    const prompt = `
      你是一个严肃的线上运营专员/数据处理工程师/数据分析师/十年小红书平台达人合作投放的营销专家/内容策略分析专家，
      能根据输入的多个结构的数据/文件进行加工、处理、分析、预测、仿写的专家，能够基于用户的多轮输入，将数据处理成用户需要的结果。
      主要有如下一些情况：
      (1). 如果用户的需求不是一个数据处理的需求，而是一个数据获取的需求（这种情况的概率比较低），或者当前提供的数据无法有效进行数据分析或数据量无法满足用户的需求，则给出如下结果：
        {
          "intention_action": "data_collection",
          "origin_input": "${origin_input}",
          "intention_desc": "${userInput}",
          "attachment": "{attachment}",
        }.
      (2). 根据用户要求和附带的数据，进行数据的仿写/洞察/剖析/透视/阐释/推演/解构/溯源/思辨/融合；如果能够直接给出处理结果，则输出Markdown形式的分析结果。优先以这种情况进行处理。输出为一个可解析的JSON结果，如下：
        {
          "process_result": "处理/仿写/分析结果",
          "option_description": "下一步意图的描述",
          "intention_options": ["进一步的意图1", "进一步的意图2", "......"],
          "taskId": "${taskId}"
        }
      (3). 如果需求比较模糊，则可以给出可供选择的一些选项，让用户进行二次选择，以明确其需求。这种情况的输出为一个可解析的JSON结果，如下：
        {
          "process_result": "无法理解你的需求",
          "option_description": "相关的描述",
          "intention_options": ["进一步的意图1", "进一步的意图2", "......"],
          "taskId": "${taskId}"
        }
      (4). 如果用户的需求比较复杂，当前的数据无法满足处理的需求，且可用数据获取API：${my_data_source}中能够得到所需的数据，则输出结构同(1).
      (5). 如果用户的需求比较复杂，当前的数据无法满足处理的需求，且可用数据获取API：${my_data_source}中能够不能获取所需的数据，则需要告知用户缺少什么数据导致无法给出理想结果，并给出intention_options让用户决定是否进一步获取数据。输出结构同(3).
      (6). 如果用户的输入里，既不包含数据获取需求，也没有明确的数据处理意图，也无其他意图，则参考最近的消息，给出相关的意图选项。输出结构同(3)，其taskId设为空('')。
      (7). 如果用户的输入（${userInput}）明显与前置描述（${origin_input}）及数据处理无关，则只需给出一个文字回复。
      (8). 如果用户的输入（{userInput}）与现有数据({attachment})关联不明显，不要强行分析，需要给出类似(2)(3)的结果，其taskId设为空('')。
      这里(2)(3)(5)(6)输出的JSON，不需要再加其他JSON字段。
      关于(2)(3)(5)(6)中的process_result是数据分析/处理/仿写结果（须以Markdown形式输出）。
      关于(2)(3)(5)(6)中的option_description是下一步意图的总结性描述，不需要再包含具体意图选项，以免跟intention_options重复。
      关于(2)(3)(5)(6)中的intention_options，是根据用户输入而得出的选项，以用户明确输入的选项为优先，其次以示例中的选项为优先，
          且结合用户自身的产品和背景（不要有‘报告生成’这样的宽泛选项，不要有‘分析这些笔记’这样的模糊选项，需要是‘分析这些笔记关于***的特征’）,
          其数量约为5~10个，其可参考的示例如下：【${intention_examples}】。
      如果待处理数据中有一些用户的隐私数据，比如姓名/学校/住址/电话/邮箱/社媒账户等，需要进行隐藏或去除，不要泄露个人隐私。
      -----------------------------
      用户需求：${userInput}, 前置描述：${origin_input}。
      待处理数据内容：${attachment}。
      用户相关的产品、业务及背景为：${userProfile}。
    `;
    try {
      let response = await generateText({
        runtime,
        context: await UserKnowledge.composePrompt(runtime, prompt, message.userId),
        modelClass: ModelClass.LARGE,
      });
      console.log(response);
      //response = response.replace(/```json/g, "") .replace(/```/g, "");
      let execJson = extractJson(response);
      if (execJson) {
        if (execJson.intention_options) {
          await TaskHelper.setTaskOption(runtime, taskId, execJson.intention_options);
        }
        if (execJson.intention_action && execJson.intention_action === "data_collection") {
          message.content.text = origin_input + "\r\n" + message.content.text;
          //Gen new TaskId
          message.content.intention.taskId = TaskHelper.generateTaskId();
          await TaskHelper.setWechatTaskId(runtime, message.userId, taskId);
          await TaskHelper.setTaskOriginInput(runtime, taskId, message.content.text);
          await TaskHelper.setTaskStatus(runtime, taskId, JSON.stringify({taskId: message.content.intention.taskId}));
          return await IntentionHandler.handleDataCollectAPI(
            runtime, message, attachment
          );
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

  /**
   * 
   * @param {string} 
   * @returns {Promise<string>[]} 
   */
  static async dataSummary(
    runtime: IAgentRuntime,
    message: Memory,
    data: string
  ): Promise<string> {
    const prompt = `
      根据已有数据DATA_TO_PROCESS:${data}和用户指令USER_INSTRUCT:${message.content.text}进行数据处理或简要总结。
      如果用户指令USER_INSTRUCT要求进行分析处理，则给出分析结果；
      如果用户指令USER_INSTRUCT没有要求进行分析处理，则只需给出数据总结。
      如果已有数据中有一些用户的隐私数据，比如姓名/学校/住址/电话/邮箱/社媒账户等，需要进行隐藏或去除，不要泄露个人隐私。
    `;
    try {
      let response = await generateText({
        runtime,
        context: await UserKnowledge.composePrompt(runtime, prompt, message.userId),
        modelClass: ModelClass.LARGE,
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
  ): Promise<{ extract: string, filter: string }> {
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
          extract: "\`{
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
          filter: "$.[?(@.note && (@.note.collected_count || 0) > 100 && (@.note.shared_count || 0) > 50 && (@.note.comments_count || 0) > 10 && (@.note.liked_count || 0) > 100)]"
        }
        输出结果不要包含行尾的行连接符斜杠，以免JSON.parse()解析失败。各个字段的值都不需要换行或换行符。
        输出结果须是一个有效的JSON对象，且包含extract和filter两个字段。这个JSON对象需要能被JSON.parse()正确解析。
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

        // Invalid JSON, fallback to default
        response = await generateText({
          runtime,
          context: prompt + `\n\n上一个输出${response}有问题，不能正确JSON解析，请重新生成。`,
          modelClass: ModelClass.SMALL,
        });
        console.log(response);
        try {
          let json = null;
          const match = response.match(/```json\s*([\s\S]*?)```/);
          if (match) {
            const jsonString = match[1];
            response = JSON.parse(jsonString);
          }
          else {
            response = JSON.parse(response);
          }
          return { extract: json.extract, filter: json.filter };
        }
        catch (e) {
          console.error("Failed again to parse response:", e);
        }
      }
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
      filter: "$.[?(@.note && (@.note.collected_count || 0) > 100 && (@.note.shared_count || 0) > 50 && (@.note.comments_count || 0) > 10 && (@.note.liked_count || 0) > 100)]"
    };
  }

  /**
   * User intention to jsonpath
   * @param {string} keyword
   * @returns {Promise<JSON>} JSONPath
   */
  static async genExtractorByJsonata(
    runtime: IAgentRuntime,
    message: Memory,
    inputJson: JSON
  ): Promise<{ extract: string, filter: string }> {
    const prompt = `
        根据给定指令：“${message.content.text}”\r\n，将给定JSON结构体：“${JSON.stringify([inputJson])}”进行结构转换或精简；
        生成这个表达式：{extract: string, filter: string}，其中extract用以字段映射，filter用以筛选过滤。
        extract能够使用JSONata(https://github.com/jsonata-js/jsonata)的jsonata(extract)进行解析，
        filter能给'jsonpath-plus'库(https://github.com/JSONPath-Plus/JSONPath)使用的JSONPath。
        转换后的结果需要至少包含这些字段：
        { 
          id, author, title, content/desc/description, date/timestamp, url,
          collected_count, shared_count, comments_count, likes_count
        }，这些字段可以是原有字段的组合或转换。其中，id是唯一标识符，author是作者，title是标题，content/desc/description是内容描述。
        根据指令要求，还需要对collected_count/shared_count/comments_count/likes_count的数量进行过滤。
        extract和filter需要处理一些边界情况，比如：
        - 如果某个字段不存在，则不包含该字段；
        - filter添加存在性检查（@.note && ...）, filter只需进行数量的过滤，不需要进行关键词匹配；
        正确输出示例如下：
        {
          extract: \`$map($, function($item) {
          {
            'id': $item.note.id,
            'author': $item.note.user.nickname,
            'title': $item.note.title,
            'description': $item.note.desc,
            'date': [$item.note.update_time, $item.note.timestamp, 0][0],
            'tags': $item.note.tag_info.title,
            'url': $item.note.images_list[0].url,
            'collected_count': $item.note.collected_count,
            'shared_count': $item.note.shared_count,
            'comments_count': $item.note.comments_count,
            'likes_count': $item.note.liked_count
          }
          }\`,
          filter: "$.[?(@.note && (@.note.collected_count || 0) > 100 && (@.note.shared_count || 0) > 50 && (@.note.comments_count || 0) > 10 && (@.note.liked_count || 0) > 100)]"
        }
        输出结果不要包含行尾的行连接符斜杠，以免JSON.parse()解析失败。各个字段的值都不需要换行或换行符。
        extract字段中不要包含'|','||','?','??'这样的运算符，当前JSONata版本不支持，可以在extract使用$exists()，不过filter字段不可以使用$exists()。
        输出结果须是一个有效的JSON对象，且包含extract和filter两个字段。这个JSON对象需要能被JSON.parse()正确解析。
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

        // Invalid JSON, fallback to default
        response = await generateText({
          runtime,
          context: prompt + `\n\n上一个输出${response}有问题，不能正确JSON解析，请重新生成。`,
          modelClass: ModelClass.SMALL,
        });
        console.log(response);
        try {
          let json = null;
          const match = response.match(/```json\s*([\s\S]*?)```/);
          if (match) {
            const jsonString = match[1];
            response = JSON.parse(jsonString);
          }
          else {
            response = JSON.parse(response);
          }
          return { extract: json.extract, filter: json.filter };
        }
        catch (e) {
          console.error("Failed again to parse response:", e);
        }
      }
      //return {extract: response.extract, filter: response.filter};
    } catch (err) {
      console.log(err);
    }
    return {
      extract: `$map($, function($item) {
        {
          'id': $item.note.id,
          'author': $item.note.user.nickname,
          'title': $item.note.title,
          'description': $item.note.desc,
          'date': [$item.note.update_time, $item.note.timestamp, 0][0],
          'tags': $item.note.tag_info.title,
          'url': $item.note.images_list[0].url,
          'collected_count': $item.note.collected_count,
          'shared_count': $item.note.shared_count,
          'comments_count': $item.note.comments_count,
          'likes_count': $item.note.liked_count
        }
      }`,
      // Should be a online valid JSONPath expression
      filter: "$.[?(@.note && (@.note.collected_count || 0) > 100 && (@.note.shared_count || 0) > 50 && (@.note.comments_count || 0) > 10 && (@.note.liked_count || 0) > 100)]"
    };
  }

  static async getTimeStr(question) {
    let timestamp = "1734566400";
    const now = new Date();
    const hundredDaysAgo = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
    timestamp ="" + Math.floor(hundredDaysAgo.getTime() / 1000);

    const year = now.getFullYear();
    const month = now.getMonth();

    const strSpring = `${year}/02/03`;
    const dateSpring = new Date(strSpring);
    const timestampSpringInSec = Math.floor(dateSpring.getTime() / 1000);

    const strSummer = `${year}/05/05`;
    const dateSummer = new Date(strSummer);
    const timestampSummerInSec = Math.floor(dateSummer.getTime() / 1000);

    const strAutumn = `${year}/08/07`;
    const dateAutumn = new Date(strAutumn);
    const timestampAutumnInSec = Math.floor(dateAutumn.getTime() / 1000);

    let yearWinter = year;
    if(month <= 3) {
        yearWinter = yearWinter - 1;
    }
    const strWinter = `${yearWinter}/11/07`;
    const dateWinter = new Date(strWinter);
    const timestampWinterInSec = Math.floor(dateWinter.getTime() / 1000);

    const fourSeasonStr = `spring:${timestampSpringInSec}, summer:${timestampSummerInSec}, autumn:${timestampAutumnInSec}, winter:${timestampWinterInSec}`;
    // console.log("fourSeasonStr: \n " + fourSeasonStr);
    const prompttime = `你当前的任务是从用户的问题中计算出合适的时间戳。
    注意，你当前要处理的工作只是计算时间戳，请你算的精准一下。
    如果用户的问题没有提及时间，请你直接返回：no_time。
    如果用户的问题中提及时间，请你计算出开始的时间戳。
    规则如下：规则1，用户提及查询三周以内的数据，那么时间戳应该是三周前的时间。你先根据当前的时间，减去三周的时间，得到三周前的时间。
    规则2，​​如果用户没直接提到时间，而是提到了季节，季节对应时间如下：${fourSeasonStr}。
    今天的时间戳是（秒级）：[TODAY_TIMESTAMP: ${Math.floor(Date.now() / 1000)}]。
    这是用户的问题，[USER_QUESTION:${question}]\r\n.
    请你计算好之后直接返回开始的时间戳，或者返回 no_time。
    请你按照思路来计算时间戳，不要直接返回时间戳。
    为了方便我提取时间戳，请你先输出思考过程，最后输出时间戳，时间戳使用[]包裹, 比如[1734566400]或者[no_time。]。
    `;
    try {
      // const response = await generateText({
      //   runtime,
      //   context: prompttime,
      //   modelClass: ModelClass.LARGE,
      // });
      const response = await chatWithDeepSeek(prompttime);
      console.log("timestamp response:", response);
      const timestr = response.split('[')[1].split(']')[0];
      console.log("timestamp timestr:", timestr);
      if (!timestr?.includes("no_time")) {
        if (isUnixTimestamp(timestr)) {
          timestamp = timestr;
        }
      }
    } catch (err) {
      console.log("timestamp error:", err.message);
    }
    return timestamp;
  }

  static async genAIFilterPath(
    runtime: IAgentRuntime,
    message: Memory,
    inputJson: JSON,
    exception: string = ''
  ) {

    let timestamp = await IntentionHandler.getTimeStr(message.content.text);

    const filterPathExample = `$.[?(@.note && (@.note.collected_count || 0) >= 0 && (@.note.shared_count || 0) >= 0 && (@.note.comments_count || 0) >= 0 && (@.note.liked_count || 0) >= 1 && (@.note.timestamp || 2524579200) >= ${timestamp})]`;
    const filterPathExample1 = `$.[?(@.note_card && (@.note_card.interact_info.liked_count && parseInt(@.note_card.interact_info.liked_count) > 1) && parseDate(@.note_card.createTime || 2524579200) > ${timestamp})]`;
    //const filterPathExample2 = `$[?(parseInt(@.likedCount) >= 1 && parseInt(@.collectedCount) >= 0 && parseInt(@.sharedCount) >= 0 && parseInt(@.commentsCount) >= 0 && (parseDate(@.createTime) || 2524579200) > ${timestamp})]`;
    const filterPathExample2 = `$[?((@.likedCount && parseInt(@.likedCount) > 1) && (@.collectedCount && parseInt(@.collectedCount) >= 0) && (@.sharedCount && parseInt(@.sharedCount) >= 0) && (@.commentsCount && parseInt(@.commentsCount) >= 0) && (@.createTime && parseDate(@.createTime) > ${timestamp}))]`;

    const filterPathWrongExample = `$[?(parseInt(@.collectedCount || 0) >= 0 && parseInt(@.sharedCount || 0) >= 0 && parseInt(@.commentsCount || 0) >= 0 && parseInt(@.likedCount || 0) >= 1)]`;
    const filterPathWrongExample1 = `$[?((@.collectedCount || 0) >= 0 && (@.sharedCount || 0) >= 0 && (@.commentsCount || 0) >= 0 && (@.likedCount || 0) >= 1 && parseDate(@.createTime || 2524579200) >=  ${timestamp})]`;
    const filterPathWrongExample2 = `$.[?((@.likedCount && parseInt(@.likedCount) > 1) && (@.collectedCount && parseInt(@.collectedCount) >= 0) && (@.sharedCount && parseInt(@.sharedCount) >= 0) && (@.commentsCount && parseInt(@.commentsCount) >= 0) && (@.createTime && parseDate(@.createTime) > ${timestamp}))]`;
    const filterPathWrongExample3 = `$[?((@.commentsCount && parseInt(@.commentsCount) > 800) && (@.topics && @.topics[?(@.name.match(/泡泡玛特/))]))]`;
    const filterPathWrongExample4 = `$[?((@.likedCount && parseInt(@.likedCount) >= 1) && (@.sharedCount && parseInt(@.sharedCount) >= 0) && (@.commentsCount && parseInt(@.commentsCount) >= 0) && (@.topics && @.topics[?(@.name=="中考")]))]`;

    const prompt = `
        这是用户的问题，[USER_QUESTION:${message.content.text}]\r\n
        需要将给定JSON结构体[DATA_SOURCE: ${JSON.stringify([inputJson])}]进行按照条件过滤 filter；
        filter能给'jsonpath-plus'库(https://github.com/JSONPath-Plus/JSONPath)使用的JSONPath。
        生成这样表达式：[FILTER_EXAMPLE: ${filterPathExample};针对二级结构中的数字]或者[FILTER_EXAMPLE1: ${filterPathExample1}；针对二级结构中的string及时间串]
          或者[FILTER_EXAMPLE2: ${filterPathExample2}；针对一级结构中的string及时间串]。
        另外错误的表达式有：[${filterPathWrongExample}；针对二级结构中的string]或者[${filterPathWrongExample1}；针对二级结构中的string]
          或者[${filterPathWrongExample2}；针对二级结构中的string]或者[${filterPathWrongExample3}；不要对文字进行比较或匹配]
          或者[${filterPathWrongExample4}；不要对文字进行比较]
        请认真分析这几个表达式，理解其含义，不同的表达式适用于不同的JSON结构体。
        根据指令要求，需要对collected_count/shared_count/comments_count/likes_count的数量进行过滤。
        用户要求的时间戳 [timestamp: ${timestamp}], 这是在之前的步骤中计算好的, 不需要再做转化，填入表达式中即可 。
        - filter添加存在性检查（@.note && ...）, filter只需进行数量的过滤。
        如果用户的输入DATA中不包含timestamp（publish_time这样的不是），则忽略时间过滤。
        表达式中不要使用new Date()或Date.parse()或match()，当前版本不支持, 可以使用parseDate()。
        你返回的表达式将会插入代码中直接运行，请你一定要直接返回表达式。不要返回其他值，也不要做额外解释。`;
    try {
      console.log("timestamp prompt: ", timestamp);
      // let response = await chatWithDeepSeek(prompt);
      let response = await generateText({
        runtime,
        context: prompt,
        modelClass: ModelClass.LARGE,
      });
      console.log(` \n ---------------------JSONPATH-AI-FILTER-BEGIN-------------------- \n${response}\n ---------------------JSONPATH-AI-FILTER-END---------------------- `);
      return response;
    } catch (err) {
      console.log(err);
    }
    return filterPathExample;
  }

  static async genAIExtraPath(
    runtime: IAgentRuntime,
    message: Memory,
    inputJson: JSON,
    exception: string = ''
  ) {
    let extractPathExample = `$map($, function($item) {
        {   'id': $item.note.id,
            'author': $item.note.user.nickname,
            'title': $item.note.title,
            'description': $item.note.desc,
            'date': [$item.note.timestamp, 0][0],
            'tags': $item.note.tag_info.title,
            'url': $item.note.images_list[0].url,
            'collected_count': $item.note.collected_count,
            'shared_count': $item.note.shared_count,
            'comments_count': $item.note.comments_count,
            'liked_count': $item.note.liked_count
        }
        })`;
    const prompt = `
        这是用户的问题，[USER_QUESTION:${message.content.text}]\r\n
        需要将给定JSON结构体[DATA_EXAMPLE: ${JSON.stringify([inputJson])}]进行按照条件进行字段映射（结构精简和结构转化）；
        extract能够使用JSONata(https://github.com/jsonata-js/jsonata)的jsonata(extract)进行解析，
        生成这个表达式：[EXTRACT_EXAMPLE: ${extractPathExample}]
        转换后的结果需要至少包含这些字段：
        {
          id, author, title, content/desc/description, date/timestamp, url,
          collected_count, shared_count, comments_count, likes_count
        }，这些字段可以是原有字段的组合或转换。其中，id是唯一标识符，author是作者，title是标题，content/desc/description是内容描述。
        extract字段中不要包含'|','||','?','??'这样的运算符，当前JSONata版本不支持，可以在extract使用$exists()。
        主要是结构精简和转换。
        只做映射，不要对collected_count，shared_count，comments_count，likes_count，date 等进行额外的筛选。
        只做映射，不要筛选。
        只做映射，原来是几条数据，映射后还是几条数据。
        你返回的表达式将会插入代码中直接运行，请你一定要直接返回表达式。不要返回其他值，也不要做额外解释。`;

    try {
      // let response = await chatWithDeepSeek(prompt);
      let response = await generateText({
        runtime,
        context: prompt,
        modelClass: ModelClass.LARGE,
      });
      console.log(` \n ---------------------JSONATA-AI-EXTRA-BEGIN-------------------- \n${response}\n ---------------------JSONATA-AI-EXTRA-END---------------------- `);
      return response;
    } catch (err) {
      console.log(err);
    }
    return extractPathExample;
  }

  static async flatJsonObject(
    runtime: IAgentRuntime,
    message: Memory,
    inputJson: JSON,
    exception: string = ''
  ) {
    let flatExample = `
      $map($, function($item) {
        {
          'id': $item.id,
          'userid': $item.user.userid,
          'username': $item.user.nickname,
          'content': $item.content,
          'like_count': $item.like_count,
          'time': $item.time,
          'ip_location': $item.ip_location,
          'sub_comments': [$map($item.sub_comments, function($sc) {
            {
              'id': $sc.id,
              'content': $sc.content,
              'like_count': $sc.like_count,
              'username': $sc.user.nickname,
              'userid': $sc.user.userid,
              'time': $sc.time,
              'ip_location': $sc.ip_location
            }
          }), 'empty'][0]
        }
      })`;
    const prompt = `
        这是用户的问题，[USER_QUESTION:${message.content.text}]\r\n
        需要将给定JSON结构体[DATA_EXAMPLE: ${JSON.stringify([inputJson])}]进行按照条件进行字段映射（结构精简和结构转化）；
        Flat能够使用JSONata(https://github.com/jsonata-js/jsonata)的jsonata(flat)进行解析，
        生成这个表达式：[EXTRACT_EXAMPLE: ${flatExample}]
        转换后的结果需要至少包含这些字段：
        {
          id, time, content, ......
        }，这些字段可以是原有字段的组合或转换。其中，id是唯一标识符，content/desc/description是内容。
        flat字段中不要包含'|','||','?','??'这样的运算符，当前JSONata版本不支持，可以在flat使用$exists()。
        主要是结构精简和转换。只做映射，不要筛选。
        只做映射，原来是几条数据，映射后还是几条数据。
        你返回的表达式将会插入如下代码: {
          const expression = jsonata(flat);
          result = await expression.evaluate(inputJson);
        }中直接运行，这里的result是一个只有单层元素的FlatJSON对象；一定要直接返回表达式。不要返回其他值，也不要做额外解释。
    `;

    try {
      let response = await generateText({
        runtime,
        context: prompt,
        modelClass: ModelClass.LARGE,
      });
      console.log(`\n${response}\n`);
      return response;
    } catch (err) {
      console.log(err);
    }
    return flatExample;
  }

  /**
   * 
   * @param {string} 
   * @returns {Promise<string>[]} 
   */
  static async handleDataHub(
    runtime: IAgentRuntime,
    message: Memory
  ): Promise<string> {
    let data_platform = '';
    const analysisJson = await this.analysisDataPlatform(runtime, message);
    if (analysisJson && analysisJson.platform && analysisJson.platform != 'others') {
      data_platform = analysisJson.platform;
    }
    else if (analysisJson && analysisJson.platform == 'others') {
      data_platform = '';
    }
    if (!data_platform || data_platform == '') {
        const data_result = "哎呀，无法获知你要操作的数据平台，请明确说明，或回复【人工】获取支持~";
        const analysisJson = {
          data_result: data_result,
          intention_options: [],
        };
        return JSON.stringify(analysisJson);
    }
    const my_data_source = await ApiDb.getUserDataSource(data_platform, message.userId);
    const prompt = `
      你是一个程序员兼产品经理，能根据用户的请求，提取出其数据获取需求，并根据可用API列表给出其需要调用的API。
      主要有如下一些情况：
        (1). 如果用户的输入里，有进行数据获取的需求，则将这些需求以data_params的形式输出出来。
        (2). 如果用户的输入里，不包含数据获取的内容，则参考上下文给出简短回答。
        (5). 如果用户需要获取的数据在可用数据源${my_data_source}里不存在，则data_result须提示用户不存在这些数据，稍后会提供，请用户耐心等待；此时data_params为空。
      用户输入：${message.content.text}。
      可用数据源/数据获取API：${my_data_source}。
      -----------------------------
      你需要输出如下：
      {
        "data_params": {
          "data_source": "rednote",
          "data_action": "notes_search",
        },
        "data_result": "简短任务描述，不是结果描述"
      }
      输出须是一个标准的JSON格式，能够使用JSON.parse()进行解析。
      data_result不要包含API/接口字样，需要使用非开发人员能够理解的语言，只是任务描述，不是数据结果。
      data_action的可选项是各个可用的API列表中的关键字，如果不在这个列表里，输出为others。
      -----------------------------
    `;
    try {
      let response = await generateText({
        runtime,
        context: await UserKnowledge.composePrompt(runtime, prompt, message.userId),
        modelClass: ModelClass.LARGE,
      });
      console.log(response);
      let execJson = extractJson(response);
      const taskId = message.content.intention?.taskId || "";
      if (execJson && execJson.data_params) {
        let execParam = execJson.data_params;
        if (execParam.data_action && execParam.data_action != 'others') {
          const api = await ApiDb.getApi(execParam.data_action);
          let json = await ApiExecution.getApiQueryParam(runtime, message, api, '');
          if (json) {
            execJson.data_result = await ApiExecution.executeApiRaw(runtime, message, api);
          }
        }
        execJson.taskId = taskId;
      }
      else if (execJson) {
        execJson.taskId = taskId;
      }
      else {
        execJson = response;
      }
      return execJson;
    } catch (err) {
      console.log(err);
    }
  }

  static flattenJSON(obj: any,
    prefix = '',
    result: Record<string, any> = {}
  ): Record<string, any> {
    if (typeof obj !== 'object' || obj === null) {
      result[prefix] = obj;
      return result;
    }

    const isArray = Array.isArray(obj);

    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;

      const value = obj[key];
      const newKey = isArray
        ? `${prefix}[${key}]`
        : prefix
          ? `${prefix}.${key}`
          : key;

      if (typeof value === 'object' && value !== null) {
        this.flattenJSON(value, newKey, result);
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }
}


function isUnixTimestamp(str) {
  if (typeof str !== "string" || str.length !== 10) {
    return false;
  }

  if (!/^\d+$/.test(str)) {
    return false;
  }

  const timestamp = parseInt(str, 10);
  const minTimestamp = 0; // 1970-01-01
  const maxTimestamp = 4102444800; // 2100-01-01

  if (timestamp < minTimestamp || timestamp > maxTimestamp) {
    return false;
  }

  const date = new Date(timestamp * 1000);
  return !isNaN(date.getTime());
}

