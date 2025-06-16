// intention.ts
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
import APIWrapperFactory from "./apiwrapper";
import { extractJson } from "./utils"


export const dataHandlerTemplate = `
##
Some additional information about the task:
#####################################
# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

{{recentMessages}}
#####################################
`;

export class IntentionHandler {
  runtime: IAgentRuntime = null;
  message: Memory = null;

  constructor() {}

  /**
   * 
   * @param {string} 
   * @returns {Promise<string>[]} 
   */
  static async handleDataCollect(
    runtime: IAgentRuntime,
    message: Memory
  ): Promise<string> {
    const intention_examples = IntentionHandler.getMyIntentionExamples(message.userId);
    console.log(intention_examples);
    const my_data_platform = IntentionHandler.getMyDataPlatform(message.userId);
    const my_data_source = IntentionHandler.getMyDataSource(message.userId);
    const my_data_bucket = await IntentionHandler.getMyDataBucket(message.userId);
    const prompt = `
      你是一个数据获取专家，进行数据API调用的程序员，能够基于用户的输入，找到合适的可调用的API，并将API的结果集根据用户的需求进行过滤、精简、排序等一系列的操作，从而输出给用户结构化的，满足用户要求的数据。
      主要有如下一些情况：
        (1). 如果用户的输入里，除了有进行数据获取的需求外，还有其他需求，则将这些需求以意图选项的形式输出出来。
        (2). 如果用户的输入里，不包含数据获取的内容，则将这些内容进行拆解，找到其中的意图选项，输出出来。
        (3). 如果用户的输入里，既不包含数据获取需求，也没有明确的数据处理意图，也无其他意图，则参考最近的消息，给出相关的意图选项。
        (4). 如果用户的输入跟数据获取或数据处理都没有关系，则参考上下文给出简短回答，且不需要意图选项。
      用户输入：${message.content.text}.
      可用数据平台：${my_data_platform}
      可用数据获取API：${my_data_source}
      各个API的数据结果示例：${my_data_bucket}
      -----------------------------
      你需要输出如下：
      {
        "intention_params": [
        {
          "data_source": "rednote",
          "data_action": "notes_search",
          "keyword": "search key",
          "request_count": 100,
          "filter_desc": "the description of the data filter"
        }],
        "data_result": "简短回答",
        "intention_options": ["使用数据的意图1", "使用数据的意图2", "......"],
      }
      输出须是一个标准的JSON格式，能够使用JSON.parse()进行解析。
      intention_params是一个数组，如果不能通过一种操作获得需要的数据，则需要是多个。
      data_result不要包含API/接口字样，需要使用非开发人员能够理解的语言。
      data_action的可选项是各个可用的API列表my_data_source中的关键字，如果不在这个列表里，输出为others。
      intenton_options是根据用户输入而得出的选项，以用户明确输入的选项为优先，
          且结合用户自身的产品和背景（不要有‘搜索小红书笔记’这样的选项，需要是‘搜索小红书关于***的笔记’），
          其数量约为1~5个，其常用示例如下：【${intention_examples}】；
      -----------------------------
    `;
    try {
      let response = await generateText({
        runtime,
        context: await IntentionHandler.composePrompt(runtime, prompt, message.userId),
        modelClass: ModelClass.LARGE,
      });
      console.log(response);
      //response = response.replace(/```json/g, "") .replace(/```/g, "");
      let execJson = extractJson(response);
      const txtfilelist = [];
      const excelfilelist = [];
      const results = [];
      const taskId = message.content.intention?.taskId || "";
      if (execJson && execJson.intention_params && execJson.intention_params.length > 0) {
        for (const execParam of execJson.intention_params) {
          if (execParam.data_action && execParam.data_action != 'others') {
            const {result, txtfilename, excelfilename} = await APIWrapperFactory.executeRequest(
              runtime, execParam, message);
            if (result && result.length > 0) {
              results.push(result);
            }
            if (txtfilename) {
              txtfilelist.push(txtfilename);
            }
            if (excelfilename) {
              excelfilelist.push(excelfilename);
            }
            //const filename = taskId + "_raw_data1.txt";
            //appendToChatCache(result, filename, (err) => {
            //  console.error("Custom error handling:", err);
            //});
          }
        }
        // execJson.data_result = "";
        // execJson.data_result += getDynamicTail(taskId);
        if (results.length > 0 && txtfilelist.length > 0) {
          execJson.data_result += getDynamicTail(txtfilelist, excelfilelist);
        }
        else {
          execJson.data_result = "哎呀，这个数据源我暂时无法获取，你可以稍后重试，或回复【人工】联系工程师帮你添加支持~";
          execJson.intention_options = [];
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
    const attachment = IntentionHandler.getTaskAttachment(taskId);
    const prompt = `
      你是一个数据处理专家，能根据输入的多个结构的数据/文件进行加工、处理、分析、预测的专家，能够基于用户的多轮输入，将数据处理成用户需要的结果。
      主要有如下一些情况：
      (1). 根据用户要求和附带的数据，如果能够直接给出处理结果，则输出Markdown形式的分析结果。优先以这种情况进行处理。
      (2). 如果用户的需求不是一个数据处理的需求，而是一个数据获取的需求，则给出如下结果：
        {
          "intention_action": "data_collection",
          "origin_input": "${origin_input}",
          "intention_desc": "${message.content.text}",
          "attachment": "{attachment}",
        }.
      (3). 如果需求比较模糊，则可以给出可供选择的一些选项，让用户进行二次选择，以明确其需求。这种情况的输出为一个可解析的JSON结果，如下：
        {
          "question_description": "相关的描述",
          "intention_options": ["进一步的意图1", "进一步的意图2", "......"],
          "taskId": "${taskId}"
          ......
        }
      (4). 如果用户的需求比较复杂，当前的数据无法满足处理的需求，则需要告知用户缺少什么数据导致无法给出理想结果，并给出intention_options让用户决定是否进一步获取数据。输出结构同(3).
      (5). 如果用户的输入里，既不包含数据获取需求，也没有明确的数据处理意图，也无其他意图，则参考最近的消息，给出相关的意图选项。输出结构同(3).
      (6). 如果用户的输入（${message.content.text}）明显与前置描述（${origin_input}）及数据处理无关，则只需给出一个文字回复。
      关于(3)(4)(5)中的intention_options，是根据用户输入而得出的选项，以用户明确输入的选项为优先，其次以示例中的选项为优先，
          且结合用户自身的产品和背景（不要有‘报告生成’这样的宽泛选项，不要有‘分析这些笔记’这样的模糊选项，需要是‘分析这些笔记关于***的特征’）
      -----------------------------
      用户需求：${message.content.text}, 前置描述：${origin_input}.
      待处理数据内容：${attachment}
    `;
    try {
      let response = await generateText({
        runtime,
        context: await IntentionHandler.composePrompt(runtime, prompt, message.userId),
        modelClass: ModelClass.LARGE,
      });
      console.log(response);
      //response = response.replace(/```json/g, "") .replace(/```/g, "");
      let execJson = extractJson(response);
      if (execJson) {
        if (execJson.intention_action && execJson.intention_action === "data_collection") {
          return await IntentionHandler.handleDataCollect(
            runtime, message
          );
        }
        if (execJson.question_description) {
          return JSON.stringify(execJson);
        }
      }
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
          return {extract: json.extract, filter: json.filter};
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
  ): Promise<{extract: string, filter: string}> {
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
          return {extract: json.extract, filter: json.filter};
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

  static async composePrompt(
    runtime: IAgentRuntime,
    prompt: string,
    userId: UUID
  ): Promise<string> {
    const roomId = stringToUuid("default-data-room-" + userId);
    if (!runtime) {
      throw new Error("Agent not found");
    }
    const userMessage = {
      content: { text: prompt },
      userId,
      roomId,
      agentId: runtime.agentId,
    };
    console.log("userMessage: ", userMessage, userId);

    return (
      prompt +
      composeContext({
        state: await runtime.composeState(userMessage, {
          agentName: runtime.character.name,
        }),
        template: dataHandlerTemplate,
      })
    );
  }

  static getTaskAttachment(taskId: string) {
    let attachment = readCacheFile(taskId + "_data.txt");
    if (!attachment || attachment.length < 1) {
      attachment = readCacheFile(taskId + "_raw_data.txt");
      if (!attachment || attachment.length < 1) {
        attachment = readCacheFile(taskId + "_raw_data1.txt");
        if (attachment) {
          attachment = attachment + readCacheFile(taskId + "_raw_data2.txt");
        }
      }
    }
    return attachment;
  }

  static getMyDataPlatform(userId: UUID) {
    const platforms = ["小红书", "RedNote"];
    return platforms;
  }

  static getMyDataSource(userId: UUID) {
    const sources = [
      'notes_search: 用以通过关键字搜索小红书笔记/帖子/note，获得note列表',
      'users_search: 用以通过关键字搜索小红书账号，获得账号列表',
      'get_user: 用以通过单个小红书账号ID获取该账号的详情',
      //'hot_words: 用以获得近期火热的热词等',
      //'hot_topics: 用以获得近期火热的话题/种类等',
      'notes_comment_by_next_page: 用以通过单个笔记/帖子的ID获取其评论列表',
      'fetch_comments_by_keyword: 用以通过关键字搜索小红书笔记/帖子/note，获得note id列表，然后再获得这些笔记的评论列表；该操作能获得评论这一种数据',
      'fetch_notes_and_comments_by_keyword: 用以通过关键字搜索小红书笔记/帖子/note，获得note列表，然后再获得这些笔记的评论列表；该操作能获得笔记和评论两种数据',
      'get_note_list: 用以通过单个小红书账号ID获取该账号的笔记/帖子的列表'
    ];
    return sources;
  }

  static getMyIntentionExamples(userId: UUID) {
    const intentionNote = [
      '1. 分析这些爆文是怎样的结构',
      '2. 分析这些爆文的标题是怎么写的',
      '3. 分析前5个爆文',
      '4. 找出点赞次数最多的5篇，对比其互动率',
      '5. 找出转发次数最多的5篇，对比其互动率',
      '6. 找出收藏次数最多的5篇，对比其互动率',
      '7. 预测下周可能会火的内容方向',
      '8. 分析帖子/笔记内容是否以“口播/图文/Vlog”为主',
      '9. 分析这些帖子/笔记封面图/构图是否有共性',
      '10. 分析这些帖子/笔记中哪类标题格式获得了较高的互动',
      '11. 给出选题建议',
      '12. 给出发布时段建议',
      '13. 给出话题标签组合',
      '14. 给出话术风格',
      '15. 给出可交叉组合的话题/元素',
      '16. 仿写这个帖子',
      '17. 将帖子/笔记分为不同类型（如：种草/教程/测评/合集类）',
      '18. 给出标题结构',
      '19. 封面设计分析',
      '20. 文案构造分析',
      '21. 总结可模仿的内容（如：标题模板、内容场景、内容文案、标签组合、发布时间），说明原因',
      '22. 分析内容未覆盖的机会点（如缺乏情绪向内容/缺少新品对比测评），说明原因',
      '23. 重构我的笔记',
      '24. 在我的笔记里加入【****】元素',
      '25. 将我的产品与【****】热点融合起来',
      '26. 给出热词Tag列表',
      '27. 结合我的笔记，为何比如他们发的内容点赞高'
    ];
    const intentionComment = [
      '1. 分析这些帖子的评论是怎么布局的',
      '2. 分析这些帖子的评论是否有挂商品链接/外链/商链',
      '3. 分析这些爆文/帖子/视频的互动率是怎样的',
      '4. 给出高赞的评论内容',
      '5. 给出这篇帖子的评论主要话题是什么',
      '6. 分析这些帖子的评论里，用户关心的是‘价格’还是‘使用体验’',
      '7. 提取这些评论中【5/10】个热门的关键字',
      '8. 分析一下这些评论的主要几种情绪',
      '9. 分析一下这些评论的几种主要意图',
      '10. 分析这些评论里是否有购买咨询或相关意图',
      '11. 给出评论区的主要互动方式是什么',
      '12. 拆解其爆款原因：是否为话题+人设+品牌+场景+评论运营等组合驱动'
    ];
    const intentionUser = [
      '1. 账号在一周内/一天内的发帖时间进行统计',
      '2. 分析哪个时间发布频次高',
      '3. 分析用户发帖是否存在特定时间节点与活动节奏',
      '4. 生成发布频率热力图',
      '5. 整理其发布频率表',
      '6. 分析账号的灵感库',
      '7. 找到其近30天内互动表现Top10的内容',
      '8. 根据达人内容和互动质量，评估达人的合作优先级',
      '9. 分析达人近10条内容类型分布（种草/教程/测评/生活Vlog）',
      '10. 分析标题关键词与话题倾向（情绪型？功能型？口语化？）',
      '11. 分析图文风格（是否注重视觉 / 使用滤镜统一 / 有生活感等等）',
      '12. 分析是否推广过与我的产品相似的品牌/内容',
      '13. 达人是否存在“点赞高评论低”的刷赞嫌疑',
      '14. 根据我的产品生成打招呼的内容，口吻自然、轻松、不带强推感',
      '15. 根据我的产品和预算情况【****】生成打招呼的内容'
    ];
    return `笔记类：[${intentionNote.join(", ")}], 评论类：[${intentionComment.join(", ")}], 达人类：[${intentionUser.join(", ")}]`;
  }

  static async getMyDataBucket(userId: UUID) {
    const buckets = [
      {
			'model_type': 'note',
			'note': {
				'tag_info': {
					'type': '',
					'title': ''
				},
				'timestamp': 1715940777,
				'desc': '1、比别人更年轻 2、提升记忆力 3、身体不容易发福 4、没有蛀牙 葡萄酒再好，也不要贪杯喔 #葡萄酒  #今夜来一杯微',
				'result_from': '',
				'shared_count': 57,
				'title': '晚上喝红酒，到底好不好！',
				'has_music': false,
				'last_update_time': 1716043421,
				'collected_count': 187,
				'comments_count': 79,
				'id': '66472da90000000005006256',
				'widgets_context': '{"flags":{},"author_id":"63bd42cd000000002600710d","author_name":"念微醺"}',
				'collected': false,
				'nice_count': 0,
				'niced': false,
				'liked': false,
				'debug_info_str': '',
				'advanced_widgets_groups': {
					'groups': [{
						'mode': 1,
						'fetch_types': ['guos_test', 'note_next_step', 'second_jump_bar', 'cooperate_binds', 'note_collection', 'rec_next_infos', 'image_stickers', 'image_filters', 'product_review', 'related_search', 'cooperate_comment_component', 'image_goods_cards', 'ads_goods_cards', 'ads_comment_component', 'goods_card_v2', 'image_template', 'buyable_goods_card_v2', 'ads_engage_bar', 'challenge_card', 'cooperate_engage_bar', 'guide_post', 'pgy_comment_component', 'pgy_engage_bar', 'bar_below_image', 'aigc_collection', 'co_produce', 'widgets_ndb', 'next_note_guide', 'pgy_bbc_exp', 'async_group', 'super_activity', 'widgets_enhance', 'music_player', 'soundtrack_player']
					}, {
						'mode': 0,
						'fetch_types': ['guos_test', 'vote_stickers', 'bullet_comment_lead', 'note_search_box', 'interact_pk', 'interact_vote', 'guide_heuristic', 'share_to_msg', 'follow_guide', 'note_share_prompt_v1', 'sync_group', 'group_share', 'share_guide_bubble', 'widgets_share', 'guide_navigator']
					}]
				},
				'interaction_area': {
					'status': false,
					'text': '772',
					'type': 1
				},
				'update_time': 1719318002000,
				'type': 'normal',
				'images_list': [{
					'url_size_large': 'http://sns-na-i3.xhscdn.com/1040g2sg312t6i5tg3s6g5ott8b6pgs8deglmn60?imageView2/2/w/1080/format/webp&ap=5&sc=SRH_DTL',
					'original': '',
					'trace_id': '1040g2sg312t6i5tg3s6g5ott8b6pgs8deglmn60',
					'need_load_original_image': false,
					'fileid': '1040g2sg312t6i5tg3s6g5ott8b6pgs8deglmn60',
					'height': 2560,
					'width': 1920,
					'url': 'http://sns-na-i3.xhscdn.com/1040g2sg312t6i5tg3s6g5ott8b6pgs8deglmn60?imageView2/2/w/540/format/jpg/q/75%7CimageMogr2/strip&redImage/frame/0&ap=5&sc=SRH_PRV'
				}, {
					'url': '',
					'url_size_large': 'http://sns-na-i3.xhscdn.com/1040g2sg312t6i5tg3s605ott8b6pgs8d397eqn0?imageView2/2/w/1080/format/webp&ap=5&sc=SRH_DTL',
					'original': '',
					'trace_id': '1040g2sg312t6i5tg3s605ott8b6pgs8d397eqn0',
					'need_load_original_image': false,
					'fileid': '1040g2sg312t6i5tg3s605ott8b6pgs8d397eqn0',
					'height': 2560,
					'width': 1920
				}, {
					'trace_id': '1040g2sg312t6i5tg3s5g5ott8b6pgs8dcmspdfo',
					'need_load_original_image': false,
					'fileid': '1040g2sg312t6i5tg3s5g5ott8b6pgs8dcmspdfo',
					'height': 2560,
					'width': 1920,
					'url': '',
					'url_size_large': 'http://sns-na-i3.xhscdn.com/1040g2sg312t6i5tg3s5g5ott8b6pgs8dcmspdfo?imageView2/2/w/1080/format/webp&ap=5&sc=SRH_DTL',
					'original': ''
				}, {
					'need_load_original_image': false,
					'fileid': '1040g2sg312t6i5tg3s505ott8b6pgs8drro2pfg',
					'height': 2560,
					'width': 1920,
					'url': '',
					'url_size_large': 'http://sns-na-i3.xhscdn.com/1040g2sg312t6i5tg3s505ott8b6pgs8drro2pfg?imageView2/2/w/1080/format/webp&ap=5&sc=SRH_DTL',
					'original': '',
					'trace_id': '1040g2sg312t6i5tg3s505ott8b6pgs8drro2pfg'
				}],
				'abstract_show': '晚上喝红酒，到底好不好！😮…#美容养颜 #葡萄酒 #今夜来一杯微醺酒 #适合女生喝的酒 #红酒 #健康生活',
				'liked_count': 772,
				'cover_image_index': 0,
				'corner_tag_info': [{
					'text_en': '',
					'style': 0,
					'location': -1,
					'type': 'ubt_sig_token',
					'icon': '',
					'text': 'RAEC2QLKIeYTlcAsExNeHdaHL/Z4lnWZYpVDPWphUZZ9j+Ru5J/iEl68wXRXMb4vFTbOxXfbYC6Z5IUS5iQqstyiIQ/6nu1uhB'
				}, {
					'type': 'publish_time',
					'icon': 'http://picasso-static.xiaohongshu.com/fe-platform/e9b67af62f67d9d6cfac936f96ad10a85fdb868e.png',
					'text': '2024-05-18',
					'text_en': '2024-05-18',
					'style': 0,
					'location': 5
				}],
				'extract_text_enabled': 0,
				'user': {
					'red_id': '6732656693',
					'red_official_verify_type': 0,
					'red_official_verified': false,
					'track_duration': 0,
					'followed': false,
					'nickname': '念微醺',
					'images': 'https://sns-avatar-qc.xhscdn.com/avatar/1040g2jo310gpa3oq6e5g5ott8b6pgs8dbod8ku8?imageView2/2/w/80/format/jpg',
					'show_red_official_verify_icon': false,
					'userid': '63bd42cd000000002600710d'
				},
				'geo_info': {
					'distance': ''
				},
				'note_attributes': []
			}
    },
      {
                "score": 57, 
                "status": 0, 
                "sub_comments": [
                    {
                        "user": {}, 
                        "comment_type": 0, 
                        "note_id": "66472da90000000005006256", 
                        "score": -4, 
                        "friend_liked_msg": "", 
                        "text_language_code": "zh-Hans", 
                        "content": "喜欢偏甜还是喜欢酸涩感强一些的呢", 
                        "at_users": [ ], 
                        "show_type": "common", 
                        "show_tags": [1], 
                        "target_comment": {}, 
                        "id": "6729b4c0000000001b003a28", 
                        "like_count": 0, 
                        "liked": false, 
                        "hidden": false, 
                        "status": 0, 
                        "time": 1730786497, 
                        "biz_label": {}
                    }
                ], 
                "user": {
                    "images": "https://sns-avatar-qc.xhscdn.com/avatar/5bd3147724952a0001b9804b.jpg?imageView2/2/w/120/format/jpg", 
                    "red_id": "620372106", 
                    "level": {
                        "image": ""
                    }, 
                    "additional_tags": { }, 
                    "ai_agent": false, 
                    "userid": "5bd313d73a2b6700015ef04c", 
                    "nickname": "Chachaxxzzz"
                }, 
                "track_id": "interaction-service.local", 
                "friend_liked_msg": "", 
                "at_users": [ ], 
                "liked": false, 
                "text_language_code": "zh-Hans", 
                "time": 1730261197, 
                "biz_label": {
                    "product_review": false, 
                    "group_invite": "false", 
                    "rich_text": "unknown"
                }, 
                "sub_comment_cursor": "{\"cursor\":\"6729b4c0000000001b003a28\",\"index\":1}", 
                "content": "有红酒推荐吗？价格不要太高", 
                "like_count": 2, 
                "show_tags": [ ], 
                "show_type": "common", 
                "comment_type": 0, 
                "hidden": false, 
                "sub_comment_count": 10, 
                "id": "6721b0cd00000000170248d5", 
                "note_id": "66472da90000000005006256"
            },

    ];
    return buckets;
  }
}
