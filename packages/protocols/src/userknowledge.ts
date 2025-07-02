// API Tabls.ts
import {
  ModelClass,
  Memory,
  UUID,
  composeContext,
  generateText,
  stringToUuid,
  type IAgentRuntime,
} from "@data3os/agentcontext";


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

const USER_KNOWLEDGE_CACHE = "_user_knowleage_on_id_";

export class UserKnowledge {

  constructor() {}

  private static async readFromCache<T>(runtime: IAgentRuntime, key: string): Promise<T | null> {
    const cached = await runtime.cacheManager.get<T>(key);
    return cached;
  }

  private static async writeToCache<T>(runtime: IAgentRuntime, key: string, data: T): Promise<void> {
    try {
      await runtime.cacheManager.set(key,
        data,
        {
          expires: 0, // long time
        }
      );
    }
    catch (err) {
      console.log(`writeToCache key ${key}`);
      console.error(err);
    }
  }

  private static async getCachedData<T>(runtime: IAgentRuntime, key: string): Promise<T | null> {
    const fileCachedData = await this.readFromCache<T>(runtime, key);
    if (fileCachedData) {
      return fileCachedData;
    }

    return null;
  }

  private static async setCachedData<T>(runtime: IAgentRuntime, cacheKey: string, data: T): Promise<void> {
    await this.writeToCache(runtime, cacheKey, data);
  }

  static async setUserKnowledge(runtime: IAgentRuntime, userId: string, data: string) {
    try {
      await this.setCachedData(runtime, USER_KNOWLEDGE_CACHE + userId, data);
    }
    catch (err) {
      console.log(`setUserKnowledge ${userId}`);
      console.error(err);
    }
  }

  static async getUserKnowledge(runtime: IAgentRuntime, userId: string): Promise<string> {
    try {
      return await this.getCachedData(runtime, USER_KNOWLEDGE_CACHE + userId);
    }
    catch (err) {
      console.log(`getUserKnowledge ${userId}`);
      console.error(err);
    }
    return "";
  }

  // Get User Intentions By UserId
  static getUserIntentionExamples(userId: UUID) {
    const intentionNote = [
      '1. 剖析这些爆文是怎样的结构',
      '2. 剖析这些爆文的标题是怎么写的',
      '3. 解构这些数据中前5个爆文',
      '4. 找出这些数据中点赞次数最多的5篇，对比剖析其互动率',
      '5. 找出这些数据中转发次数最多的5篇，对比阐释其互动率',
      '6. 找出这些数据中收藏次数最多的5篇，对比分析其互动率',
      '7. 推演预测下周可能会火的内容方向',
      '8. 分析帖子/笔记内容是否以“口播/图文/Vlog”为主',
      '9. 洞察这些帖子/笔记封面图/构图是否有共性',
      '10. 洞察这些帖子/笔记中哪类标题格式获得了较高的互动',
      '11. 启发选题建议',
      '12. 给出发布时段建议',
      '13. 推演话题标签组合',
      '14. 透视话术风格',
      '15. 给出可交叉组合的话题/元素',
      '16. 思辨并仿写这个帖子',
      '17. 将帖子/笔记分为不同类型（如：种草/教程/测评/合集类）',
      '18. 给出标题结构',
      '19. 封面设计剖析',
      '20. 文案构造剖析',
      '21. 总结可模仿的内容（如：标题模板、内容场景、内容文案、标签组合、发布时间），溯源说明原因',
      '22. 推演内容未覆盖的机会点（如缺乏情绪向内容/缺少新品对比测评），并阐释原因',
      '23. 重构我的笔记',
      '24. 在我的笔记里加入【****】元素',
      '25. 将我的产品与【****】热点融合起来',
      '26. 给出热词Tag列表',
      '27. 结合我的笔记，推演如何比他们发的内容点赞高'
    ];
    const intentionComment = [
      '1. 剖析这些帖子的评论是怎么布局的',
      '2. 分析这些帖子的评论是否有挂商品链接/外链/商链',
      '3. 阐释这些爆文/帖子/视频的互动率是怎样的',
      '4. 给出高赞的评论内容',
      '5. 透视这篇帖子的评论主要话题是什么',
      '6. 透视这些帖子的评论里，用户关心的是‘价格’还是‘使用体验’',
      '7. 提取这些评论中【5/10】个热门的关键字',
      '8. 透视剖析这些评论的主要几种情绪',
      '9. 推演阐释这些评论的几种主要意图',
      '10. 推演这些评论里是否有购买咨询或相关意图',
      '11. 剖析评论区的主要互动方式是什么',
      '12. 拆解推演其爆款原因：是否为话题+人设+品牌+场景+评论运营等组合驱动'
    ];
    const intentionUser = [
      '1. 账号在一周内/一天内的发帖时间统计',
      '2. 分析哪个时间发布频次高',
      '3. 剖析用户发帖是否存在特定时间节点与活动节奏',
      '4. 生成发布频率热力图',
      '5. 整理其发布频率表',
      '6. 洞察账号的灵感库',
      '7. 找到其近30天内互动表现Top10的内容',
      '8. 根据达人内容和互动质量，推演评估达人的合作优先级',
      '9. 剖析达人近10条内容类型分布（种草/教程/测评/生活Vlog）',
      '10. 阐释标题关键词与话题倾向（情绪型？功能型？口语化？）',
      '11. 透视图文风格（是否注重视觉 / 使用滤镜统一 / 有生活感等等）',
      '12. 分析是否推广过与我的产品相似的品牌/内容',
      '13. 剖析达人是否存在“点赞高评论低”的刷赞嫌疑',
      '14. 根据我的产品生成打招呼的内容，口吻自然、轻松、不带强推感',
      '15. 根据我的产品和预算情况【****】生成打招呼的内容'
    ];
    return `笔记类：[${intentionNote.join(", ")}], 评论类：[${intentionComment.join(", ")}], 达人类：[${intentionUser.join(", ")}]`;
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
    console.debug("userMessage: ", userMessage, userId);

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
}
