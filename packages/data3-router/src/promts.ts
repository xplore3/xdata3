import { DirectClient } from "./index";
import {
    type IAgentRuntime,
    knowledge,
    stringToUuid,
} from "@data3os/agentcontext";
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
                const output: string = prompts.map((line, i) => `(${i + 1}). ${line}`).join('\n\n');
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
                for (const item of req.body.knowledges) {
                    await knowledge.set(runtime, {
                        id: stringToUuid(item),
                        userId: userId,
                        content: {
                            text: item,
                        },
                    });
                }
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
        const prompts = [
            '1.  最近小红书/抖音关于【******】的热词、爆文、热话题有哪些？',
            '2.  和我卖同款的其他商家的内容发的是什么样的？',
            '3.  有哪些适合【618/双11/中秋...】营销的热门内容？',
            '4. 【618/双11/中秋...】节日前需要准备什么内容',
            '5.  关于【夏天/冬天...】穿搭的流行风格有什么？',
            '6. 【女生酒局......】类内容是不是火了？',
            '7. 【中药类......】内容最近互动量高吗？（假定以评论/收藏/点赞都大于10000为准）',
            '8.  最近【露营......】类内容还火吗？（假定以评论/收藏/点赞都大于10000为准）',
            '9.  有没有冷门但涨势快的话题（假定以发布时间在一周内，以评论/收藏/点赞都大于10000为准）',
            '10. 有哪些和我的产品相关的新热点',
            '11. 高赞内容的标题都是怎么写的（假定以点赞数大于10000为准）',
            '12. 女性保健品内容最近互动量高吗？（假定以评论/收藏/点赞都大于10000为准）',
            '13. 基于我的基本信息，搜集适合合作的潜在合作达人',
            '14. 请根据这样的品牌调性【******】搜索适合合作的潜在合作达人',
            '15. 请根据这样的内容风格【******】搜索适合合作的潜在合作达人',
            '16. 【******】账号最近一个月都发了什么内容',
            '17. 【******】类账号最近一个月都发了什么内容',
            '18. 找到跟我的风格接近但互动率更高的账号',
            '19. 【******】账号是不是专门做某类内容',
            '20. 【******】账号是不是做了系列帖子？效果如何？'
        ];
        return prompts;
    }
}
