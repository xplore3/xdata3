import { DirectClient } from "./index";
import {
    type IAgentRuntime,
    knowledge,
    stringToUuid,
} from "@data3os/agentcontext";
import {
    UserKnowledge,
} from "data3-protocols";
import express from "express";

export class PromptController {
    constructor(private client: DirectClient) {}

    userId: string = null;

    private async readFromCache<T>(runtime: IAgentRuntime, key: string): Promise<T | null> {
        const cached = await runtime.cacheManager.get<T>(key);
        return cached;
    }

    private async writeToCache<T>(runtime: IAgentRuntime, key: string, data: T): Promise<void> {
        try {
            await runtime.cacheManager.set(key,
                data,
                {
                    expires: Date.now() + 60 * 60 * 1000, // a hour
                }
            );
        }
        catch (err) {
            console.log(`writeToCache key ${key}`);
            console.error(err);
        }
    }

    private async getCachedData<T>(runtime: IAgentRuntime, key: string): Promise<T | null> {
        const fileCachedData = await this.readFromCache<T>(runtime, key);
        if (fileCachedData) {
            return fileCachedData;
        }

        return null;
    }

    private async setCachedData<T>(runtime: IAgentRuntime, cacheKey: string, data: T): Promise<void> {
        await this.writeToCache(runtime, cacheKey, data);
    }

    async handlePromptTemplates(req: express.Request, res: express.Response) {
        console.log("handlePromptTemplates");
        console.log(req.query);
        const runtime = this.getAgentId(req, res);
        if (runtime) {
            try {
                const prompts = await PromptController.getPromptTemplates();
                const output: string = prompts.map((line) => ` ${line}`).join('\n\n');
                res.send(output);
            } catch (err) {
                console.error('[PromptController] Error handling template:', err)
                res.send('fail')
            }
        }
    }

    async handleAddKnowledge(req: express.Request, res: express.Response) {
        console.log("handleAddKnowledge");
        console.log(req.query);
        const runtime = this.getAgentId(req, res);
        if (runtime) {
            try {
                const userId = stringToUuid(req.body.userId ?? "user");
                await UserKnowledge.setUserKnowledge(runtime, userId, req.body.knowledges);
                /*for (const item of req.body.knowledges) {
                    await knowledge.set(runtime, {
                        id: stringToUuid(item),
                        userId: userId,
                        content: {
                            text: item,
                        },
                    });
                }*/
                res.send('success');
            } catch (err) {
                console.error('[PromptController] Error handling addknowledge:', err)
                res.send('fail')
            }
        }
    }

    async handleSwitchModelProvider(req: express.Request, res: express.Response) {
        console.log("handleSwitchModelProvider");
        console.log(req.query);
        const runtime = this.getAgentId(req, res);
        if (runtime) {
            try {
                runtime.modelProvider = req.body.model_provider;
                res.send('success');
            } catch (err) {
                console.error('[PromptController] Error handling provider:', err)
                res.send('fail')
            }
        }
    }

    private getAgentId(req: express.Request, res: express.Response) {
        const agentId = req.params.agentId;
        if (agentId) {
            let runtime = this.client.agents.get(agentId);
            try {
                if (!runtime) {
                    runtime = Array.from(this.client.agents.values()).find(
                        (a) =>
                            a.character.name.toLowerCase() ===
                            agentId.toLowerCase()
                    );
                }
            }
            catch (err) {
                console.log(err);
            }
            //console.log(runtime)
            if (runtime) {
                return runtime;
            }
            res.status(404).json({ error: "Agent not found" });
            return;
        }
        res.status(400).json({ error: "Missing agent id" });
    }

    static async getPromptTemplates() {
        const prompts0 = [
            '--  帮忙找一下关于【******】的最火/最热帖子',
            '--  请找一下【小红书】上【一周内】关于【******】的【100条】内容，要求【点赞数】大于【1000】',
            '--  帮我找一下【******】相关的最新帖子，并附带相关评论',
            '--  请整理一下【******】这个帖子的评论',
            '--  整理一下【******】这个账号/达人的详细信息',
            '--  帮忙分析一下【******】这个KOC的评论',
            '--  找一下【******】这个账号/达人的详细信息',
            '--  最近小红书/抖音关于【******】的热词、爆文、热话题有哪些？',
            '--  和我卖同款的其他商家的内容发的是什么样的？',
            '--  有哪些适合【618/双11/中秋...】营销的热门内容？',
            '-- 【618/双11/中秋...】节日前需要准备什么内容',
            '--  关于【夏天/冬天...】穿搭的流行风格有什么？',
            '-- 【女生酒局......】类内容是不是火了？',
            '-- 【中药类......】内容最近互动量高吗？（假定以评论/收藏/点赞都大于10000为准）',
            '--  最近【露营......】类内容还火吗？（假定以评论/收藏/点赞都大于10000为准）',
            '--  有没有冷门但涨势快的话题（假定以发布时间在一周内，以评论/收藏/点赞都大于10000为准）',
            '-- 有哪些和我的产品相关的新热点/热门帖子（以评论/收藏/点赞中一项大于10000为准）',
            '-- 高赞【******】内容的标题都是怎么写的（假定以点赞数大于10000为准）',
            '-- 【******】内容最近互动量高吗？（假定以评论/收藏/点赞都大于10000为准）',
            '-- 基于我的基本信息，搜集适合合作的潜在合作达人',
            '-- 请根据【******】这样的品牌调性搜索适合合作的潜在合作达人',
            '-- 请根据【******】这样的内容风格搜索适合合作的潜在合作达人',
            '-- 【******】这个账号最近一个月都发了什么内容'
        ];
        const prompts = [
            '🔍 查关键词/帖子/评论/账号',
            '① 请找一下关于【小众香薰...】的最火/最热帖子（**默认取100天内的20条帖子，按热度排序）',
            '② 请找一下【一周内/15天内/...】关于【小众香薰...】的【100条】内容，要求【点赞数/评论数】大于【300】，【收藏数/分享数】大于【500】',
            '③ 请找一下【泡泡玛特...】相关的最新帖子，要求【评论数】大于【500】，并附带相关评论',
            '④ 请整理一下这个帖子的评论：... **附帖子链接',
            '⑤ 请整理一下这个账号的【详细信息】：**附主页链接',
            '⑥ 请分析一下这个账号的【帖子类型和风格】：**附主页链接',
            ' 　 ',
            '📌 其它请求',
            '① 有没有冷门但涨势快的话题，其中发布时间在【一周内】，以评论/收藏/点赞都大于1000为准',
            '② 关于最近【男士/女士穿搭...】穿搭的流行风格有什么，请找出【20条】【评论】最高的帖子',
            '③ 有哪些和我的产品相关的新热点/热门帖子？（以评论/收藏/点赞中一项大于1000为准）',
            '④ 请基于我的品牌知识库，搜集适合合作的潜在合作达人',
            ' 　 ',
            '📚将关键词/话题放在【】中，将会获取更精准数据效果！',
            '🚩Ps：请记得在右上角个人主页，完善你的品牌知识库哦😊~'
        ]
        return prompts;
    }
}
